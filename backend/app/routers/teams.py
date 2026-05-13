"""Event teams — runners can group themselves under a team within an event.

Manager creates teams. Runners join by setting `team_id` on their existing
EventRunner row. Team totals (raised / distance / member_count) are
recomputed by `recompute_team_stats` after donations capture or distance
approval — but for the MVP we recompute on-demand when the leaderboard
endpoint is hit, since teams are small (≤ 50 per event in practice).
"""
from datetime import datetime
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_manager
from app.models.event import Event
from app.models.event_runner import EventRunner
from app.models.event_team import EventTeam
from app.models.user import User, UserRole
from app.schemas.common import ORMBase
from app.services.audit_service import log_action
from app.utils.slugs import make_slug

router = APIRouter(tags=["teams"])


class TeamIn(BaseModel):
    name: str = Field(min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    logo_url: str | None = None
    captain_id: UUID | None = None


class TeamPublic(ORMBase):
    id: UUID
    event_id: UUID
    name: str
    slug: str
    description: str | None
    logo_url: str | None
    captain_id: UUID | None
    total_raised: Decimal
    total_distance_km: Decimal
    member_count: int
    created_at: datetime


async def _ensure_manager_owns_event(
    event_id: UUID, user: User, db: AsyncSession
) -> Event:
    res = await db.execute(
        select(Event)
        .where(Event.id == event_id)
        .options(selectinload(Event.organisation))
    )
    event = res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if (
        user.role != UserRole.SUPER_ADMIN
        and event.organisation.user_id != user.id
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return event


async def _recompute_team_stats(team_id: UUID, db: AsyncSession) -> None:
    """Sum member totals into the team row. Called after team CRUD ops."""
    res = await db.execute(
        select(
            func.coalesce(func.sum(EventRunner.amount_raised), 0),
            func.coalesce(func.sum(EventRunner.distance_completed_km), 0),
            func.count(EventRunner.id),
        ).where(EventRunner.team_id == team_id)
    )
    raised, distance, count = res.one()
    await db.execute(
        EventTeam.__table__.update()
        .where(EventTeam.id == team_id)
        .values(
            total_raised=raised or Decimal("0"),
            total_distance_km=distance or Decimal("0"),
            member_count=count or 0,
        )
    )


# ---------- Public ----------


@router.get(
    "/events/{event_id}/teams",
    response_model=list[TeamPublic],
)
async def list_teams(
    event_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[TeamPublic]:
    """Public team leaderboard for an event, ordered by raised desc."""
    res = await db.execute(
        select(EventTeam)
        .where(EventTeam.event_id == event_id)
        .order_by(EventTeam.total_raised.desc(), EventTeam.created_at.asc())
    )
    teams = list(res.scalars().all())
    # Recompute on read — cheap on small N, keeps board fresh w/o cron
    for t in teams:
        await _recompute_team_stats(t.id, db)
    await db.commit()
    res = await db.execute(
        select(EventTeam)
        .where(EventTeam.event_id == event_id)
        .order_by(EventTeam.total_raised.desc(), EventTeam.created_at.asc())
    )
    return [TeamPublic.model_validate(t) for t in res.scalars().all()]


# ---------- Manager ----------


@router.post(
    "/events/{event_id}/teams",
    response_model=TeamPublic,
    status_code=status.HTTP_201_CREATED,
)
async def create_team(
    event_id: UUID,
    payload: TeamIn,
    request: Request,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TeamPublic:
    await _ensure_manager_owns_event(event_id, user, db)
    team = EventTeam(
        event_id=event_id,
        name=payload.name,
        slug=make_slug(payload.name),
        description=payload.description,
        logo_url=payload.logo_url,
        captain_id=payload.captain_id,
    )
    db.add(team)
    await log_action(
        db,
        entity_type="event_team",
        entity_id=team.id,
        action="team.created",
        actor=user,
        metadata={"name": payload.name},
        request=request,
    )
    await db.commit()
    await db.refresh(team)
    return TeamPublic.model_validate(team)


@router.put("/teams/{team_id}", response_model=TeamPublic)
async def update_team(
    team_id: UUID,
    payload: TeamIn,
    request: Request,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TeamPublic:
    res = await db.execute(select(EventTeam).where(EventTeam.id == team_id))
    team = res.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await _ensure_manager_owns_event(team.event_id, user, db)
    team.name = payload.name
    team.description = payload.description
    team.logo_url = payload.logo_url
    team.captain_id = payload.captain_id
    await log_action(
        db,
        entity_type="event_team",
        entity_id=team.id,
        action="team.updated",
        actor=user,
        request=request,
    )
    await db.commit()
    await db.refresh(team)
    return TeamPublic.model_validate(team)


@router.delete("/teams/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(
    team_id: UUID,
    request: Request,
    user: Annotated[User, Depends(require_manager)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    res = await db.execute(select(EventTeam).where(EventTeam.id == team_id))
    team = res.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await _ensure_manager_owns_event(team.event_id, user, db)
    await db.delete(team)
    await log_action(
        db,
        entity_type="event_team",
        entity_id=team_id,
        action="team.deleted",
        actor=user,
        request=request,
    )
    await db.commit()


# ---------- Runner: join / leave ----------


class JoinTeamPayload(BaseModel):
    team_id: UUID | None  # None = leave


@router.put("/event-runners/{event_runner_id}/team")
async def set_runner_team(
    event_runner_id: UUID,
    payload: JoinTeamPayload,
    request: Request,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TeamPublic | None:
    """Runner joins (or leaves with team_id=null) a team within their event."""
    res = await db.execute(
        select(EventRunner).where(EventRunner.id == event_runner_id)
    )
    er = res.scalar_one_or_none()
    if not er:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if er.user_id != user.id and user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)

    if payload.team_id is not None:
        team_res = await db.execute(
            select(EventTeam).where(EventTeam.id == payload.team_id)
        )
        team = team_res.scalar_one_or_none()
        if not team or team.event_id != er.event_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Team does not belong to this event",
            )

    old_team = er.team_id
    er.team_id = payload.team_id
    await log_action(
        db,
        entity_type="event_runner",
        entity_id=er.id,
        action="event_runner.team_changed",
        actor=user,
        metadata={
            "old": str(old_team) if old_team else None,
            "new": str(payload.team_id) if payload.team_id else None,
        },
        request=request,
    )
    await db.flush()

    if old_team:
        await _recompute_team_stats(old_team, db)
    if payload.team_id:
        await _recompute_team_stats(payload.team_id, db)
    await db.commit()

    if payload.team_id is None:
        return None
    res2 = await db.execute(
        select(EventTeam).where(EventTeam.id == payload.team_id)
    )
    return TeamPublic.model_validate(res2.scalar_one())
