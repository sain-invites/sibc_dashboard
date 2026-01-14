# AGENTS.md

## OVERVIEW

PostgreSQL migrations and normalization views used by the API.

## WHERE TO LOOK

- `README.md`: migration execution and rules.
- `add_indexes.sql`: performance indexes.
- `views.sql`: normalization views for API queries.

## CONVENTIONS

- Migrations are idempotent.
- Use `CREATE INDEX IF NOT EXISTS`.
- Index names follow `idx_<table>_<column>`.
- Views assume `search_path` is `sibc`.
- Views are read-only.
- Normalize dates to `day` using `Asia/Seoul`.
- Cast JSON strings with `NULLIF(col, '')::jsonb`.

## ANTI-PATTERNS

- Non-idempotent migrations.
- Writing to normalization views.
- Deriving `day` without explicit `Asia/Seoul` timezone.
- Hardcoding non-`sibc` schema prefixes.
