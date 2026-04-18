import pandas as pd
import datetime

_SP500_CACHE = None
_LAST_FETCH = None

def get_sp500_tickers():
    """Fetch S&P 500 tickers from Wikipedia and cache them globally in memory."""
    global _SP500_CACHE, _LAST_FETCH
    
    # Refresh cache once per day
    if _SP500_CACHE is not None and _LAST_FETCH is not None:
        if (datetime.datetime.now() - _LAST_FETCH).days < 1:
            return _SP500_CACHE

    try:
        url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
        tables = pd.read_html(url)
        df = tables[0]
        
        tickers = []
        for _, row in df.iterrows():
            symbol = str(row['Symbol']).replace('.', '-') # YF uses - instead of . for classes like BRK.B -> BRK-B
            name = str(row['Security'])
            sector = str(row['GICS Sector'])
            tickers.append({
                "symbol": symbol,
                "name": name,
                "sector": sector,
                "color": "#3b82f6" # default blue
            })
            
        _SP500_CACHE = tickers
        _LAST_FETCH = datetime.datetime.now()
        return _SP500_CACHE
        
    except Exception as e:
        print(f"Failed to fetch S&P 500 tickers: {e}")
        return []
