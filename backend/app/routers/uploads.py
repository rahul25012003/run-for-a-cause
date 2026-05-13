"""File upload endpoints — store via configured backend, return public URL."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.dependencies import get_current_user
from app.models.user import User
from app.services.storage import get_storage
from app.utils.rate_limit import RateLimitUpload

router = APIRouter(prefix="/uploads", tags=["uploads"])

IMAGE_MIMES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}
IMAGE_EXTS = {"jpg", "jpeg", "png", "webp", "gif"}
IMAGE_MAX_BYTES = 8 * 1024 * 1024  # 8 MB

VIDEO_MIMES = {
    "video/mp4",
    "video/webm",
    "video/quicktime",  # .mov
}
VIDEO_EXTS = {"mp4", "webm", "mov"}
# Hero loops want a small file. 50 MB is plenty for 10–20s 1080p compressed
# right; warn admins to compress further. Bigger uploads should go to S3 + CDN.
VIDEO_MAX_BYTES = 50 * 1024 * 1024


def _save(
    file: UploadFile,
    sub: str,
    *,
    mimes: set[str],
    exts: set[str],
    max_bytes: int,
    default_ext: str,
) -> tuple[str, str]:
    if file.content_type not in mimes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}",
        )

    ext = (file.filename or f"file.{default_ext}").split(".")[-1].lower()
    if ext not in exts:
        ext = default_ext

    contents = file.file.read()
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {max_bytes // (1024 * 1024)} MB limit",
        )

    # Storage backend handles random filename + actual write.
    public_url = get_storage().put(content=contents, sub=sub, ext=ext)
    # Filename for the response — derived from the URL.
    filename = public_url.rsplit("/", 1)[-1]
    return public_url, filename


@router.post("/image", status_code=status.HTTP_201_CREATED)
async def upload_image(
    user: Annotated[User, Depends(get_current_user)],
    file: Annotated[UploadFile, File()],
    _rate: RateLimitUpload = None,
) -> dict[str, str]:
    """Upload a generic image (used by /admin/content for hero/etc.)."""
    url, path = _save(
        file,
        "images",
        mimes=IMAGE_MIMES,
        exts=IMAGE_EXTS,
        max_bytes=IMAGE_MAX_BYTES,
        default_ext="jpg",
    )
    return {"url": url, "filename": path}


@router.post("/proof", status_code=status.HTTP_201_CREATED)
async def upload_proof(
    user: Annotated[User, Depends(get_current_user)],
    file: Annotated[UploadFile, File()],
    _rate: RateLimitUpload = None,
) -> dict[str, str]:
    """Upload a distance-log proof screenshot."""
    url, path = _save(
        file,
        "proofs",
        mimes=IMAGE_MIMES,
        exts=IMAGE_EXTS,
        max_bytes=IMAGE_MAX_BYTES,
        default_ext="jpg",
    )
    return {"url": url, "filename": path}


@router.post("/video", status_code=status.HTTP_201_CREATED)
async def upload_video(
    user: Annotated[User, Depends(get_current_user)],
    file: Annotated[UploadFile, File()],
    _rate: RateLimitUpload = None,
) -> dict[str, str]:
    """Upload a hero / background video (mp4 / webm / mov, ≤50 MB).

    Compress before uploading. For 1080p hero loops, ffmpeg with libx264
    crf=24, ~3 Mbps target, 10–20s = ~5–10 MB. Anything bigger should live
    on a CDN.
    """
    url, path = _save(
        file,
        "videos",
        mimes=VIDEO_MIMES,
        exts=VIDEO_EXTS,
        max_bytes=VIDEO_MAX_BYTES,
        default_ext="mp4",
    )
    return {"url": url, "filename": path}
