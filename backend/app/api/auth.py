from fastapi import APIRouter, HTTPException, status

from app.api.deps import current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.models.schemas import Token, UserCreate
from app.services.storage import USERS

router = APIRouter(prefix="/auth", tags=["auth"])


def _normalize_email(email: str) -> str:
    return email.strip().lower()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate) -> Token:
    email = _normalize_email(payload.email)
    if email in USERS:
        raise HTTPException(status_code=409, detail="User already exists")
    USERS[email] = hash_password(payload.password)
    return Token(access_token=create_access_token(email))


@router.post("/login", response_model=Token)
def login(payload: UserCreate) -> Token:
    email = _normalize_email(payload.email)
    hashed = USERS.get(email)
    if not hashed or not verify_password(payload.password, hashed):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return Token(access_token=create_access_token(email))


@router.get("/me")
def me(user: str = current_user) -> dict[str, str]:
    return {"email": user}
