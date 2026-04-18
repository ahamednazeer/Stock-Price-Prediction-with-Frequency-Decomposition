from fastapi import APIRouter
from app.api.routes import stocks, ml, auth

api_router = APIRouter()

api_router.include_router(auth.router, tags=["auth", "health"])
api_router.include_router(stocks.router, prefix="/stocks", tags=["stocks"])
api_router.include_router(ml.router, tags=["ml"])
