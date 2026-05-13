"""Organisation endpoints."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, require_admin
from app.models.organisation import KycStatus, Organisation
from app.models.user import User, UserRole
from app.schemas.organisation import (
    OrganisationCreate,
    OrganisationDetail,
    OrganisationPublic,
    OrganisationUpdate,
    kyc_locked_attempted_edits,
)
from app.services.audit_service import log_action
from app.utils.slugs import make_slug

router = APIRouter(prefix="/organisations", tags=["organisations"])


@router.get("/", response_model=list[OrganisationPublic])
async def list_organisations(
    db: Annotated[AsyncSession, Depends(get_db)],
    verified_only: bool = True,
) -> list[OrganisationPublic]:
    """Public list of organisations (verified by default)."""
    stmt = select(Organisation).where(Organisation.is_active.is_(True))
    if verified_only:
        stmt = stmt.where(Organisation.kyc_status == KycStatus.VERIFIED)
    stmt = stmt.order_by(Organisation.created_at.desc())
    result = await db.execute(stmt)
    return [OrganisationPublic.model_validate(o) for o in result.scalars().all()]


@router.post(
    "/",
    response_model=OrganisationDetail,
    status_code=status.HTTP_201_CREATED,
)
async def create_organisation(
    payload: OrganisationCreate,
    request: Request,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganisationDetail:
    """Create the calling user's organisation profile (one per user)."""
    existing = await db.execute(
        select(Organisation).where(Organisation.user_id == user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an organisation",
        )

    org = Organisation(
        user_id=user.id,
        name=payload.name,
        slug=make_slug(payload.name),
        description=payload.description,
        logo_url=payload.logo_url,
        website=payload.website,
        pan_number=payload.pan_number,
        gstin=payload.gstin,
        reg_80g_number=payload.reg_80g_number,
        is_80g_eligible=bool(payload.reg_80g_number),
        bank_account_no=payload.bank_account_no,
        bank_ifsc=payload.bank_ifsc,
        bank_name=payload.bank_name,
        bank_account_holder=payload.bank_account_holder,
        kyc_status=KycStatus.SUBMITTED if payload.pan_number else KycStatus.PENDING,
    )
    db.add(org)

    if user.role == UserRole.RUNNER:
        user.role = UserRole.EVENT_MANAGER

    await db.flush()
    await log_action(
        db,
        entity_type="organisation",
        entity_id=org.id,
        action="organisation.created",
        actor=user,
        request=request,
    )
    await db.commit()
    await db.refresh(org)
    return OrganisationDetail.model_validate(org)


@router.get("/me", response_model=OrganisationDetail)
async def get_my_organisation(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganisationDetail:
    """Return the calling user's organisation."""
    result = await db.execute(
        select(Organisation).where(Organisation.user_id == user.id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No organisation found for this user",
        )
    return OrganisationDetail.model_validate(org)


@router.put("/me", response_model=OrganisationDetail)
async def update_my_organisation(
    payload: OrganisationUpdate,
    request: Request,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganisationDetail:
    """Update the calling user's organisation profile."""
    result = await db.execute(
        select(Organisation).where(Organisation.user_id == user.id)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No organisation found for this user",
        )

    # KYC fields lock once the org is VERIFIED — re-editing PAN / GSTIN /
    # bank details after approval would invalidate the verification (and
    # allow swapping the payout account after audit, a fraud vector).
    is_verified = org.kyc_status == KycStatus.VERIFIED
    locked = kyc_locked_attempted_edits(payload, is_verified)
    if locked:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "These fields can't be changed after KYC verification: "
                + ", ".join(locked)
                + ". Contact a super-admin to revert verification first."
            ),
        )

    payload_dict = payload.model_dump(exclude_unset=True)
    # If a KYC field changed and the org was previously rejected (or pending),
    # bump status back to SUBMITTED so the super-admin queue picks it up.
    kyc_locked_set = {
        "pan_number",
        "gstin",
        "reg_80g_number",
        "bank_account_no",
        "bank_ifsc",
        "bank_name",
        "bank_account_holder",
    }
    touched_kyc = any(k in payload_dict for k in kyc_locked_set)
    for field, value in payload_dict.items():
        setattr(org, field, value)
    if touched_kyc and not is_verified:
        org.kyc_status = KycStatus.SUBMITTED
        org.kyc_rejection_reason = None

    await log_action(
        db,
        entity_type="organisation",
        entity_id=org.id,
        action="organisation.updated",
        actor=user,
        metadata={"kyc_resubmitted": touched_kyc and not is_verified},
        request=request,
    )
    await db.commit()
    await db.refresh(org)
    return OrganisationDetail.model_validate(org)


@router.get("/{slug}", response_model=OrganisationPublic)
async def get_organisation(
    slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganisationPublic:
    """Public organisation profile by slug."""
    result = await db.execute(select(Organisation).where(Organisation.slug == slug))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return OrganisationPublic.model_validate(org)


@router.get("/{slug}/profile")
async def get_organisation_profile(
    slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Enriched public profile with aggregate stats and event list.

    Used by the public /organisations/[slug] page so it has all data it
    needs in one round-trip.
    """
    from sqlalchemy import func

    from app.models.event import Event, EventStatus

    org_res = await db.execute(
        select(Organisation).where(Organisation.slug == slug)
    )
    org = org_res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    # Aggregate across all of this org's events
    agg_res = await db.execute(
        select(
            func.count(Event.id).label("event_count"),
            func.coalesce(func.sum(Event.total_raised), 0).label("total_raised"),
            func.coalesce(func.sum(Event.total_runners), 0).label("total_runners"),
            func.coalesce(func.sum(Event.total_distance_km), 0).label(
                "total_distance_km"
            ),
        ).where(Event.organisation_id == org.id)
    )
    agg = agg_res.one()

    # Event list (newest first)
    events_res = await db.execute(
        select(Event)
        .where(Event.organisation_id == org.id)
        .where(Event.status.in_((EventStatus.LIVE, EventStatus.COMPLETED)))
        .order_by(Event.start_date.desc())
        .limit(50)
    )
    events = [
        {
            "id": str(e.id),
            "slug": e.slug,
            "title": e.title,
            "cause_summary": e.cause_summary,
            "cover_image_url": e.cover_image_url,
            "status": e.status.value,
            "start_date": e.start_date.isoformat() if e.start_date else None,
            "end_date": e.end_date.isoformat() if e.end_date else None,
            "total_raised": str(e.total_raised or 0),
            "fundraising_goal": str(e.fundraising_goal or 0),
            "total_runners": e.total_runners or 0,
        }
        for e in events_res.scalars().all()
    ]

    return {
        "organisation": OrganisationPublic.model_validate(org).model_dump(
            mode="json"
        ),
        "stats": {
            "event_count": int(agg.event_count or 0),
            "total_raised": str(agg.total_raised or 0),
            "total_runners": int(agg.total_runners or 0),
            "total_distance_km": str(agg.total_distance_km or 0),
        },
        # DPDP — published DPO contact
        "dpo": {
            "name": org.dpo_name,
            "email": org.dpo_email,
            "phone": org.dpo_phone,
        },
        "events": events,
    }


@router.post("/{org_id}/penny-drop")
async def trigger_penny_drop(
    org_id: UUID,
    request: Request,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Super-admin: trigger Razorpay penny-drop bank validation (E2).

    Returns 503 with a clear message when live keys aren't configured —
    the admin UI can hide the button cleanly.
    """
    from app.services.kyc_verification_service import (
        is_available,
        validate_bank_account,
    )

    if not is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Penny-drop requires Razorpay LIVE keys (rzp_live_*).",
        )

    result = await db.execute(select(Organisation).where(Organisation.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if not (org.bank_account_no and org.bank_ifsc and org.bank_account_holder):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Org is missing bank account, IFSC, or account holder name.",
        )

    try:
        validation = await validate_bank_account(
            contact_name=org.bank_account_holder,
            account_number=org.bank_account_no,
            ifsc=org.bank_ifsc,
            org_id=org.id,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Razorpay rejected the validation: {exc}",
        ) from exc

    await log_action(
        db,
        entity_type="organisation",
        entity_id=org.id,
        action="organisation.penny_drop_initiated",
        actor=admin,
        metadata={"validation_id": validation.get("id")},
        request=request,
    )
    await db.commit()
    return {
        "validation_id": validation.get("id"),
        "status": validation.get("status"),
        "results": validation.get("results"),
    }


@router.post("/{org_id}/verify-kyc", response_model=OrganisationDetail)
async def verify_kyc(
    org_id: UUID,
    request: Request,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganisationDetail:
    """Super-admin: mark an organisation's KYC as verified."""
    result = await db.execute(select(Organisation).where(Organisation.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    from datetime import UTC, datetime

    org.kyc_status = KycStatus.VERIFIED
    org.kyc_verified_at = datetime.now(UTC)
    org.kyc_verified_by = admin.id

    await log_action(
        db,
        entity_type="organisation",
        entity_id=org.id,
        action="organisation.kyc_verified",
        actor=admin,
        request=request,
    )
    await db.commit()
    await db.refresh(org)
    return OrganisationDetail.model_validate(org)


@router.post("/{org_id}/reject-kyc", response_model=OrganisationDetail)
async def reject_kyc(
    org_id: UUID,
    request: Request,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    reason: str = "",
) -> OrganisationDetail:
    """Super-admin: reject an organisation's KYC submission."""
    result = await db.execute(select(Organisation).where(Organisation.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    org.kyc_status = KycStatus.REJECTED
    org.kyc_rejection_reason = reason or "Not provided"
    await log_action(
        db,
        entity_type="organisation",
        entity_id=org.id,
        action="organisation.kyc_rejected",
        actor=admin,
        reason=reason,
        request=request,
    )
    await db.commit()
    await db.refresh(org)
    return OrganisationDetail.model_validate(org)


@router.post("/{org_id}/reset-kyc", response_model=OrganisationDetail)
async def reset_kyc(
    org_id: UUID,
    request: Request,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganisationDetail:
    """Super-admin: reset KYC to pending so the manager can re-edit locked fields."""
    result = await db.execute(select(Organisation).where(Organisation.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    org.kyc_status = KycStatus.PENDING
    org.kyc_verified_at = None
    org.kyc_verified_by = None
    org.kyc_rejection_reason = None
    await log_action(
        db,
        entity_type="organisation",
        entity_id=org.id,
        action="organisation.kyc_reset",
        actor=admin,
        request=request,
    )
    await db.commit()
    await db.refresh(org)
    return OrganisationDetail.model_validate(org)


@router.put("/{org_id}", response_model=OrganisationDetail)
async def admin_update_org(
    org_id: UUID,
    payload: OrganisationUpdate,
    request: Request,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganisationDetail:
    """Super-admin: edit any organisation field regardless of KYC status."""
    result = await db.execute(select(Organisation).where(Organisation.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(org, field, value)
    await log_action(
        db,
        entity_type="organisation",
        entity_id=org.id,
        action="organisation.admin_updated",
        actor=admin,
        request=request,
    )
    await db.commit()
    await db.refresh(org)
    return OrganisationDetail.model_validate(org)


@router.delete("/{org_id}", status_code=204)
async def delete_org(
    org_id: UUID,
    request: Request,
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    """Super-admin: permanently delete an organisation and all its data."""
    result = await db.execute(select(Organisation).where(Organisation.id == org_id))
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await log_action(
        db,
        entity_type="organisation",
        entity_id=org.id,
        action="organisation.deleted",
        actor=admin,
        request=request,
        metadata={"name": org.name},
    )
    await db.delete(org)
    await db.commit()


@router.get("/admin/all", response_model=list[OrganisationDetail])
async def list_all_orgs(
    admin: Annotated[User, Depends(require_admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 100,
) -> list[OrganisationDetail]:
    """Super-admin: list every organisation regardless of KYC status."""
    result = await db.execute(
        select(Organisation)
        .order_by(Organisation.created_at.desc())
        .limit(limit)
    )
    return [OrganisationDetail.model_validate(o) for o in result.scalars().all()]
