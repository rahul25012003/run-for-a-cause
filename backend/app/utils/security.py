"""Security utilities: password hashing and JWT tokens."""
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import bcrypt
from jose import JWTError, jwt

from app.config import settings


def hash_password(plain: str) -> str:
    """Return a bcrypt hash for the given plaintext password.

    bcrypt has a 72-byte limit; longer passwords are truncated explicitly
    so we never hit the upstream "password cannot be longer than 72 bytes"
    error.
    """
    pw_bytes = plain.encode("utf-8")[:72]
    hashed = bcrypt.hashpw(pw_bytes, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a stored bcrypt hash."""
    pw_bytes = plain.encode("utf-8")[:72]
    try:
        return bcrypt.checkpw(pw_bytes, hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(
    subject: str | UUID,
    role: str,
    expires_delta: timedelta | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """Issue a signed JWT for the given subject and role."""
    expire = datetime.now(UTC) + (
        expires_delta
        or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "exp": expire,
        "iat": datetime.now(UTC),
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Decode a JWT and return its payload, or raise JWTError."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def safe_decode_token(token: str) -> dict[str, Any] | None:
    """Decode a JWT, returning None if invalid (no raise)."""
    try:
        return decode_token(token)
    except JWTError:
        return None
