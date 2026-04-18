import yfinance as yf
import pandas as pd
from fastapi import HTTPException
from app.core.config import DATASETS_DIR

def fetch_stock_data(symbol: str, period: str = "5y") -> pd.DataFrame:
    """Fetch live stock data from Yahoo Finance."""
    try:
        ticker = yf.Ticker(symbol)
        df = ticker.history(period=period)
        if df.empty:
            raise ValueError(f"No data returned for {symbol}")
        df = df.reset_index()
        df["Date"] = df["Date"].dt.strftime("%Y-%m-%d")
        return df
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch data for {symbol}: {str(e)}")

def get_cached_data(symbol: str) -> pd.DataFrame:
    """Load data from CSV cache (datasets folder)."""
    csv_path = DATASETS_DIR / f"{symbol}.csv"
    if csv_path.exists():
        df = pd.read_csv(csv_path)
        return df
    return fetch_stock_data(symbol)

def save_stock_data(symbol: str, df: pd.DataFrame) -> None:
    """Persist normalized stock data for later reuse."""
    csv_path = DATASETS_DIR / f"{symbol}.csv"
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(csv_path, index=False)
