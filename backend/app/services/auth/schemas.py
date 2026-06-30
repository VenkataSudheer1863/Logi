from pydantic import BaseModel, EmailStr
from typing import Optional


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    role: str
    name: str


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role_id: int
    warehouse_id: Optional[int] = None


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role_id: int
    warehouse_id: Optional[int]
    status: str

    class Config:
        from_attributes = True
