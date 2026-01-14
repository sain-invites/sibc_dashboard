# AGENTS.md

## OVERVIEW

Express router modules for dashboard APIs. Each route builds SQL queries and shapes JSON responses.

## WHERE TO LOOK

- `overview.ts`: KPI + trend + breakdown data.
- `users.ts`: user directory, search, sort, pagination.
- `user360.ts`: per-user detail aggregation.

## CONVENTIONS

- Default-export `router` from each module.
- Use `queryOne`/`queryMany` from `../db.js`.
- Keep SQL in module-level `const SQL = { ... }`.
- Validate query params with schemas from `../lib/validators.js`.
- Use KST (`Asia/Seoul`) in SQL date handling.
- `llm_usage`: filter/group by `ts`, not `created_at`.
- `daily_routine_activities`: filter by `ymd` via `to_date(ymd::text, 'YYYYMMDD')`.
- `chat_threads`: fallback user_id from `thread_id` when NULL.
- `event_count`: use `COUNT(uel.seq)` in `users.ts`.
- Schema notation uses `sibc.table` (avoid 3-part names).
- Local ESM imports include `.js` extensions.

## ANTI-PATTERNS

- Filtering `llm_usage` by `created_at`.
- Using `completed_at` as the primary date filter for daily routines.
- Omitting `.js` on local imports.
- 3-part schema prefixes (e.g., `db.sibc.table`).
