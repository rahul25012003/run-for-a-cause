"""Cause endpoints."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.cause import Cause
from app.models.organisation import Organisation
from app.models.user import User, UserRole
from app.schemas.cause import CauseCreate, CausePublic, CauseUpdate
from app.services.audit_service import log_action
from app.utils.slugs import make_slug

router = APIRouter(prefix="/causes", tags=["causes"])


@router.get("/", response_model=list[CausePublic])
async def list_causes(
    db: Annotated[AsyncSession, Depends(get_db)],
    organisation_id: UUID | None = None,
) -> list[CausePublic]:
    stmt = select(Cause).where(Cause.is_active.is_(True))
    if organisation_id:
        stmt = stmt.where(Cause.organisation_id == organisation_id)
    stmt = stmt.order_by(Cause.created_at.desc())
    result = await db.execute(stmt)
    return [CausePublic.model_validate(c) for c in result.scalars().all()]


@router.get("/{slug}", response_model=CausePublic)
async def get_cause(
    slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CausePublic:
    result = await db.execute(select(Cause).where(Cause.slug == slug))
    cause = result.scalar_one_or_none()
    if not cause:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return CausePublic.model_validate(cause)


@router.post(
    "/",
    response_model=CausePublic,
    status_code=status.HTTP_201_CREATED,
)
async def create_cause(
    payload: CauseCreate,
    request: Request,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CausePublic:
    """Create a cause under the calling user's organisation."""
    if user.role not in (UserRole.SUPER_ADMIN, UserRole.EVENT_MANAGER):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only event managers can create causes",
        )
    org_result = await db.execute(
        select(Organisation).where(Organisation.user_id == user.id)
    )
    org = org_result.scalar_one_or_none()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must create an organisation first",
        )

    cause = Cause(
        organisation_id=org.id,
        title=payload.title,
        slug=make_slug(payload.title),
        summary=payload.summary,
        story=payload.story,
        cover_image_url=payload.cover_image_url,
        awareness_blocks=[b.model_dump() for b in payload.awareness_blocks],
    )
    db.add(cause)
    await db.flush()
    await log_action(
        db,
        entity_type="cause",
        entity_id=cause.id,
        action="cause.created",
        actor=user,
        request=request,
    )
    await db.commit()
    await db.refresh(cause)
    return CausePublic.model_validate(cause)


@router.put("/{cause_id}", response_model=CausePublic)
async def update_cause(
    cause_id: UUID,
    payload: CauseUpdate,
    request: Request,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CausePublic:
    result = await db.execute(select(Cause).where(Cause.id == cause_id))
    cause = result.scalar_one_or_none()
    if not cause:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    org_result = await db.execute(
        select(Organisation).where(Organisation.id == cause.organisation_id)
    )
    org = org_result.scalar_one()
    if user.role != UserRole.SUPER_ADMIN and org.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    for field, value in payload.model_dump(exclude_unset=True).items():
        # awareness_blocks: convert list of Pydantic models → list of dicts so
        # SQLAlchemy can persist as JSONB
        if field == "awareness_blocks" and value is not None:
            value = [b if isinstance(b, dict) else b.model_dump() for b in value]
        setattr(cause, field, value)

    await log_action(
        db,
        entity_type="cause",
        entity_id=cause.id,
        action="cause.updated",
        actor=user,
        request=request,
    )
    await db.commit()
    await db.refresh(cause)
    return CausePublic.model_validate(cause)
