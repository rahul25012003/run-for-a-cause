"""Authentication request/response schemas."""
import enum
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserRole
from app.schemas.common import ORMBase


class DigestFrequency(str, enum.Enum):
    INSTANT = "instant"
    DAILY = "daily"
    WEEKLY = "weekly"
    NONE = "none"


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    role: UserRole = UserRole.RUNNER

    @field_validator("role")
    @classmethod
    def role_not_super_admin(cls, v: UserRole) -> UserRole:
        if v == UserRole.SUPER_ADMIN:
            raise ValueError("super_admin accounts cannot be self-registered")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    totp_code: str | None = Field(default=None, min_length=6, max_length=6)


class UserPublic(ORMBase):
    id: UUID
    email: EmailStr
    full_name: str
    phone: str | None
    role: UserRole
    avatar_url: str | None
    bio: str | None
    is_active: bool
    is_verified: bool
    digest_frequency: DigestFrequency = DigestFrequency.INSTANT
    whatsapp_opted_in: bool = False


class AuthResponse(BaseModel):
    user: UserPublic
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=72)


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    avatar_url: str | None = None
    bio: str | None = None
    whatsapp_opted_in: bool | None = None


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=8, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)


class DigestUpdate(BaseModel):
    digest_frequency: DigestFrequency


class AccountDeleteRequest(BaseModel):
    """User confirms by typing their email so we can't delete by accident."""
    confirm_email: EmailStr


class DataExport(BaseModel):
    """Schema describing the JSON shape returned by /me/data-export."""
    user: dict
    runner_profiles: list[dict]
    donations: list[dict]
    achievements: list[dict]
    notifications: list[dict]
    exported_at: str
