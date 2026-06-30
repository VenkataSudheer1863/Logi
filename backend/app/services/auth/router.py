from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.common.database import get_db
from app.common.models import User, Role
from app.services.auth.service import authenticate_user, create_access_token, hash_password
from app.services.auth.schemas import TokenResponse, UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@router.post("/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id)})
    role_result = await db.execute(select(Role).where(Role.id == user.role_id))
    role = role_result.scalar_one_or_none()
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        role=role.role_name if role else "worker",
        name=user.name,
    )


@router.post("/register", response_model=UserOut)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role_id=payload.role_id,
        warehouse_id=payload.warehouse_id,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.get("/me", response_model=UserOut)
async def get_me(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    from app.services.auth.service import get_current_user
    user = await get_current_user(db, token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user
