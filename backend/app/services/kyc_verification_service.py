"""Razorpay Fund Account Validation — penny-drop bank verification (E2).

Razorpay sends ₹1 to the organisation's payout bank account. The bank
returns the registered name; Razorpay calls our webhook with the result
(or we poll the validation by id). Pass = bank account is valid AND
the name matches the org name strongly. We persist the result on
`organisations.kyc_status` + `kyc_verification_id` (added in 0011 if
needed; for now we persist a JSON blob in `kyc_metadata`).

API ref: https://razorpay.com/docs/api/x/fund-accounts/validate/

Service is opt-in: only fires when `RAZORPAY_KEY_ID.startswith("rzp_live")`
AND the org has bank_account_no + ifsc + account_holder_name on file.
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

import httpx

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)

RAZORPAY_API = "https://api.razorpay.com/v1"


def is_available() -> bool:
    """Penny-drop only runs against live Razorpay keys — test mode rejects
    fund-account validation requests, so don't waste an API call."""
    return bool(
        settings.RAZORPAY_KEY_ID
        and settings.RAZORPAY_KEY_SECRET
        and settings.RAZORPAY_KEY_ID.startswith("rzp_live")
    )


async def validate_bank_account(
    *,
    contact_name: str,
    account_number: str,
    ifsc: str,
    org_id: UUID,
) -> dict[str, Any]:
    """Trigger a penny-drop validation. Returns the validation record.

    Caller should persist `validation['id']` so they can poll
    `GET /v1/fund_accounts/validations/{id}` later, or rely on the
    `fund_account.validation.completed` webhook.
    """
    if not is_available():
        raise RuntimeError("razorpay_live_keys_required")

    payload = {
        "account_type": "bank_account",
        "bank_account": {
            "name": contact_name,
            "ifsc": ifsc.upper().strip(),
            "account_number": account_number.strip(),
        },
        "amount": 100,  # ₹1.00 in paise
        "currency": "INR",
        "notes": {"org_id": str(org_id), "purpose": "kyc_penny_drop"},
    }
    auth = (settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    try:
        async with httpx.AsyncClient(timeout=30.0, auth=auth) as c:
            r = await c.post(
                f"{RAZORPAY_API}/fund_accounts/validations", json=payload
            )
            r.raise_for_status()
            return r.json()
    except httpx.HTTPStatusError as exc:
        logger.warning(
            "kyc.penny_drop_failed",
            status=exc.response.status_code,
            body=exc.response.text[:300],
            org_id=str(org_id),
        )
        raise


async def fetch_validation(validation_id: str) -> dict[str, Any]:
    """Poll the status of a previously-triggered validation."""
    if not is_available():
        raise RuntimeError("razorpay_live_keys_required")
    auth = (settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
    async with httpx.AsyncClient(timeout=15.0, auth=auth) as c:
        r = await c.get(f"{RAZORPAY_API}/fund_accounts/validations/{validation_id}")
        r.raise_for_status()
        return r.json()
