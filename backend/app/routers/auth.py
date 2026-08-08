from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.schemas.users import UserCreate, UserLogin, TokenResponse, UserResponse
from app.services import user_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await user_service.get_user_by_email(db, data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = await user_service.create_user(db, data.email, data.password, data.full_name, data.role)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await user_service.get_user_by_email(db, data.email)
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {"access_token": token, "token_type": "bearer"}
