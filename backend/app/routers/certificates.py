"""Runner certificate endpoints."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.event_runner import EventRunner
from app.models.user import User, UserRole
from app.services.certificate_service import generate_for_event_runner

router = APIRouter(prefix="/certificates", tags=["certificates"])


@router.get("/runner/{event_runner_id}")
async def download_certificate(
    event_runner_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FileResponse:
    """Generate (or regenerate) and stream the runner's certificate PDF."""
    result = await db.execute(
        select(EventRunner).where(EventRunner.id == event_runner_id)
    )
    er = result.scalar_one_or_none()
    if not er:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    is_admin = user.role == UserRole.SUPER_ADMIN
    if not is_admin and er.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the runner or a super-admin can download this certificate.",
        )

    try:
        path = await generate_for_event_runner(er.id, db)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc

    return FileResponse(
        path,
        media_type="application/pdf",
        filename=path.name,
    )
