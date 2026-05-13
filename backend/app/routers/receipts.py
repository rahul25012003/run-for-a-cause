"""Tax receipt endpoints."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user_optional
from app.models.donation import Donation
from app.models.user import User, UserRole
from app.services.receipt_service import issue_receipt_for_donation

router = APIRouter(prefix="/receipts", tags=["receipts"])


@router.post("/issue/{donation_id}")
async def issue_receipt(
    donation_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)] = None,
) -> dict[str, str]:
    """Generate the 80G PDF for a donation. Idempotent."""
    try:
        donation = await issue_receipt_for_donation(donation_id, db)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    return {
        "donation_id": str(donation.id),
        "receipt_number": donation.tax_receipt_number or "",
        "url": f"/api/v1/receipts/download/{donation.id}",
    }


@router.get("/download/{donation_id}")
async def download_receipt(
    donation_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)] = None,
) -> FileResponse:
    """Stream the PDF receipt to the donor or super_admin only.

    Anyone else gets 403 — protects against UUID-guess leakage of receipts.
    """
    result = await db.execute(select(Donation).where(Donation.id == donation_id))
    donation = result.scalar_one_or_none()
    if not donation or not donation.tax_receipt_url:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    is_admin = user is not None and user.role == UserRole.SUPER_ADMIN
    is_donor = user is not None and (
        donation.donor_user_id == user.id or donation.donor_email == user.email
    )
    if not is_admin and not is_donor:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the donor or a super-admin can download this receipt.",
        )

    return FileResponse(
        donation.tax_receipt_url,
        media_type="application/pdf",
        filename=f"{donation.tax_receipt_number}.pdf",
    )
