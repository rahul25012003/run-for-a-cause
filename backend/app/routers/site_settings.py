"""Site-settings endpoints — public GET, admin PUT."""
from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin
from app.models.site_setting import SettingType, SiteSetting
from app.models.user import User
from app.schemas.common import ORMBase
from app.services.audit_service import log_action

router = APIRouter(prefix="/site-settings", tags=["site-settings"])


class SiteSettingPublic(ORMBase):
    id: UUID
    key: str
    value: str
    value_type: SettingType
    label: str
    group: str
    description: str | None
    is_public: bool
    sort_order: int
    updated_at: datetime


class SiteSettingUpdate(BaseModel):
    value: str = Field(max_length=10000)


@router.get("", response_model=dict[str, str])
async def get_public_settings(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Public endpoint: returns key→value map of all is_public settings."""
    result = await db.execute(
        select(SiteSetting).where(SiteSetting.is_public.is_(True))
    )
    return {s.key: s.value for s in result.scalars().all()}


@router.get("/admin", response_model=list[SiteSettingPublic])
async def list_all_settings(
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[SiteSettingPublic]:
    """Admin: list every setting (including private), grouped + sorted."""
    result = await db.execute(
        select(SiteSetting)
        .order_by(SiteSetting.group.asc(), SiteSetting.sort_order.asc(), SiteSetting.label.asc())
    )
    return [SiteSettingPublic.model_validate(s) for s in result.scalars().all()]


@router.put("/admin/{key}", response_model=SiteSettingPublic)
async def update_setting(
    key: str,
    payload: SiteSettingUpdate,
    request: Request,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SiteSettingPublic:
    """Admin: update one setting's value. Audit logged."""
    result = await db.execute(select(SiteSetting).where(SiteSetting.key == key))
    setting = result.scalar_one_or_none()
    if not setting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Setting not found")

    before = setting.value
    setting.value = payload.value
    setting.updated_by = admin.id

    await log_action(
        db,
        entity_type="site_setting",
        entity_id=setting.id,
        action="site_setting.updated",
        actor=admin,
        before={"value": before},
        after={"value": setting.value},
        metadata={"key": key},
        request=request,
    )
    await db.commit()
    await db.refresh(setting)
    return SiteSettingPublic.model_validate(setting)
