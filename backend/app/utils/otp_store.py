"""In-memory OTP store with TTL.

Mirrors the choice made in `rate_limit.py`: simple in-process dict for
single-worker dev/small deploys. Swap to Redis (`redis.asyncio.Redis`)
for production multi-worker setups — the contract is just `set` /
`verify_and_consume`.

OTPs are stored as bcrypt hashes (never plaintext), with attempt counters
to prevent brute force. Three wrong guesses invalidates the OTP.
"""
from __future__ import annotations

import secrets
import time
from dataclasses import dataclass
from threading import Lock

from passlib.hash import bcrypt

_TTL_SECONDS = 300  # 5 minutes
_MAX_ATTEMPTS = 3


@dataclass
class _Entry:
    hashed: str
    expires_at: float
    attempts: int = 0


_store: dict[str, _Entry] = {}
_lock = Lock()


def _cleanup() -> None:
    now = time.time()
    expired = [k for k, e in _store.items() if e.expires_at < now]
    for k in expired:
        _store.pop(k, None)


def generate_otp() -> str:
    """6-digit numeric OTP. Uses secrets for cryptographic randomness."""
    return f"{secrets.randbelow(1_000_000):06d}"


def store(phone: str, otp: str) -> None:
    """Store hashed OTP for a phone number. Overwrites any existing entry
    (so a re-request invalidates the prior code)."""
    with _lock:
        _cleanup()
        _store[phone] = _Entry(
            hashed=bcrypt.hash(otp),
            expires_at=time.time() + _TTL_SECONDS,
        )


def verify_and_consume(phone: str, otp: str) -> bool:
    """Returns True if OTP matches and is unexpired, then deletes it.
    Returns False on mismatch / expiry / too many attempts."""
    with _lock:
        _cleanup()
        entry = _store.get(phone)
        if not entry:
            return False
        if entry.expires_at < time.time():
            _store.pop(phone, None)
            return False
        if entry.attempts >= _MAX_ATTEMPTS:
            _store.pop(phone, None)
            return False
        entry.attempts += 1
        if not bcrypt.verify(otp, entry.hashed):
            return False
        _store.pop(phone, None)
        return True
