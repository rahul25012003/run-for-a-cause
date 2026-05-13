# Backend conventions (RunForACause)

This file extends the root `../CLAUDE.md` with backend-specific rules.

## Endpoint anatomy

```python
@router.post(
    "/runners",
    response_model=RunnerOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_runner(
    payload: RunnerIn,                                           # Pydantic IN
    request: Request,                                            # for IP / UA in audit
    user: Annotated[User, Depends(require_admin)],               # role guard
    db: Annotated[AsyncSession, Depends(get_db)],                # DB session
    _rate: RateLimitAuth = None,                                  # rate limit (when relevant)
) -> RunnerOut:
    """Short docstring — one sentence on what this endpoint does."""
    # 1. Look up / validate
    res = await db.execute(select(...))
    target = res.scalar_one_or_none()
    if not target:
        raise HTTPException(404)

    # 2. Mutate
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(target, field, value)

    # 3. Audit
    await log_action(
        db,
        entity_type="runner",
        entity_id=target.id,
        action="runner.updated",
        actor=user,
        request=request,
    )

    # 4. Commit + return
    await db.commit()
    await db.refresh(target)
    return RunnerOut.model_validate(target)
```

Keep this shape consistent — readers know exactly where to find the auth, the audit, the commit.

## Models

- All models extend `Base` from `app.database`.
- Always `from __future__ import annotations` at top — forward refs Just Work.
- `TYPE_CHECKING` block for relationship type hints (avoids circular imports).
- Decimal for money: `Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), nullable=False)`.
- Timestamps: `DateTime(timezone=True)`, `server_default=func.now()`. Use `onupdate=func.now()` for `updated_at`.
- UUIDs: `mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)`.
- Enums: SAEnum with `values_callable=lambda e: [m.value for m in e]` so DB stores the lowercase value, not the Python member name.
- Foreign keys: always include `ondelete=` policy (`CASCADE`, `SET NULL`, `RESTRICT`).
- **Every new model MUST be imported in `app/models/__init__.py`** — Alembic discovers via that import.

## Migrations

- File naming: `0XXX_<short_slug>.py` where XXX is the next number after `select max(version) from alembic_version`.
- `down_revision` MUST point to the previous migration's `revision`.
- For PostgreSQL ENUM additions: use `postgresql.ENUM(..., create_type=False).create(op.get_bind(), checkfirst=True)` to avoid duplicate-type errors when the type already exists.
- Always include `downgrade()`. It can `pass` for additive changes you'd never roll back, but include it.
- After writing the migration, run `alembic upgrade head` from the venv. PowerShell may print stderr that looks like an error — actually fine.

## Schemas (Pydantic v2)

- Three patterns:
  - `XxxIn` — input from API, validation via `Field(...)` constraints
  - `XxxUpdate` — partial update, all fields optional
  - `XxxOut` / `XxxPublic` / `XxxDetail` — output. Inherit `ORMBase` (Pydantic with `from_attributes=True`)
- Currency / numeric: `Decimal | None`. Pydantic 2 serialises to string by default.
- DateTimes: `datetime`. Pydantic serialises to ISO-8601.
- Avoid `dict[str, Any]` returns when possible — define a proper schema.

## Services (`app/services/`)

- Pure-ish functions or classes with `@staticmethod` — easy to call from routers, tasks, tests.
- Take `db: AsyncSession` as a parameter; don't open new sessions inside services.
- Naming: `entity_action` (e.g. `donation_capture`, `account_redact`). Don't use generic verbs (`do_thing`).
- Heavy work (PDF gen, image encode, external API): wrap in try/except and log; never let the API endpoint crash on a service failure that's not user-actionable.

## Auth & guards

- Every authenticated endpoint takes `user: Annotated[User, Depends(get_current_user)]`.
- Role-restricted: swap to `Depends(require_manager)` or `Depends(require_admin)` from `app.dependencies`.
- Resource ownership: after the role guard, ALSO check the resource belongs to this user (e.g. event.organisation.user_id == user.id) — don't rely on role alone.
- Manager / super-admin convention: super-admin can do anything a manager can, plus more. Always allow `if user.role == UserRole.SUPER_ADMIN` to bypass the org-ownership check.

## Audit log

- Every mutating endpoint MUST call `log_action(...)`.
- Required: `entity_type`, `entity_id`, `action`, `actor=user`, `request=request`.
- Optional: `before`, `after`, `metadata`, `reason`.
- Append-only — never DELETE from `audit_logs`.

## Rate limiting

- Use the in-tree limiter at `backend/app/utils/rate_limit.py`. Don't pull SlowAPI.
- Predefined: `RateLimitAuth`, `RateLimitRegister`, `RateLimitUpload`, `RateLimitNewsletter`.
- Add a new one for a hot endpoint: `MyLimit = Annotated[None, rate_limit("scope.name", per_minute=N)]`.

## Email

- `backend/app/services/email_service.py` — `EmailMessage` + `send_email()`.
- Console backend default. Set `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` for real sending.
- Templates are functions that return `(subject, html)`. Add new templates beside the existing `render_*` functions.
- Email failures must NEVER undo the underlying DB action — wrap in try/except, log, continue.

## File uploads

- `backend/app/services/storage.py` exposes `get_storage()` returning `LocalStorage` (default) or `S3Storage` (env-toggle).
- Never write to disk directly — go through the abstraction so dev/prod differ only in config.
- Image: 8 MB cap. Video: 50 MB cap. Reject other MIME types early.

## Error handling

- Raise `HTTPException(status_code=..., detail="user-readable message")`. The detail is shown to the end user.
- Don't leak internal errors. If catching a third-party exception, log it then raise a clean 500: `raise HTTPException(500, "Couldn't process payment. Try again or contact support.")`.
- 404 for "not found OR not yours" — don't differentiate, that's an information leak.

## Logging

- `from app.utils.logger import get_logger; logger = get_logger(__name__)`
- Structured logs: `logger.info("event_name", key1=value1, key2=value2)`. Don't f-string into the message.
- Levels: `info` for happy path milestones, `warning` for recoverable anomalies, `error` for failures.
- Never log secrets or PII (passwords, full PAN, full bank account, OTPs).

## Testing

- `pytest tests/` from `backend/`. Tests live in `backend/tests/`.
- Use the `client` fixture from `conftest.py` — wraps `httpx.AsyncClient` against the FastAPI app.
- Use the `db_session` fixture for direct DB access in tests.
- Each test gets a clean DB (fixture-scoped). Don't depend on order.
- Mock external services (Razorpay, Resend, S3) — never hit real ones in tests.

## Common pitfalls

- ⚠️ Forgetting to import a new model in `app/models/__init__.py` → Alembic doesn't see it
- ⚠️ Forgetting to register a new router in `app/main.py` → endpoint 404s
- ⚠️ `await db.commit()` in a `selectinload` chain crashes — load first, mutate, then commit
- ⚠️ Pydantic enum fields default to the member name, not the value, when serialised. Use `values_callable` on SAEnum and `str` enum subclass on the Python side
- ⚠️ Checking `if value is None` not `if not value` for nullable fields where empty string is meaningful
- ⚠️ Decimal arithmetic mixes badly with float. Always cast both sides to Decimal first
