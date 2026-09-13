from fastapi import HTTPException, Request
from passlib.context import CryptContext

from app.config import FAMILY_PASSWORD_HASH

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(password: str) -> bool:
    if not FAMILY_PASSWORD_HASH:
        raise HTTPException(
            status_code=500,
            detail="FAMILY_PASSWORD_HASH is not set on the server (see backend/.env.example)",
        )
    return pwd_context.verify(password, FAMILY_PASSWORD_HASH)


def require_auth(request: Request) -> None:
    if not request.session.get("authenticated"):
        raise HTTPException(status_code=401, detail="未登录")
