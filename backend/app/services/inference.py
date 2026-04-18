import numpy as np
import pandas as pd
import torch
from fastapi import HTTPException
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from app.core.config import MODELS_DIR
from app.services.features import add_technical_indicators, build_feature_sequences, inverse_target_scale, next_business_dates
from app.services.market_data import fetch_stock_data
from app.services.model_utils import is_deep_model, load_model, symbol_model_path


def _directional_accuracy(actual: np.ndarray, predicted: np.ndarray) -> float:
    if len(actual) < 2:
        return 0.0
    return float(np.mean(np.sign(np.diff(actual)) == np.sign(np.diff(predicted))) * 100)


def _mc_dropout_predict(model, X_tensor: torch.Tensor, samples: int = 40) -> np.ndarray:
    model.train()
    draws = []
    with torch.no_grad():
        for _ in range(samples):
            draws.append(model(X_tensor).squeeze().cpu().numpy())
    model.eval()
    return np.array(draws, dtype=np.float32)


def _predict_with_model(model_type: str, model, X_input, checkpoint):
    if is_deep_model(model_type):
        X_tensor = torch.tensor(X_input, dtype=torch.float32)
        mc_samples = _mc_dropout_predict(model, X_tensor, samples=40 if len(X_input) == 1 else 30)
        median = np.median(mc_samples, axis=0)
        lower = np.percentile(mc_samples, 10, axis=0)
        upper = np.percentile(mc_samples, 90, axis=0)
        return median.reshape(-1), lower.reshape(-1), upper.reshape(-1)

    flat = X_input.reshape(len(X_input), -1)
    preds = model.predict(flat).reshape(-1)
    residual_std = float(checkpoint.get("residual_std", 0.0))
    lower = preds - residual_std
    upper = preds + residual_std
    return preds, lower, upper


def _forecast_future_points(raw_df, model_type: str, model, checkpoint, scaler_min: np.ndarray, scaler_scale: np.ndarray, horizon: int):
    feature_columns = checkpoint["feature_columns"]
    target_column = checkpoint["target_column"]
    window_size = int(checkpoint["window_size"])
    target_idx = feature_columns.index(target_column)

    working_raw = raw_df.copy()
    future_dates = next_business_dates(str(working_raw["Date"].astype(str).iloc[-1]), horizon)
    predicted_points = []

    for future_date in future_dates:
        enriched = add_technical_indicators(working_raw)
        if len(enriched) < window_size:
            raise HTTPException(status_code=400, detail="Not enough enriched data to generate future forecast")

        feature_values = enriched[feature_columns].astype(float).values
        scaled_values = feature_values * scaler_scale + scaler_min
        window = scaled_values[-window_size:]
        pred_arr, lower_arr, upper_arr = _predict_with_model(model_type, model, window[np.newaxis, :, :], checkpoint)
        pred_scaled = float(pred_arr[0])
        lower_scaled = float(lower_arr[0])
        upper_scaled = float(upper_arr[0])

        pred_close = float(inverse_target_scale(np.array([pred_scaled]), float(scaler_min[target_idx]), float(scaler_scale[target_idx]))[0])
        lower_close = float(inverse_target_scale(np.array([lower_scaled]), float(scaler_min[target_idx]), float(scaler_scale[target_idx]))[0])
        upper_close = float(inverse_target_scale(np.array([upper_scaled]), float(scaler_min[target_idx]), float(scaler_scale[target_idx]))[0])
        prev_close = float(working_raw["Close"].astype(float).iloc[-1])
        last_volume = float(working_raw["Volume"].astype(float).iloc[-1])

        working_raw = pd.concat(
            [
                working_raw,
                pd.DataFrame(
                    [
                        {
                            "Date": future_date,
                            "Open": prev_close,
                            "High": max(prev_close, pred_close),
                            "Low": min(prev_close, pred_close),
                            "Close": pred_close,
                            "Volume": last_volume,
                        }
                    ]
                ),
            ],
            ignore_index=True,
        )

        predicted_points.append(
            {
                "date": future_date,
                "actual": None,
                "predicted": round(pred_close, 2),
                "lower": round(min(lower_close, upper_close), 2),
                "upper": round(max(lower_close, upper_close), 2),
                "baseline": round(prev_close, 2),
            }
        )

    return predicted_points


