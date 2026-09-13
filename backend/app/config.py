import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

FAMILY_PASSWORD_HASH = os.environ.get("FAMILY_PASSWORD_HASH", "")
SESSION_SECRET = os.environ.get("SESSION_SECRET", "")
SESSION_MAX_AGE_DAYS = int(os.environ.get("SESSION_MAX_AGE_DAYS", "30"))

DATABASE_PATH = BACKEND_DIR / os.environ.get("DATABASE_PATH", "data/family_finance.db")

FRONTEND_DIR = BACKEND_DIR.parent / "frontend"
