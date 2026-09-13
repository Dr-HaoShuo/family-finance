from fastapi import FastAPI
from starlette.middleware.sessions import SessionMiddleware
from starlette.staticfiles import StaticFiles

from app.config import FRONTEND_DIR, SESSION_MAX_AGE_DAYS, SESSION_SECRET
from app.database import init_db
from app.routers import auth, records, settings

if not SESSION_SECRET:
    raise RuntimeError("SESSION_SECRET is not set in backend/.env (see backend/.env.example)")

init_db()

app = FastAPI(title="Family Finance")

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    max_age=SESSION_MAX_AGE_DAYS * 24 * 60 * 60,
    same_site="lax",
)

app.include_router(auth.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(records.router)

# Must be mounted last: it's a catch-all for "/", registered after the /api
# routes above so those keep matching first.
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
