import os
from pathlib import Path
from dotenv import load_dotenv

# Load `.env` from backend root
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

# Paths
# PROJECT_ROOT is the root of the repository. config.py is at backend/app/core/
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
MODELS_DIR = PROJECT_ROOT / "models"
DATASETS_DIR = PROJECT_ROOT / "datasets"
BACKEND_DIR = PROJECT_ROOT / "backend"

# Environment / App Config
FRONTEND_DOMAIN = os.environ.get("FRONTEND_DOMAIN", "http://localhost:3000")
API_DOMAIN = os.environ.get("API_DOMAIN", "http://localhost:8000")

# SuperTokens Config
SUPERTOKENS_CONNECTION_URI = os.environ.get("SUPERTOKENS_CONNECTION_URI", "https://try.supertokens.io")
SUPERTOKENS_API_KEY = os.environ.get("SUPERTOKENS_API_KEY", None)

# Stock Symbols Config
SYMBOLS = {
    "^GSPC": {"name": "S&P 500", "color": "#3b82f6"},
    "^DJI": {"name": "Dow Jones", "color": "#22c55e"},
    "^GDAXI": {"name": "DAX", "color": "#a855f7"},
    "^N225": {"name": "Nikkei 225", "color": "#f59e0b"},
}
