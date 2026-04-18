from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supertokens_python.framework.fastapi import get_middleware

from app.core.config import FRONTEND_DOMAIN
from app.core.security import init_supertokens
from app.db.database import init_db
from app.api.router import api_router

# Initialize SuperTokens
init_supertokens()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup - run on startup
    init_db()
    yield
    # Teardown - run on shutdown
    pass

app = FastAPI(title="Stock Prediction API", version="2.0.0", lifespan=lifespan)

# ── SuperTokens Middleware (must be added BEFORE CORS) ────
app.add_middleware(get_middleware())

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_DOMAIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"] + ["Content-Type", "anti-csrf", "rid", "fdi-version", "authorization", "st-auth-mode"],
)

# ── API Routes ──────────────────────────────────────────────
app.include_router(api_router, prefix="/api")
