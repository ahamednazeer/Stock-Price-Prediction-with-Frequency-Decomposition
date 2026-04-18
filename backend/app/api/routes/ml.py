from fastapi import APIRouter, Body, Depends, HTTPException, Query
from supertokens_python.recipe.session import SessionContainer
from supertokens_python.recipe.session.framework.fastapi import verify_session

from app.core.config import SYMBOLS, MODELS_DIR
from app.services.inference import decompose_stock_data, predict_stock_data
from app.services.training import SUPPORTED_MODEL_TYPES
from app.services.training_jobs import get_training_job, start_training_job

router = APIRouter()

@router.get("/stocks/{symbol}/decompose")
def decompose_stock(
    symbol: str,
    method: str = Query("emd", description="Decomposition method: emd or ceemd"),
    period: str = Query("5y", description="Data period"),
    session: SessionContainer = Depends(verify_session()),
):
    """Apply EMD/CEEMD decomposition to stock closing prices."""
    meta_name = SYMBOLS.get(symbol, {}).get("name", symbol.upper())
    num_imfs, data_points, imf_data = decompose_stock_data(symbol, method, period)

    return {
        "symbol": symbol,
        "name": meta_name,
        "method": method.upper(),
        "num_imfs": num_imfs,
        "data_points": data_points,
        "imfs": imf_data,
    }

@router.get("/stocks/{symbol}/predict")
def predict_stock(
    symbol: str,
    model_type: str = Query("cnn_lstm", description="Model type"),
    period: str = Query("5y", description="Data period"),
    mode: str = Query("backtest", description="Prediction mode: backtest or forecast"),
    horizon: int = Query(5, description="Future business days to forecast"),
    session: SessionContainer = Depends(verify_session()),
):
    """Run inference with pre-trained models."""
    meta_name = SYMBOLS.get(symbol, {}).get("name", symbol.upper())

    prediction_data, metrics, test_size, evaluation_type = predict_stock_data(symbol, model_type, period, mode, horizon)

    return {
        "symbol": symbol,
        "name": meta_name,
        "model_type": model_type,
        "evaluation_type": evaluation_type,
        "metrics": {key: round(value, 4) if isinstance(value, float) else value for key, value in metrics.items()},
        "test_size": test_size,
        "predictions": prediction_data,
    }

@router.post("/stocks/{symbol}/train")
def train_stock(
    symbol: str,
    model_type: str = Body("cnn_lstm"),
    period: str = Body("5y"),
    epochs: int = Body(12),
    session: SessionContainer = Depends(verify_session()),
):
    """Queue symbol-specific model training using live market data."""
    if model_type not in SUPPORTED_MODEL_TYPES:
        raise HTTPException(status_code=400, detail="Training currently supports only 'cnn_lstm' and 'lstm'")

    meta_name = SYMBOLS.get(symbol, {}).get("name", symbol.upper())
    job = start_training_job(symbol, model_type, period, epochs)
    return {"symbol": symbol, "name": meta_name, **job}

@router.get("/training-jobs/{job_id}")
def get_train_job(
    job_id: str,
    session: SessionContainer = Depends(verify_session()),
):
    """Get async training job status."""
    job = get_training_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Training job {job_id} not found")
    return job

@router.get("/models")
def list_models():
    """List all pre-trained model directories and their files."""
    result = []
    if MODELS_DIR.exists():
        for model_dir in sorted(MODELS_DIR.iterdir()):
            if model_dir.is_dir():
                files = list(model_dir.glob("*.pth")) + list(model_dir.glob("*.pkl"))
                result.append({
                    "name": model_dir.name,
                    "display_name": model_dir.name.replace("_", " ").upper(),
                    "num_files": len(files),
                    "files": [f.name for f in files],
                    "total_size_mb": round(sum(f.stat().st_size for f in files) / 1024 / 1024, 1) if files else 0,
                })
    return result
