# DE Relationship Mapper + PII Risk Scanner — Technical Spec (MVP)

## Summary
Governance and visibility tool for Salesforce Marketing Cloud (SFMC) to map Data Extensions (DEs), detect PII exposure, identify orphan/unused DEs, and compute risk scores surfaced in a Next.js dashboard. Backend performs metadata extraction via SFMC REST API, applies PII rules and risk scoring, stores results in Supabase/Postgres.

## Architecture (MVP)
- Next.js 14 (App Router, TypeScript, Tailwind CSS)
- API routes (server actions/route handlers) for scans and data retrieval
- Node.js workers (in-route or queued later) for: Metadata Extractor → PII Scanner → Usage Resolver → Risk Scoring Engine
- Supabase/Postgres for registry persistence (accessed via Prisma ORM)
- OAuth 2.0 (via NextAuth) for basic login; can be disabled in dev with `AUTH_DISABLED=true`

Data flow:
SFMC REST API → Metadata Extractor → PII Scanner → Usage Resolver → Risk Scoring → Persist to Supabase → Dashboard reads & filters.

## Entities & DB Schema (Prisma)
- de
  - id (string, SFMC CustomerKey or synthetic UUID)
  - name (string)
  - externalKey (string | null)
  - folderPath (string | null)
  - lastReferencedAt (Date | null) — from queries/sends/automations
  - isOrphan (boolean, derived)
  - riskScore (int 0-100)
  - createdAt, updatedAt
- de_field
  - id (uuid)
  - deId (fk → de)
  - name (string)
  - dataType (enum: Text, Email, Phone, Number, Date, Bool, Unknown)
  - isPII (boolean)
  - piiType (enum: Email, Phone, FirstName, LastName, SSN, Address, DOB, Other | null)
  - sensitivityScore (int 0-100)
- de_relationship
  - id (uuid)
  - fromDeId (fk → de)
  - toDeId (fk → de)
  - relationType (enum: Lookup, PrimaryKey, ForeignKey, Join, Unknown)
- scan_job
  - id (uuid)
  - status (enum: queued, running, success, failed)
  - startedAt, completedAt
  - error (string | null)
  - stats (json: counts, durations)

## API Endpoints (MVP)
- POST /api/scan/start
  - Starts a scan job. Returns { jobId }.
- GET /api/scan/status?jobId=...
  - Returns job status and stats.
- GET /api/registry/stats
  - Returns aggregated metrics: total DEs, PII fields, orphan count, risk distribution.
- GET /api/registry/des
  - Paginated list with filters (search, risk range, orphan flag).
- GET /api/registry/des/[id]
  - Details for a DE with fields, PII annotations, relationships, risk breakdown.

## PII Detection (rule-based v1)
Heuristics by field name and data type; extendable rules engine.
- Name patterns: email, e-mail, mail, phone, mobile, msisdn, first(name), last(name), given, family, dob, birth, ssn, sin, address, street, city, postcode, zip
- Data type hints: EmailAddress, Locale, Phone, Date
- Regex validators for actual sample values (optional future step)
- Output: isPII, piiType, sensitivity score per field

## Usage Resolution (v1)
- Use SFMC metadata to infer lastReferencedAt
- If no reference > N days (configurable, default 90), mark `isOrphan=true`
- Future: query SFMC Data Views to compute actual touches

## Risk Scoring (v1)
Score 0-100 combining:
- PII surface (number and sensitivity of PII fields)
- Orphan status (adds risk if PII present and unused)
- Relationship exposure (joins to high-risk DEs)
- Simple formula (tunable):
  - base = min(100, sum(field.sensitivityScore)/2)
  - if isOrphan add +15
  - if hasEmail add +10, if hasPhone add +5, if hasDOB add +10
  - clamp 0..100

## UI (Next.js Dashboard)
Pages:
- / (Summary Dashboard): KPIs, charts, risk distribution, orphan count, quick filters
- /des (Table): list view with search, filters (risk range, isOrphan, hasPII)
- /des/[id] (Detail): DE fields with PII flags, relationships, risk breakdown

## Authentication
- NextAuth OAuth 2.0 (e.g., GitHub/Google) or disabled in dev via env flag
- Protect dashboard routes by default (unless AUTH_DISABLED=true)

## Configuration & Secrets
- .env
  - NEXTAUTH_SECRET
  - NEXTAUTH_URL
  - AUTH_DISABLED=true (dev)
  - DATABASE_URL=postgres://...
  - SFMC_CLIENT_ID=...
  - SFMC_CLIENT_SECRET=...
  - SFMC_AUTH_BASE_URL=...
  - SFMC_REST_BASE_URL=...
  - SFMC_ACCOUNT_ID=...

## Success Criteria (from PRD)
- 30% reduction in unused DEs within 30 days (measured by orphan count drop)
- 95% accuracy in PII detection (monitored via manual spot checks and rule precision)
- 100% DE visibility via risk scoring (coverage metric)
- 25% faster debugging cycles (self-reported + time-to-resolution)
- DPIA compliance readiness in 60 days (export in Phase 2)

## Risks & Assumptions
- SFMC API rate limits and credentials availability
- Limited data views access may reduce accuracy for `lastReferencedAt`
- MVP uses heuristics; may require tuning per org

## Phase 2 (out of MVP)
- Graph visualization of DE relationships
- RBAC auditing
- Auto-remediation recommendations
- DPIA export
- Conversational UI
