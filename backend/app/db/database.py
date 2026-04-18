import sqlite3
import os
from pathlib import Path

from app.core.config import BACKEND_DIR

# Database path inside the backend folder
DB_PATH = BACKEND_DIR / "stockfreq.db"

def get_db_connection():
    """ Database dependency to inject into FastAPI routes """
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row  # Returns rows as dictionary-like objects
    return conn

def init_db():
    print(f"Initializing SQLite database at {DB_PATH}")
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Example tables you might need later
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_profiles (
            id TEXT PRIMARY KEY,
            email TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS predictions_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            symbol TEXT,
            model_type TEXT,
            prediction_date TEXT,
            FOREIGN KEY(user_id) REFERENCES user_profiles(id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS training_jobs (
            job_id TEXT PRIMARY KEY,
            symbol TEXT NOT NULL,
            model_type TEXT NOT NULL,
            period TEXT NOT NULL,
            epochs INTEGER NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            started_at TEXT,
            finished_at TEXT,
            result_json TEXT,
            error TEXT
        )
    ''')

    cursor.execute('''
        UPDATE training_jobs
        SET status = 'failed',
            finished_at = CURRENT_TIMESTAMP,
            error = COALESCE(error, 'Training interrupted because the backend restarted.')
        WHERE status IN ('queued', 'running')
    ''')
    
    conn.commit()
    conn.close()
    print("✅ SQLite initialized successfully!")
