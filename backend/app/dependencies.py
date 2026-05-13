"""FastAPI dependency-injection helpers (auth, db, role guards)."""
from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserRole
from app.utils.security import safe_decode_token


async def _resolve_user_from_token(
    token: str | None,
    db: AsyncSession,
) -> User | None:
    if not token:
        return None
    payload = safe_decode_token(token)
    if not payload or payload.get("type") != "access":
        return None
    user_id_raw = payload.get("sub")
    if not user_id_raw:
        return None
    try:
        user_id = UUID(user_id_raw)
    except ValueError:
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        return None
    return user


async def get_current_user(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    access_token: Annotated[str | None, Cookie()] = None,
) -> User:
    """Resolve the authenticated user (cookie first, Authorization header fallback)."""
    token = access_token
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    user = await _resolve_user_from_token(token, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_current_user_optional(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    access_token: Annotated[str | None, Cookie()] = None,
) -> User | None:
    """Resolve the authenticated user but return None if not signed in."""
    token = access_token
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    return await _resolve_user_from_token(token, db)


def require_role(*roles: UserRole) -> Callable[[User], User]:
    """Dependency factory: require the current user to hold one of the given roles."""

    async def checker(
        user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient privileges for this operation",
            )
        return user

    return checker


require_admin = require_role(UserRole.SUPER_ADMIN)
require_manager = require_role(UserRole.SUPER_ADMIN, UserRole.EVENT_MANAGER)
require_runner = require_role(
    UserRole.SUPER_ADMIN, UserRole.EVENT_MANAGER, UserRole.RUNNER
)
