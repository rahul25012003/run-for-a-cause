"""Authentication endpoints."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    AccountDeleteRequest,
    AuthResponse,
    DataExport,
    DigestUpdate,
    LoginRequest,
    PasswordChangeRequest,
    RegisterRequest,
    UserPublic,
    UserUpdate,
)
from app.services.account_service import build_data_export, redact_user
from app.utils.rate_limit import RateLimitAuth, RateLimitRegister
from app.services.audit_service import log_action
from app.utils.security import (
    create_access_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    _rate: RateLimitRegister = None,  # 5/min, burst 3
) -> AuthResponse:
    """Register a new user account."""
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with that email already exists",
        )

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        phone=payload.phone,
        role=payload.role,
    )
    db.add(user)
    await db.flush()

    await log_action(
        db,
        entity_type="user",
        entity_id=user.id,
        action="user.registered",
        actor=user,
        request=request,
    )
    await db.commit()
    await db.refresh(user)

    token = create_access_token(subject=user.id, role=user.role.value)
    _set_auth_cookie(response, token)
    return AuthResponse(user=UserPublic.model_validate(user), access_token=token)


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    _rate: RateLimitAuth = None,  # 10/min, burst 5
) -> AuthResponse:
    """Authenticate and issue an access token (also set as httpOnly cookie)."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    if user.totp_enabled:
        if not payload.totp_code:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="TOTP code required",
            )
        import pyotp

        totp = pyotp.TOTP(user.totp_secret or "")
        if not totp.verify(payload.totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid TOTP code",
            )

    await log_action(
        db,
        entity_type="user",
        entity_id=user.id,
        action="user.login",
        actor=user,
        request=request,
    )
    await db.commit()

    token = create_access_token(subject=user.id, role=user.role.value)
    _set_auth_cookie(response, token)
    return AuthResponse(user=UserPublic.model_validate(user), access_token=token)


class _OTPRequest:
    pass


@router.post("/sms-otp/request", status_code=status.HTTP_204_NO_CONTENT)
async def sms_otp_request(
    payload: dict,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    _rate: RateLimitAuth = None,
) -> Response:
    """Send a 6-digit OTP to a phone number. The phone must already be on
    a registered user — we don't auto-create accounts here. Returns 204
    even if the number is unknown (doesn't leak which phones are registered)."""
    phone = (payload.get("phone") or "").strip()
    if not phone or not phone.replace("+", "").isdigit() or len(phone) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Valid phone number required",
        )

    # Find a user with this phone — if absent, still return 204 (no enumeration)
    res = await db.execute(select(User).where(User.phone == phone))
    user = res.scalar_one_or_none()

    if user and user.is_active:
        from app.services.sms_service import send_sms_otp
        from app.utils.otp_store import generate_otp, store as store_otp

        otp = generate_otp()
        store_otp(phone, otp)
        sent = await send_sms_otp(phone=phone, otp=otp)
        if not sent:
            # SMS not configured — surface the OTP in dev logs ONLY.
            # In prod (APP_ENV=production), send a 500 so the user retries.
            if settings.APP_ENV != "production":
                from app.utils.logger import get_logger

                get_logger(__name__).info(
                    "sms.dev_otp",
                    phone=phone[-4:],
                    otp=otp,
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="SMS provider unavailable. Use email login.",
                )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/sms-otp/verify", response_model=AuthResponse)
