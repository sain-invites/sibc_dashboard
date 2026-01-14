# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-14T00:50:25Z
**Commit:** b6d5a5e
**Branch:** main

## OVERVIEW

Service overview dashboard built on Vite + React 19 with an Express API. TypeScript + ESM everywhere.

## STRUCTURE

```
./
├── client/                # Vite root + React UI
│   └── src/components/ui/ # UI primitives (see AGENTS)
├── server/                # Express API
│   ├── routes/            # API endpoints (see AGENTS)
│   └── sql/               # migrations + views (see AGENTS)
├── dist/                  # build output
└── patches/               # pnpm patches
```

## AGENTS TREE

- `client/src/components/ui/AGENTS.md`
- `server/routes/AGENTS.md`
- `server/sql/AGENTS.md`

## WHERE TO LOOK

| Task                 | Location                                              | Notes                              |
| -------------------- | ----------------------------------------------------- | ---------------------------------- |
| Client entry         | `client/src/main.tsx`                                 | React bootstrap + analytics init   |
| Server entry         | `server/index.ts`                                     | Express bootstrap + static serving |
| API routes           | `server/routes/*.ts`                                  | Overview, Users, User360           |
| UI primitives        | `client/src/components/ui/*.tsx`                      | Radix-based building blocks        |
| Feature components   | `client/src/components/*.tsx`                         | KPIs, charts, tables               |
| Client utilities     | `client/src/lib/*.ts`                                 | Formatting + KPI logic             |
| SQL views/migrations | `server/sql/*.sql`                                    | Normalization views + indexes      |
| Tests                | `client/src/components/KPICard.test.tsx`              | Vitest pattern example             |
| Config               | `vite.config.ts`, `vitest.config.ts`, `tsconfig.json` | Aliases + build setup              |

## CODE MAP

| Symbol        | Type     | Location              | Role                  |
| ------------- | -------- | --------------------- | --------------------- |
| `startServer` | Function | `server/index.ts`     | Express app bootstrap |
| `injectUmami` | Function | `client/src/main.tsx` | Analytics injection   |

## CONVENTIONS

- Vite root is `client/`; client build output is `dist/public`.
- Server bundle is built via esbuild to `dist/index.js`.
- Path aliases: `@` → `client/src`, `@shared` → `shared`, `@assets` → `attached_assets`.
- Server-side local ESM imports must include `.js` extensions.
- Prefer `import type { ... }` for type-only imports.

## ANTI-PATTERNS

- Do not edit `dist/` by hand; it is build output.
- Do not commit or push unless explicitly asked.
- Avoid 1-letter identifiers outside loops.

## COMMANDS

```bash
pnpm dev
pnpm build
pnpm start
pnpm preview
pnpm check
pnpm format
pnpm test
pnpm test:run
pnpm test:ui
pnpm test:coverage
```

## NOTES

- `shared/` and `attached_assets/` aliases are configured; directories are absent.
- `pnpm start` uses `node --env-file=.env` (Node 20+).
