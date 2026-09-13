from fastapi import APIRouter, HTTPException, Request

from app.auth import verify_password
from app.schemas import LoginRequest

router = APIRouter(tags=["auth"])


@router.post("/login")
def login(payload: LoginRequest, request: Request):
    if not verify_password(payload.password):
        raise HTTPException(status_code=401, detail="密码错误")
    request.session["authenticated"] = True
    return {"authenticated": True}


@router.post("/logout")
def logout(request: Request):
    request.session.clear()
    return {"authenticated": False}


@router.get("/me")
def me(request: Request):
    return {"authenticated": bool(request.session.get("authenticated"))}
