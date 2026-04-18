import numpy as np
import torch
import torch.nn as nn
from fastapi import HTTPException
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.preprocessing import MinMaxScaler
from torch.utils.data import DataLoader, TensorDataset

from app.core.config import MODELS_DIR
from app.services.features import FEATURE_COLUMNS, add_technical_indicators, build_feature_sequences, inverse_target_scale
from app.services.market_data import fetch_stock_data, save_stock_data
from app.services.model_utils import SUPPORTED_MODEL_TYPES, create_model, is_deep_model, model_filename, save_checkpoint, symbol_model_path


TARGET_COLUMN = "Close"


def _make_loader(X: np.ndarray, y: np.ndarray, batch_size: int, shuffle: bool):
    features = torch.tensor(X, dtype=torch.float32)
    targets = torch.tensor(y, dtype=torch.float32).unsqueeze(-1)
    return DataLoader(TensorDataset(features, targets), batch_size=batch_size, shuffle=shuffle)


def _directional_accuracy(actual: np.ndarray, predicted: np.ndarray) -> float:
    if len(actual) < 2:
        return 0.0
    actual_dir = np.sign(np.diff(actual))
    predicted_dir = np.sign(np.diff(predicted))
    return float(np.mean(actual_dir == predicted_dir) * 100)


def train_stock_model(
    symbol: str,
    model_type: str,
    period: str = "5y",
    epochs: int = 60,
    window_size: int = 90,
):
    if model_type not in SUPPORTED_MODEL_TYPES:
        raise HTTPException(status_code=400, detail="Training currently supports only 'cnn_lstm' and 'lstm'")

    raw_df = fetch_stock_data(symbol, period)
    feature_df = add_technical_indicators(raw_df)
    if feature_df.empty:
        raise HTTPException(status_code=404, detail=f"No market data found for {symbol}")

    if len(feature_df) <= window_size + 60:
        raise HTTPException(status_code=400, detail="Not enough enriched live data to train this model")

    scaler = MinMaxScaler()
    feature_values = feature_df[FEATURE_COLUMNS].astype(float).values
    train_cutoff = int(len(feature_values) * 0.8)
    scaler.fit(feature_values[:train_cutoff])
    scaled_values = scaler.transform(feature_values)
    scaled_df = feature_df.copy()
    scaled_df[FEATURE_COLUMNS] = scaled_values

    X, y = build_feature_sequences(scaled_df, FEATURE_COLUMNS, TARGET_COLUMN, window_size)
    if len(X) < 80:
        raise HTTPException(status_code=400, detail="Not enough sequences generated for training")

    test_size = min(60, max(len(X) // 5, 20))
    X_test, y_test = X[-test_size:], y[-test_size:]
    X_train_val, y_train_val = X[:-test_size], y[:-test_size]
    val_size = max(int(len(X_train_val) * 0.2), 1)
    X_train, y_train = X_train_val[:-val_size], y_train_val[:-val_size]
    X_val, y_val = X_train_val[-val_size:], y_train_val[-val_size:]

    device = torch.device("cpu")
    model_path = symbol_model_path(MODELS_DIR, model_type, symbol)
    model = create_model(model_type, device if is_deep_model(model_type) else None, input_size=len(FEATURE_COLUMNS))

    if is_deep_model(model_type):
        train_loader = _make_loader(X_train, y_train, batch_size=64, shuffle=True)
        val_loader = _make_loader(X_val, y_val, batch_size=64, shuffle=False)
        test_loader = _make_loader(X_test, y_test, batch_size=64, shuffle=False)

        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=5e-4, weight_decay=1e-5)

        best_state = None
        best_val_loss = float("inf")
        patience = 10
        patience_left = patience

        for _ in range(epochs):
            model.train()
            for features, target in train_loader:
                features, target = features.to(device), target.to(device)
                optimizer.zero_grad()
                loss = criterion(model(features), target)
                loss.backward()
                optimizer.step()

            model.eval()
            val_losses = []
            with torch.no_grad():
                for features, target in val_loader:
                    features, target = features.to(device), target.to(device)
                    val_losses.append(criterion(model(features), target).item())
            mean_val_loss = float(np.mean(val_losses))

            if mean_val_loss < best_val_loss:
                best_val_loss = mean_val_loss
                best_state = {key: value.cpu().clone() for key, value in model.state_dict().items()}
                patience_left = patience
            else:
                patience_left -= 1
                if patience_left <= 0:
                    break

        if best_state is None:
            raise HTTPException(status_code=500, detail="Training failed to produce a valid model state")

        model.load_state_dict(best_state)
        model.eval()

        preds_scaled = []
        actual_scaled = []
        with torch.no_grad():
            for features, target in test_loader:
                features = features.to(device)
                preds_scaled.append(model(features).cpu().numpy())
                actual_scaled.append(target.numpy())

        preds_scaled = np.concatenate(preds_scaled).reshape(-1)
        actual_scaled = np.concatenate(actual_scaled).reshape(-1)
        model_payload = {"model_state_dict": model.state_dict(), "input_size": len(FEATURE_COLUMNS)}
    else:
        X_train_flat = X_train.reshape(len(X_train), -1)
        X_test_flat = X_test.reshape(len(X_test), -1)
        model.fit(X_train_flat, y_train)
        preds_scaled = model.predict(X_test_flat).reshape(-1)
        actual_scaled = y_test.reshape(-1)
        model_payload = {"model": model}

    target_idx = FEATURE_COLUMNS.index(TARGET_COLUMN)
    preds = inverse_target_scale(preds_scaled, float(scaler.min_[target_idx]), float(scaler.scale_[target_idx]))
    actuals = inverse_target_scale(actual_scaled, float(scaler.min_[target_idx]), float(scaler.scale_[target_idx]))

    if len(actuals) > 1:
        baseline_preds = feature_df[TARGET_COLUMN].astype(float).values[window_size - 1:-1][-len(actuals):]
        baseline_rmse = float(np.sqrt(np.mean((actuals - baseline_preds) ** 2)))
    else:
        baseline_rmse = 0.0
    model_rmse = float(np.sqrt(mean_squared_error(actuals, preds)))

    checkpoint = {
        **model_payload,
        "model_kind": "deep" if is_deep_model(model_type) else "sklearn",
        "input_size": len(FEATURE_COLUMNS),
        "feature_columns": FEATURE_COLUMNS,
        "target_column": TARGET_COLUMN,
        "window_size": window_size,
        "epochs": epochs,
        "period": period,
        "scaler_min": scaler.min_.tolist(),
        "scaler_scale": scaler.scale_.tolist(),
        "test_size": int(test_size),
        "residual_std": float(np.std(preds - actuals)),
    }
    save_checkpoint(model_path, checkpoint, model_type)

    save_stock_data(symbol, feature_df)

    return {
        "symbol": symbol,
        "model_type": model_type,
        "model_file": model_filename(symbol, model_type),
        "saved_path": str(model_path),
        "period": period,
        "epochs": epochs,
        "window_size": window_size,
        "feature_columns": FEATURE_COLUMNS,
        "train_points": int(len(X_train)),
        "validation_points": int(len(X_val)),
        "test_points": int(len(X_test)),
        "metrics": {
            "rmse": round(model_rmse, 4),
            "mae": round(float(mean_absolute_error(actuals, preds)), 4),
            "mape": round(float(np.mean(np.abs((actuals - preds) / actuals)) * 100), 4),
            "r2": round(float(r2_score(actuals, preds)), 4),
            "directional_accuracy": round(_directional_accuracy(actuals, preds), 2),
            "bias": round(float(np.mean(preds - actuals)), 4),
            "baseline_rmse": round(baseline_rmse, 4),
        },
    }
