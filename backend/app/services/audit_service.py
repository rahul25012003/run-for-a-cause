"""Audit log service — append-only writes for every state change."""
from typing import Any
from uuid import UUID

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.user import User


def _ip_from_request(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


async def log_action(
    db: AsyncSession,
    *,
    entity_type: str,
    entity_id: UUID,
    action: str,
    actor: User | None = None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    metadata: dict[str, Any] | None = None,
    reason: str | None = None,
    request: Request | None = None,
) -> AuditLog:
    """Write a single audit record. Caller must commit the session."""
    entry = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_id=actor.id if actor else None,
        actor_role=actor.role.value if actor else None,
        before_json=before,
        after_json=after,
        metadata_json=metadata,
        reason=reason,
        ip_address=_ip_from_request(request),
        user_agent=request.headers.get("user-agent") if request else None,
    )
    db.add(entry)
    await db.flush()
    return entry
