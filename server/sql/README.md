# Database Migrations

This directory contains SQL migration files for the PostgreSQL database.

## Usage

Migrations are automatically executed by the `runMigrations()` function in `server/db.ts`.

To run migrations manually:
```bash
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f server/sql/add_indexes.sql
```

## Migration Files

- `add_indexes.sql` - Adds indexes to improve query performance

## Migration Guidelines

1. Each migration file should be idempotent (safe to run multiple times)
2. Use `CREATE INDEX IF NOT EXISTS` to avoid errors on repeated runs
3. Add descriptive comments explaining the purpose of each index
4. Indexes should follow naming convention: `idx_<table>_<column>`
