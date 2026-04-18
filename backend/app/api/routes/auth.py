from fastapi import APIRouter, Depends
import datetime
from supertokens_python.recipe.session import SessionContainer
from supertokens_python.recipe.session.framework.fastapi import verify_session
from app.db.database import get_db_connection

router = APIRouter()

@router.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.datetime.now().isoformat()}

@router.get("/db/health")
def db_health_check():
    """ Check if SQLite is connected and readable by grabbing table names """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in cursor.fetchall()]
        conn.close()
        return {"status": "connected", "database": "sqlite", "tables": tables}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@router.get("/session/info")
async def session_info(session: SessionContainer = Depends(verify_session())):
    """Get current authenticated user session information."""
    return {
        "user_id": session.get_user_id(),
        "session_handle": session.get_handle(),
        "access_token_payload": session.get_access_token_payload(),
    }
