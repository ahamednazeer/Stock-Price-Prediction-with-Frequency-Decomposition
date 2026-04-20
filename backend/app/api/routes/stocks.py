from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
import numpy as np
from supertokens_python.recipe.session import SessionContainer
from supertokens_python.recipe.session.framework.fastapi import verify_session

from app.core.config import SYMBOLS
from app.services.market_data import get_cached_data, fetch_stock_data
from app.services.model_utils import symbol_model_path

router = APIRouter()

from app.services.ticker_service import get_sp500_tickers

@router.get("")
def list_stocks(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by symbol or name"),
    featured: bool = Query(False, description="Return only featured/base indices"),
):
    """List available stock symbols with metadata (paginated)."""
    from app.core.config import MODELS_DIR
    
    # If featured=true, only return the base indices
    if featured:
        result = []
        for sym, meta in SYMBOLS.items():
            models_available = []
            for model_type in ["cnn_lstm", "lstm", "random_forest", "svr", "cnn_lstm_emd", "lstm_emd", "cnn_lstm_ceemd", "lstm_ceemd"]:
                model_path = symbol_model_path(MODELS_DIR, model_type, sym)
                if model_path.exists():
                    models_available.append(model_type)
            result.append({
                "symbol": sym,
                "name": meta.get("name", sym.upper()),
                "color": meta.get("color", "#3b82f6"),
                "models_available": models_available,
            })
        return {"items": sorted(result, key=lambda x: x["symbol"]), "total": len(result), "page": 1, "per_page": len(result), "pages": 1}
    
    # Base symbols
    combined_symbols = {sym: meta for sym, meta in SYMBOLS.items()}
    
    # Download S&P 500 dynamically
    sp500 = get_sp500_tickers()
    for item in sp500:
        if item["symbol"] not in combined_symbols:
            combined_symbols[item["symbol"]] = {
                "name": item["name"],
                "color": item["color"],
                "sector": item.get("sector", "Sector")
            }

    result = []
    for sym, meta in combined_symbols.items():
        # Apply search filter
        if search:
            q = search.lower()
            if q not in sym.lower() and q not in meta.get("name", "").lower():
                continue
        
        models_available = []
        for model_type in ["cnn_lstm", "lstm", "random_forest", "svr", "cnn_lstm_emd", "lstm_emd", "cnn_lstm_ceemd", "lstm_ceemd"]:
            model_path = symbol_model_path(MODELS_DIR, model_type, sym)
            if model_path.exists():
                models_available.append(model_type)

        result.append({
            "symbol": sym,
            "name": meta.get("name", sym.upper()),
            "color": meta.get("color", "#3b82f6"),
            "models_available": models_available,
        })
        
    # Sort alphabetically by symbol
    result = sorted(result, key=lambda x: x["symbol"])
    
    # Paginate
    total = len(result)
    pages = max(1, (total + per_page - 1) // per_page)
    start = (page - 1) * per_page
    end = start + per_page
    
    return {"items": result[start:end], "total": total, "page": page, "per_page": per_page, "pages": pages}

@router.get("/{symbol}/summary")
def get_stock_summary(symbol: str):
    """Quick price summary for a symbol (no auth required)."""
    meta = SYMBOLS.get(symbol, {})
    meta_name = meta.get("name", symbol.upper())
    meta_color = meta.get("color", "#3b82f6")

    try:
        df = fetch_stock_data(symbol, "5d")
        if df.empty:
            return {
                "symbol": symbol,
                "name": meta_name,
                "color": meta_color,
                "current_price": 0,
                "change": 0,
                "change_pct": 0,
                "error": "No data available",
            }

        closes = df["Close"].dropna().tolist()
        current = round(float(closes[-1]), 2) if closes else 0
        prev = round(float(closes[-2]), 2) if len(closes) > 1 else current
        change = round(current - prev, 2)
        change_pct = round((change / prev * 100), 2) if prev != 0 else 0

        return {
            "symbol": symbol,
            "name": meta_name,
            "color": meta_color,
            "current_price": current,
            "change": change,
            "change_pct": change_pct,
        }
    except Exception as e:
        return {
            "symbol": symbol,
            "name": meta_name,
            "color": meta_color,
            "current_price": 0,
            "change": 0,
            "change_pct": 0,
            "error": str(e),
        }

@router.get("/{symbol}/data")
def get_stock_data(
    symbol: str,
    period: str = Query("5y", description="Period: 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, max"),
    source: str = Query("live", description="'live' for Yahoo Finance or 'cache' for CSV"),
    session: SessionContainer = Depends(verify_session()),
):
    """Get stock price data — live from Yahoo Finance or from cached CSV."""
    meta_name = SYMBOLS.get(symbol, {}).get("name", symbol.upper())
    meta_color = SYMBOLS.get(symbol, {}).get("color", "#8b5cf6")

    if source == "cache":
        df = get_cached_data(symbol)
        if df.empty:
            raise HTTPException(status_code=404, detail=f"No cached data for {symbol}")
        records = [{"date": str(row.get("Date", "")), "close": float(row.get("close", row.get("Close", 0)))} for _, row in df.iterrows()]
        return {"symbol": symbol, "name": meta_name, "source": "cache", "count": len(records), "data": records}

    # Live data
    df = fetch_stock_data(symbol, period)
    records = []
    for _, row in df.iterrows():
        records.append({
            "date": row["Date"],
            "open": round(float(row.get("Open", 0)), 2),
            "high": round(float(row.get("High", 0)), 2),
            "low": round(float(row.get("Low", 0)), 2),
            "close": round(float(row.get("Close", 0)), 2),
            "volume": int(row.get("Volume", 0)),
        })

    closes = [r["close"] for r in records]
    current = closes[-1] if closes else 0
    prev = closes[-2] if len(closes) > 1 else current
    change = current - prev
    change_pct = (change / prev * 100) if prev != 0 else 0

    return {
        "symbol": symbol,
        "name": meta_name,
        "color": meta_color,
        "source": "live",
        "count": len(records),
        "current_price": current,
        "change": round(change, 2),
        "change_pct": round(change_pct, 2),
        "high_52w": round(max(closes[-252:]) if len(closes) >= 252 else max(closes), 2),
        "low_52w": round(min(closes[-252:]) if len(closes) >= 252 else min(closes), 2),
        "stats": {
            "mean": round(float(np.mean(closes)), 2),
            "std": round(float(np.std(closes)), 2),
            "min": round(float(np.min(closes)), 2),
            "max": round(float(np.max(closes)), 2),
        },
        "data": records,
    }
