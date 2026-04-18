import json
import threading
import uuid
from datetime import datetime, timezone

from app.db.database import get_db_connection
from app.services.training import train_stock_model


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _serialize_job(row):
    if row is None:
        return None

    result_json = row["result_json"]
    return {
        "job_id": row["job_id"],
        "symbol": row["symbol"],
        "model_type": row["model_type"],
        "period": row["period"],
        "epochs": row["epochs"],
        "status": row["status"],
        "created_at": row["created_at"],
        "started_at": row["started_at"],
        "finished_at": row["finished_at"],
        "result": json.loads(result_json) if result_json else None,
        "error": row["error"],
    }


def get_training_job(job_id: str):
    conn = get_db_connection()
    try:
        row = conn.execute(
            """
            SELECT job_id, symbol, model_type, period, epochs, status, created_at, started_at, finished_at, result_json, error
            FROM training_jobs
            WHERE job_id = ?
            """,
            (job_id,),
        ).fetchone()
        return _serialize_job(row)
    finally:
        conn.close()


def _update_job(job_id: str, **fields):
    if not fields:
        return

    columns = []
    values = []
    for key, value in fields.items():
        columns.append(f"{key} = ?")
        values.append(value)
    values.append(job_id)

    conn = get_db_connection()
    try:
        conn.execute(
            f"UPDATE training_jobs SET {', '.join(columns)} WHERE job_id = ?",
            values,
        )
        conn.commit()
    finally:
        conn.close()


def start_training_job(symbol: str, model_type: str, period: str, epochs: int):
    job_id = str(uuid.uuid4())
    created_at = _now_iso()

    conn = get_db_connection()
    try:
        conn.execute(
            """
            INSERT INTO training_jobs (job_id, symbol, model_type, period, epochs, status, created_at, started_at, finished_at, result_json, error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (job_id, symbol, model_type, period, epochs, "queued", created_at, None, None, None, None),
        )
        conn.commit()
    finally:
        conn.close()

    def _run():
        _update_job(job_id, status="running", started_at=_now_iso())

        try:
            result = train_stock_model(symbol, model_type, period=period, epochs=epochs)
            _update_job(
                job_id,
                status="completed",
                finished_at=_now_iso(),
                result_json=json.dumps(result),
                error=None,
            )
        except Exception as exc:
            _update_job(
                job_id,
                status="failed",
                finished_at=_now_iso(),
                error=str(exc),
            )

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
    return get_training_job(job_id)
