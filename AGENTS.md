# AGENTS.md

## Project Summary

- Service overview dashboard (Vite + React 19) with Express API.
- TypeScript everywhere; ESM modules; strict type checking.
- Client in `client/`, server in `server/`, shared code in `shared/`.

## Repo Layout

- `client/`: React UI, Tailwind styling, pages/components/hooks.
- `server/`: Express API, PostgreSQL access, CSV fallback mode.
- `shared/`: Shared constants/types (import via `@shared/*`).
- `dist/`: Build output (server bundle + client static).
- `patches/`: pnpm patch files for overrides.

## Paths & Aliases

- Vite root is `client/` and envDir is repo root.
- `@` resolves to `client/src`.
- `@shared` resolves to `shared`.
- `@assets` resolves to `attached_assets`.
- Vite dev server runs on port 3000 and allows localhost/127.0.0.1.

## Core Commands (pnpm)

- `pnpm dev`: Vite dev server for client UI.
- `pnpm build`: Vite build + esbuild bundle for server.
- `pnpm start`: Run production server from `dist/` (needs `.env`).
- `pnpm preview`: Preview client build via Vite.
- `pnpm check`: Typecheck (`tsc --noEmit`).
- `pnpm format`: Prettier format all files.

## Testing

- No `test` script is defined in `package.json`.
- `vitest` is not listed in dependencies.
- If `vitest` is installed in your environment:
- Run all tests: `pnpm vitest`.
- Run single file: `pnpm vitest path/to/file.test.ts`.
- Run single test: `pnpm vitest -t "case name"`.
- Debug async flakiness: `pnpm vitest --runInBand`.
- `tsconfig.json` excludes `**/*.test.ts` from builds.

## Linting & Formatting

- No ESLint config or lint script in repo.
- Formatting uses Prettier defaults unless file style indicates otherwise.
- Example: `pnpm exec prettier --write client/src/App.tsx`.

## TypeScript Configuration

- Strict mode enabled (`tsconfig.json`).
- Path aliases: `@/*` for client, `@shared/*` for shared.
- `allowImportingTsExtensions` and `moduleResolution: bundler` enabled.
- Prefer `import type { Foo }` for type-only imports.

## Imports

- Order: external libraries → internal absolute (`@/`, `@shared`) → relative.
- Separate import groups with blank lines when logical.
- Server-side ESM local imports must include `.js` extension.
- Prefer named imports over namespace imports unless file already uses namespace.

## Formatting Conventions

- 2-space indentation.
- Semicolons are used.
- Trailing commas are common in multiline objects/arrays.
- Quote style varies by folder; match the file you edit.
- Keep JSX readable; extract helpers instead of deep inline logic.

## Naming

- `PascalCase` for components, classes, interfaces, type aliases.
- `camelCase` for variables, functions, and hook exports.
- `SCREAMING_SNAKE_CASE` for global constants.
- Use descriptive names; avoid 1-letter identifiers outside loops.

## React + Client Code

- Function components and hooks only.
- Component filenames are `PascalCase.tsx`.
- Hooks live in `client/src/hooks` and use `useSomething.ts` naming.
- Use `cn` from `client/src/lib/utils.ts` for Tailwind class merging.
- Use `import.meta.env` for Vite env vars; guard missing values.
- `ErrorBoundary` exists; surface user-friendly messages for failures.
- Tailwind CSS v4 is used; group class lists (layout → spacing → color).
- Prefer reusable primitives in `client/src/components/ui`.

## Server Code

- Express routers live in `server/routes` and default-export `Router()` modules.
- Validate query params and fall back to safe defaults.
- Use `async`/`await` with try/catch; log errors and return JSON payloads.
- Keep SQL strings in module-level `const SQL = { ... }`.
- Use `queryOne`/`queryMany` from `server/db.ts` for DB access.
- Use `process.env` checks to enable/disable DB features.
- Use KST (`Asia/Seoul`) in date handling in routes.
- Server ESM local imports must include `.js`.

## Error Handling Patterns

- Server: `console.error` then `{ error, message }` JSON payload.
- Client: convert unknown errors to friendly strings.
- Prefer early returns for invalid input to reduce nesting.
- Keep error messages stable for UI display.

## Data & Types

- Define API response shapes near routes/hooks.
- Keep derived fields (formatted values, percentages) in handlers or hooks.
- Use `number | null` for optional numeric fields; avoid `undefined` in payloads.
- Use `Array<...>` or `...[]` consistently within a file.

## Comments & Docs

- Server routes and hooks often use section headers: `// ============================================`.
- Inline comments are for non-obvious logic; keep them concise.
- Korean comments are present; match tone/language when editing nearby.

## Build Flow Notes

- `pnpm build` runs Vite build then bundles `server/index.ts` with esbuild.
- Client output: `dist/public`.
- Server bundle output: `dist/index.js`.
- Do not edit `dist/` by hand; it is build output.

## Environment

- Server uses `.env` for DB and runtime config.
- `pnpm start` expects `dist/` and `.env` to be present.
- `DB_SSL=true` enables SSL with `rejectUnauthorized=false`.
- Query helpers accept `string | number | boolean | null | Date`.

## Cursor/Copilot Rules

- No `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md` found.
- If any are added later, treat them as higher-priority instructions.

## PR / Commit Expectations

- Do not commit or push unless explicitly asked.
- Keep changes scoped and minimal.

## When Unsure

- Prefer existing patterns in the nearest file.
- Ask for clarification before introducing new libraries or tooling.