async def sms_otp_verify(
    payload: dict,
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    _rate: RateLimitAuth = None,
) -> AuthResponse:
    """Verify the OTP and issue an auth cookie."""
    from app.utils.otp_store import verify_and_consume

    phone = (payload.get("phone") or "").strip()
    otp = (payload.get("otp") or "").strip()
    if not phone or not otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone and OTP required",
        )
    if not verify_and_consume(phone, otp):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired OTP",
        )

    res = await db.execute(select(User).where(User.phone == phone))
    user = res.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account for that phone",
        )

    await log_action(
        db,
        entity_type="user",
        entity_id=user.id,
        action="user.login_sms",
        actor=user,
        request=request,
    )
    await db.commit()

    token = create_access_token(subject=user.id, role=user.role.value)
    _set_auth_cookie(response, token)
    return AuthResponse(user=UserPublic.model_validate(user), access_token=token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout() -> Response:
    """Clear the auth cookie.

    Build the response inline so ``delete_cookie`` is applied to the
    instance we actually return. (Previously we mutated the FastAPI
    request-scoped ``response`` parameter and then returned a fresh
    ``Response()`` — the Set-Cookie header was discarded silently and
    cookies persisted across logout.)
    """
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie(key="access_token", path="/")
    return response


@router.get("/me", response_model=UserPublic)
async def me(
    user: Annotated[User, Depends(get_current_user)],
) -> UserPublic:
    """Return the currently authenticated user's profile."""
    return UserPublic.model_validate(user)


@router.put("/me", response_model=UserPublic)
async def update_me(
    payload: UserUpdate,
    request: Request,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserPublic:
    """Update the calling user's account: name, phone, avatar, bio."""
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await log_action(
        db,
        entity_type="user",
        entity_id=user.id,
        action="user.profile_updated",
        actor=user,
        request=request,
    )
    await db.commit()
    await db.refresh(user)
    return UserPublic.model_validate(user)


@router.put("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: PasswordChangeRequest,
    request: Request,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Change the calling user's password. Requires the current password."""
    if not user.hashed_password or not verify_password(
        payload.current_password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )
    if payload.new_password == payload.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current one.",
        )
    user.hashed_password = hash_password(payload.new_password)
    await log_action(
        db,
        entity_type="user",
        entity_id=user.id,
        action="user.password_changed",
        actor=user,
        request=request,
    )
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- DPDP: data export, soft-delete, digest preference ----------


@router.get("/me/data-export", response_model=DataExport)
async def export_my_data(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DataExport:
    """Right to data portability — return everything we hold about the caller
    as a single JSON document."""
    payload = await build_data_export(user, db)
    return DataExport.model_validate(payload)


@router.put("/me/digest", response_model=UserPublic)
async def update_digest_preference(
    payload: DigestUpdate,
    request: Request,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserPublic:
    """Set how often we email the user — instant / daily / weekly / none."""
    user.digest_frequency = payload.digest_frequency.value
    await log_action(
        db,
        entity_type="user",
        entity_id=user.id,
        action="user.digest_changed",
        actor=user,
        metadata={"frequency": user.digest_frequency},
        request=request,
    )
    await db.commit()
    await db.refresh(user)
    return UserPublic.model_validate(user)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(
    payload: AccountDeleteRequest,
    request: Request,
    response: Response,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    """Soft-delete with 30-day grace. PII is redacted immediately so it stops
    appearing in queries; financial records (donations) keep their amount but
    lose the link to a real identity. A future cron does the hard purge.

    Requires the user to type their own email as a confirmation step so we
    can't delete by accident from a misclick or stale tab."""
    if payload.confirm_email.lower().strip() != user.email.lower().strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation email doesn't match your account email.",
        )
    redact_user(user)
    await log_action(
        db,
        entity_type="user",
        entity_id=user.id,
        action="user.account_deleted",
        actor=user,
        request=request,
    )
    await db.commit()
    response.delete_cookie(key="access_token", path="/")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- Donor home: list every donation the caller has made ----------


from app.models.donation import Donation, DonationStatus  # noqa: E402
from app.models.event import Event  # noqa: E402
from app.models.event_runner import EventRunner  # noqa: E402
from sqlalchemy.orm import selectinload  # noqa: E402


@router.get("/me/donations")
async def list_my_donations(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """Donor home — every donation the caller has made, plus aggregates."""
    res = await db.execute(
        select(Donation)
        .where(Donation.donor_user_id == user.id)
        .options(
            selectinload(Donation.event_runner).selectinload(EventRunner.user),
            selectinload(Donation.event).selectinload(Event.organisation),
        )
        .order_by(Donation.created_at.desc())
    )
    donations = list(res.scalars().all())

    rows: list[dict] = []
    total_given = 0.0
    runners_supported: set[str] = set()
    for d in donations:
        total_given += float(d.estimated_amount or 0)
        if d.event_runner:
            runners_supported.add(str(d.event_runner.id))
        rows.append(
            {
                "id": str(d.id),
                "created_at": d.created_at.isoformat() if d.created_at else None,
                "status": d.status.value if d.status else None,
                "amount": str(d.estimated_amount or 0),
                "final_amount": str(d.final_amount) if d.final_amount else None,
                "donation_type": d.donation_type.value if d.donation_type else None,
                "is_80g_eligible": d.is_80g_eligible,
                "tax_receipt_number": d.tax_receipt_number,
                "razorpay_payment_id": d.razorpay_payment_id,
                "runner": {
                    "name": d.event_runner.user.full_name
                    if d.event_runner and d.event_runner.user
                    else None,
                    "public_slug": d.event_runner.public_slug
                    if d.event_runner
                    else None,
                },
                "event": {
                    "title": d.event.title if d.event else None,
                    "slug": d.event.slug if d.event else None,
                    "organisation_name": d.event.organisation.name
                    if d.event and d.event.organisation
                    else None,
                },
            }
        )

    captured_count = sum(
        1
        for d in donations
        if d.status in (DonationStatus.CAPTURED, DonationStatus.SETTLED)
    )

    return {
        "summary": {
            "total_given": str(total_given),
            "donation_count": len(donations),
            "captured_count": captured_count,
            "runners_supported": len(runners_supported),
        },
        "donations": rows,
    }
