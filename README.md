# DERA — DE Relationship Mapper + PII Risk Scanner (MVP)

Next.js + TypeScript dashboard that maps Salesforce Marketing Cloud Data Extensions, flags PII exposure, detects orphans, and scores risk. Stores results in Postgres (Supabase-compatible) via Prisma.

## Stack
- Next.js 14 (App Router), Tailwind CSS
- Prisma ORM with Postgres
- Optional OAuth 2.0 (NextAuth) — disabled in dev by `AUTH_DISABLED=true`
- Vitest for unit tests

## Setup (macOS, zsh)

1) Install dependencies
```bash
npm install
```

2) Copy env and adjust as needed
```bash
cp .env.example .env
```

Minimal env for first run (uses sample data if SFMC/DB not set):
- AUTH_DISABLED=true (skip login)
- NEXTAUTH_URL=http://localhost:3000
- NEXTAUTH_SECRET=replace-me

To enable OAuth login (optional):
- Set GITHUB_ID, GITHUB_SECRET
- Set AUTH_DISABLED=false

3) Setup database (local Postgres or Supabase) and run migrations
```bash
npm run prisma:generate
npm run prisma:migrate
```

4) Dev server
```bash
npm run dev
```
Visit http://localhost:3000

If port 3000 is in use, the dev server will switch to 3001 automatically; use the shown URL.

## Tests
```bash
npm test
```

## Notes
- API routes return fallback sample data when DB or SFMC is not configured yet so you can explore the UI immediately.
- Implement SFMC OAuth and REST calls in `src/lib/sfmcClient.ts` following your org’s credentials.
	- Also set SOAP base URL for live Data Extension metadata: `SFMC_SOAP_BASE_URL=https://<subdomain>.soap.marketingcloudapis.com`

### Key routes
- /des — DE inventory (includes Analyze links)
- /des/[id] — DE details
- /mindmap?deKey=... — Interactive mind map (React Flow)

### APIs per PRD
- GET /api/de/inventory — all DEs with PII summary and risk
- GET /api/de/:deKey — DE fields and risk
- GET /api/de/mindmap?deKey=... — lineage graph JSON
- GET /api/de/mindmap/export?deKey=...&format=json — download JSON
- POST /api/risk/score — compute risk (from fields or deKey)
- POST /api/sfmc/sync — trigger scan orchestration

### Auth
- NextAuth (GitHub) is available at /api/auth/*
- Middleware protects pages when `AUTH_DISABLED=false`; APIs remain accessible.

## Health check
```bash
curl -s http://localhost:3000/api/health | jq
```
It returns `hasDB` and `hasSFMC` booleans so you can quickly verify env readiness.

## CI
GitHub Actions workflow at `.github/workflows/ci.yml` runs install, lint, typecheck, test, and build.