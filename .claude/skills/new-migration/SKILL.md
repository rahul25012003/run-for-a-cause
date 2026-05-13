---
name: new-migration
description: Scaffold a new Alembic migration with the correct revision id and `down_revision` chain. Use whenever a model change requires a schema update (new column, new table, enum value addition).
allowed-tools: Read, Write, Bash, PowerShell
---

# New migration

## Steps

1. Find the latest migration's `revision` string:
   ```powershell
   ls C:\Users\Rahul\run-for-a-cause\backend\alembic\versions\
   ```
   Pick the highest-numbered one and `Read` it to get its `revision: str = "..."`.

2. Choose the next migration name. Convention: `0XXX_<short_slug>.py` where
   XXX is the next number. Slug describes the change (e.g. `0009_add_streak_counter`).

3. Create the file at `backend/alembic/versions/0XXX_<slug>.py`:

   ```python
   """<one-line description>

   Revision ID: 0XXX_<slug>
   Revises: <previous revision id>
   Create Date: <today's ISO date>
   """
   from collections.abc import Sequence

   import sqlalchemy as sa
   from alembic import op
   # If using Postgres-specific types:
   from sqlalchemy.dialects import postgresql

   revision: str = "0XXX_<slug>"
   down_revision: str | None = "<previous revision id>"
   branch_labels: str | Sequence[str] | None = None
   depends_on: str | Sequence[str] | None = None


   def upgrade() -> None:
       # Add your column / table / index here
       op.add_column(
           "<table_name>",
           sa.Column("<col>", sa.<Type>(), nullable=True),
       )


   def downgrade() -> None:
       op.drop_column("<table_name>", "<col>")
   ```

4. Update the SQLAlchemy model accordingly in `backend/app/models/`.

5. **CRITICAL**: import any new model in `backend/app/models/__init__.py`
   so Alembic can discover relationships.

6. Apply:
   ```powershell
   $env:PYTHONIOENCODING="utf-8"
   cd C:\Users\Rahul\run-for-a-cause\backend
   .\.venv\Scripts\python.exe -m alembic upgrade head
   ```

7. PowerShell will print stderr that LOOKS like an error — it's not. Look
   for the line `Running upgrade <prev> -> 0XXX_<slug>, ...` — that
   confirms success.

## Tips

- For PostgreSQL ENUM additions: use `postgresql.ENUM(..., create_type=False).create(op.get_bind(), checkfirst=True)` to handle the case where the enum type already exists.
- Always include both `upgrade()` and `downgrade()`. `downgrade()` can be `pass` for trivial additions, but include it.
- Test the rollback locally: `alembic downgrade -1` then `alembic upgrade head`.
