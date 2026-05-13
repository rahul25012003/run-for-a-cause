"""Slug generation utilities."""
import secrets

from slugify import slugify


def make_slug(text: str, suffix_length: int = 6) -> str:
    """Generate a URL-safe slug with a random suffix to avoid collisions."""
    base = slugify(text, max_length=60) or "item"
    suffix = secrets.token_hex(suffix_length // 2 or 1)
    return f"{base}-{suffix}"
