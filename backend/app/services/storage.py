"""Pluggable storage backends — local disk for dev, S3 for production.

Switch via env: STORAGE_BACKEND=s3 + S3_* config keys.

The Storage protocol intentionally accepts raw bytes + filename + sub-path
so it works for any binary content — images, videos, generated PDFs, etc.
"""
from __future__ import annotations

import secrets
from pathlib import Path
from typing import Protocol

from app.config import settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


class StorageBackend(Protocol):
    """Minimal interface — every backend must implement put()."""

    def put(self, *, content: bytes, sub: str, ext: str) -> str:
        """Persist `content` under sub/<random>.<ext> and return a public URL."""
        ...


class LocalStorage:
    """Writes to LOCAL_UPLOAD_DIR. Frontend reads via the FastAPI
    StaticFiles mount at /uploads. This is the default — zero deps."""

    def put(self, *, content: bytes, sub: str, ext: str) -> str:
        base = Path(settings.LOCAL_UPLOAD_DIR) / sub
        base.mkdir(parents=True, exist_ok=True)
        name = f"{secrets.token_hex(12)}.{ext}"
        out = base / name
        out.write_bytes(content)
        return f"{settings.BACKEND_URL.rstrip('/')}/uploads/{sub}/{name}"


class S3Storage:
    """boto3-backed S3 (or any S3-compatible: Wasabi, R2, Spaces).

    Activate by:
        pip install boto3
        STORAGE_BACKEND=s3
        S3_ENDPOINT_URL=...   (omit for AWS S3)
        S3_ACCESS_KEY=...
        S3_SECRET_KEY=...
        S3_BUCKET_NAME=runforacause-uploads
        S3_PUBLIC_URL=https://cdn.runforacause.in   (or bucket public URL)
    """

    def __init__(self) -> None:
        try:
            import boto3  # type: ignore[import-untyped]
        except ImportError as exc:
            raise RuntimeError(
                "STORAGE_BACKEND=s3 but boto3 is not installed. "
                "Run: pip install boto3"
            ) from exc

        kwargs: dict = {
            "aws_access_key_id": settings.S3_ACCESS_KEY,
            "aws_secret_access_key": settings.S3_SECRET_KEY,
        }
        if settings.S3_ENDPOINT_URL:
            kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL
        self._client = boto3.client("s3", **kwargs)
        self._bucket = settings.S3_BUCKET_NAME
        self._public_base = settings.S3_PUBLIC_URL.rstrip("/") if settings.S3_PUBLIC_URL else None

    def put(self, *, content: bytes, sub: str, ext: str) -> str:
        key = f"{sub}/{secrets.token_hex(12)}.{ext}"
        # Best-effort content-type guess from extension
        content_type = {
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp",
            "gif": "image/gif",
            "mp4": "video/mp4",
            "webm": "video/webm",
            "mov": "video/quicktime",
        }.get(ext, "application/octet-stream")
        self._client.put_object(
            Bucket=self._bucket,
            Key=key,
            Body=content,
            ContentType=content_type,
            ACL="public-read",
        )
        if self._public_base:
            return f"{self._public_base}/{key}"
        return f"https://{self._bucket}.s3.amazonaws.com/{key}"


_BACKEND: StorageBackend | None = None


def get_storage() -> StorageBackend:
    """Singleton backend resolved by env. Cheap to call repeatedly."""
    global _BACKEND
    if _BACKEND is not None:
        return _BACKEND
    backend_name = getattr(settings, "STORAGE_BACKEND", "local").lower()
    if backend_name == "s3":
        _BACKEND = S3Storage()
        logger.info("storage_backend_active", backend="s3", bucket=settings.S3_BUCKET_NAME)
    else:
        _BACKEND = LocalStorage()
        logger.info("storage_backend_active", backend="local", dir=settings.LOCAL_UPLOAD_DIR)
    return _BACKEND
