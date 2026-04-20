import pandas as pd
import datetime
import urllib.request
import io
import logging
import warnings

logger = logging.getLogger(__name__)

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
        # Wikipedia blocks default urllib User-Agent; use a browser-like header
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                          'AppleWebKit/537.36 (KHTML, like Gecko) '
                          'Chrome/120.0.0.0 Safari/537.36'
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode('utf-8')
        
        # Wrap in StringIO and suppress warnings for cross-platform consistency
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            tables = pd.read_html(io.StringIO(html))
        
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
        logger.info(f"Fetched {len(tickers)} S&P 500 tickers successfully")
        return _SP500_CACHE
        
    except Exception as e:
        logger.error(f"Failed to fetch S&P 500 tickers: {e}")
        return []
