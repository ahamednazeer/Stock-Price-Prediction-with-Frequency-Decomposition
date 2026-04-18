import numpy as np
import pandas as pd


FEATURE_COLUMNS = [
    "Close",
    "Open",
    "High",
    "Low",
    "Volume",
    "return_1",
    "return_5",
    "range_pct",
    "sma_10",
    "sma_20",
    "ema_12",
    "ema_26",
    "macd",
    "macd_signal",
    "rsi_14",
    "volume_change",
]


def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    enriched = df.copy()
    close = enriched["Close"].astype(float)
    volume = enriched["Volume"].astype(float)

    enriched["return_1"] = close.pct_change()
    enriched["return_5"] = close.pct_change(5)
    enriched["range_pct"] = ((enriched["High"] - enriched["Low"]) / close.replace(0, np.nan)).replace([np.inf, -np.inf], np.nan)
    enriched["sma_10"] = close.rolling(10).mean()
    enriched["sma_20"] = close.rolling(20).mean()
    enriched["ema_12"] = close.ewm(span=12, adjust=False).mean()
    enriched["ema_26"] = close.ewm(span=26, adjust=False).mean()
    enriched["macd"] = enriched["ema_12"] - enriched["ema_26"]
    enriched["macd_signal"] = enriched["macd"].ewm(span=9, adjust=False).mean()

    delta = close.diff()
    gains = delta.clip(lower=0).rolling(14).mean()
    losses = (-delta.clip(upper=0)).rolling(14).mean()
    rs = gains / losses.replace(0, np.nan)
    enriched["rsi_14"] = 100 - (100 / (1 + rs))
    enriched["volume_change"] = volume.pct_change().replace([np.inf, -np.inf], np.nan)

    enriched = enriched.replace([np.inf, -np.inf], np.nan).dropna().reset_index(drop=True)
    enriched["Date"] = enriched["Date"].astype(str)
    return enriched


def build_feature_sequences(df: pd.DataFrame, feature_columns: list[str], target_column: str, window_size: int):
    values = df[feature_columns].astype(float).values
    target_idx = feature_columns.index(target_column)
    X, y = [], []
    for i in range(len(values) - window_size):
        X.append(values[i:i + window_size])
        y.append(values[i + window_size, target_idx])
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)


def inverse_target_scale(values: np.ndarray, scaler_min: float, scaler_scale: float) -> np.ndarray:
    return (values - scaler_min) / scaler_scale


def next_business_dates(last_date: str, horizon: int) -> list[str]:
    future_dates = pd.bdate_range(pd.to_datetime(last_date) + pd.offsets.BDay(1), periods=horizon)
    return [date.strftime("%Y-%m-%d") for date in future_dates]
