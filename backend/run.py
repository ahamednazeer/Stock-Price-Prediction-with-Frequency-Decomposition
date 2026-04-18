import uvicorn
import os

if __name__ == "__main__":
    print("🚀 Starting FastAPI Backend (Layered Architecture)...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, reload_dirs=[os.path.dirname(os.path.abspath(__file__))])