def decompose_stock_data(symbol: str, method: str, period: str):
    """Apply EMD/CEEMD decomposition to stock closing prices."""
    try:
        from PyEMD.EMD import EMD
        from PyEMD.CEEMDAN import CEEMDAN
    except ImportError:
        raise HTTPException(status_code=500, detail="PyEMD not available")

    df = fetch_stock_data(symbol, period)
    closes = df["Close"].values.astype(float)

    if method == "emd":
        decomposer = EMD()
    elif method == "ceemd":
        decomposer = CEEMDAN()
    else:
        raise HTTPException(status_code=400, detail="Method must be 'emd' or 'ceemd'")

    try:
        imfs = decomposer(closes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decomposition failed: {str(e)}")

    dates = df["Date"].tolist()
    imf_data = []
    for i, imf in enumerate(imfs):
        imf_records = [{"date": dates[j], "value": round(float(val), 4)} for j, val in enumerate(imf)]
        imf_data.append({
            "name": f"IMF {i + 1}" if i < len(imfs) - 1 else "Residual",
            "index": i,
            "data": imf_records,
        })

    return len(imfs), len(closes), imf_data


def predict_stock_data(symbol: str, model_type: str, period: str = "5y", mode: str = "backtest", horizon: int = 5):
    """Run inference as a holdout backtest or simple recursive future forecast."""
    raw_df = fetch_stock_data(symbol, period)
    feature_df = add_technical_indicators(raw_df)
    if feature_df.empty:
        raise HTTPException(status_code=404, detail=f"No market data found for {symbol}")

    if model_type in ["cnn_lstm_emd", "lstm_emd", "cnn_lstm_ceemd", "lstm_ceemd"]:
        raise HTTPException(
            status_code=400,
            detail="On-demand prediction currently supports only symbol-trained 'cnn_lstm' and 'lstm' models.",
        )

    device = torch.device("cpu")
    model_path = symbol_model_path(MODELS_DIR, model_type, symbol)
    if not model_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"No saved model found for {symbol} using {model_type}. Train this ticker first.",
        )

    try:
        model, checkpoint = load_model(model_type, model_path, device)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    feature_columns = checkpoint["feature_columns"]
    target_column = checkpoint["target_column"]
    window_size = int(checkpoint["window_size"])
    test_size = int(checkpoint.get("test_size", 60))
    if len(feature_df) <= window_size + test_size:
        raise HTTPException(status_code=400, detail="Not enough enriched data for prediction")

    scaler_min = np.array(checkpoint["scaler_min"], dtype=np.float32)
    scaler_scale = np.array(checkpoint["scaler_scale"], dtype=np.float32)

    if mode == "forecast":
        forecast_points = _forecast_future_points(raw_df, model_type, model, checkpoint, scaler_min, scaler_scale, horizon)
        _, backtest_metrics, _, _ = predict_stock_data(symbol, model_type, period, mode="backtest", horizon=horizon)
        return forecast_points, {
            **backtest_metrics,
            "forecast_horizon": horizon,
        }, len(forecast_points), "future_forecast"

    values = feature_df[feature_columns].astype(float).values
    scaled_values = values * scaler_scale + scaler_min
    scaled_df = feature_df.copy()
    scaled_df[feature_columns] = scaled_values

    X, y = build_feature_sequences(scaled_df, feature_columns, target_column, window_size)
    X_test, y_test = X[-test_size:], y[-test_size:]
    pred_scaled, lower_scaled, upper_scaled = _predict_with_model(model_type, model, X_test, checkpoint)

    target_idx = feature_columns.index(target_column)
    actuals = inverse_target_scale(y_test.reshape(-1), float(scaler_min[target_idx]), float(scaler_scale[target_idx]))
    preds = inverse_target_scale(pred_scaled.reshape(-1), float(scaler_min[target_idx]), float(scaler_scale[target_idx]))
    lowers = inverse_target_scale(lower_scaled.reshape(-1), float(scaler_min[target_idx]), float(scaler_scale[target_idx]))
    uppers = inverse_target_scale(upper_scaled.reshape(-1), float(scaler_min[target_idx]), float(scaler_scale[target_idx]))

    if len(actuals) > 1:
        baseline_preds = feature_df[target_column].astype(float).values[-(len(actuals) + 1):-1]
        baseline_actuals = actuals
        baseline_rmse = float(np.sqrt(np.mean((baseline_actuals - baseline_preds) ** 2)))
    else:
        baseline_preds = actuals
        baseline_rmse = 0.0

    rmse = float(np.sqrt(np.mean((actuals - preds) ** 2)))
    mae = float(mean_absolute_error(actuals, preds))
    mape = float(np.mean(np.abs((actuals - preds) / actuals)) * 100)
    r2 = float(r2_score(actuals, preds))
    directional_accuracy = _directional_accuracy(actuals, preds)
    bias = float(np.mean(preds - actuals))

    test_dates = feature_df["Date"].astype(str).tolist()[-len(actuals):]
    prediction_data = [
        {
            "date": str(test_dates[i]),
            "actual": round(float(actuals[i]), 2),
            "predicted": round(float(preds[i]), 2),
            "lower": round(float(min(lowers[i], uppers[i])), 2),
            "upper": round(float(max(lowers[i], uppers[i])), 2),
            "baseline": round(float(baseline_preds[i]), 2),
        }
        for i in range(len(actuals))
    ]

    return prediction_data, {
        "rmse": rmse,
        "mae": mae,
        "mape": mape,
        "r2": r2,
        "directional_accuracy": directional_accuracy,
        "bias": bias,
        "baseline_rmse": baseline_rmse,
        "beats_baseline": rmse < baseline_rmse if baseline_rmse > 0 else False,
    }, len(actuals), "holdout_backtest"
