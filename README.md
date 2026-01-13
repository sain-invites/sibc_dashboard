# Service Overview Dashboard

A professional executive dashboard for the Invites Loop service, providing real-time insights into user activity, routine completion, and LLM operation metrics. Built with a modern full-stack TypeScript architecture.

## Overview

This dashboard serves as a central hub for monitoring service health and user engagement. It aggregates data from PostgreSQL to visualize critical KPIs, user behavior trends, and operational costs associated with LLM integrations.

## Features

- Executive KPI dashboard for total users, DAU/WAU/MAU, and average events per user.
- Operational metrics for LLM call volume, error rates, and USD costs by model/type.
- Routine analytics for daily/weekly generation and completion trends.
- User directory with search, pagination, and activity indicators.
- User 360 view with profile, chat history, routines, and operational signals.
- Global date range filtering across dashboard and detail views.

## Tech Stack

- Frontend: React 19, Vite, Tailwind CSS v4, Recharts, Radix UI, Wouter.
- Backend: Express (Node.js), PostgreSQL (`pg`), TypeScript.
- Tooling: pnpm, esbuild (server bundling), Prettier, TSX.

## Project Structure

```text
├── client/          # React application (Vite root)
│   ├── src/
│   │   ├── components/ # UI components (KPIs, Charts, UserTable)
│   │   ├── pages/      # Home, User360, NotFound
│   │   └── lib/        # Utilities and hooks
├── server/          # Express API
│   ├── routes/      # Overview, Users, and User360 endpoints
│   ├── db.ts        # PostgreSQL connection pool and helpers
│   └── index.ts     # Server entry point
├── shared/          # Shared TypeScript types and constants
└── dist/            # Production build output (client + server)
```

## Setup

### Prerequisites

- Node.js (latest LTS)
- pnpm
- PostgreSQL instance (optional for live data)

### Install

```bash
pnpm install
```

## Environment

Create a `.env` file in the repo root. This is required for the server to connect to the database.

```env
PORT=3001
DB_HOST=your_host
DB_PORT=5432
DB_NAME=invites_loop
DB_USER=your_user
DB_PASSWORD=your_password
DB_SSL=true
```

## Scripts

| Command        | Description                                                     |
| -------------- | --------------------------------------------------------------- |
| `pnpm dev`     | Starts Vite dev server for the client UI.                       |
| `pnpm build`   | Builds client static files and bundles the server into `dist/`. |
| `pnpm start`   | Runs production server from `dist/` (requires `.env`).          |
| `pnpm preview` | Previews the client production build.                           |
| `pnpm check`   | Runs TypeScript type checking across the project.               |
| `pnpm format`  | Formats all files using Prettier.                               |

## Data Sources & Fallback

- Primary data source: PostgreSQL database.
- CSV fallback mode is supported when database configuration is missing, depending on server configuration.

## Development Notes

- Path aliases: `@/*` for client source and `@shared/*` for shared code.
- Use `import type` for type-only imports to keep ESM builds clean.
- Styling is managed via Tailwind CSS v4; shared styles live in `client/src/index.css`.
