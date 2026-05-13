.PHONY: up down logs migrate seed test lint shell-backend shell-db redis-cli

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f backend frontend

migrate:
	docker compose exec backend alembic upgrade head

seed:
	docker compose exec backend python -m app.seed

revision:
	docker compose exec backend alembic revision --autogenerate -m "$(m)"

test:
	docker compose exec backend pytest -v

lint:
	docker compose exec backend ruff check app/

shell-backend:
	docker compose exec backend python

shell-db:
	docker compose exec postgres psql -U runforacause runforacause

redis-cli:
	docker compose exec redis redis-cli
