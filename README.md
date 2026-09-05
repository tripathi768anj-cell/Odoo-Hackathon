# DealFlow360

**An intelligent, self-governing sales-operations platform** — built for the Odoo Hackathon 2026.

DealFlow360 goes beyond a quote-to-invoice form. It is a self-governing deal engine that enforces
pricing discipline, reacts to inventory reality in real time, keeps subscriptions and one-time
sales reconciled on a single order, and turns a quotation into a living, negotiable document
instead of a static PDF.

> Full problem statement: [`Problem Statement/PS.md`](Problem%20Statement/PS.md)

---

## Table of contents

- [Feature overview](#feature-overview)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Scripts reference](#scripts-reference)
- [Seed data & demo logins](#seed-data--demo-logins)
- [Testing](#testing)
- [Deployment](#deployment)
  - [1. Provision the database (Neon)](#1-provision-the-database-neon)
  - [2. Deploy the backend API](#2-deploy-the-backend-api)
  - [3. Deploy the frontend](#3-deploy-the-frontend)
  - [4. Wire the two together (CORS & cookies)](#4-wire-the-two-together-cors--cookies)
  - [Rollback](#rollback)
- [Documentation map](#documentation-map)

---

## Feature overview

| Module | What it does |
| --- | --- |
| **Multi-tier discount governance** | Per-tier and per-category discount ceilings; every quote line is checked against its own limit. |
| **Blended risk score & approval routing** | A quote is auto-routed to Sales Manager, then Finance, based on a blended discount-risk score across all lines. |
| **Live upsell / cross-sell** | Ranked suggestions with real-time margin delta while the quote is being built. |
| **Multi-warehouse fulfillment** | Auto-splits an order across warehouses by live stock to minimise shipments, with manual override and backorder consolidation. |
| **Hybrid billing** | One order can mix one-time products and recurring subscription lines, each with correct proration and billing schedules. |
| **Deal health monitoring** | Dashboard of stalled deals, discount anomalies, and delivery-promise slippage, with one-click nudge/escalation. |
| **Customer portal negotiation** | A real, separate, restricted customer view for line-level comments and counter-offers; re-enters approval automatically if terms move past threshold. |
| **Reporting** | Sales/quote/order reports filtered by period, team, rep, approval status, product, and category. |

---

## Architecture

```
┌─────────────────────────┐        HTTPS / JSON            ┌──────────────────────────────┐
│   Next.js 16 frontend   │  ───────────────────────────▶  │   Express 5 API  (/api/v1)   │
│   (App Router, React 19)│  ◀───────────────────────────  │   TypeScript · ESM · Zod     │
│                         │   Bearer access JWT (memory)   │                              │
│  app/(app)/*  workspace │   httpOnly refresh cookie      │  domain services + RLS       │
│  app/customer-portal    │   Server-Sent Events (/events) │  OpenAPI 3.1 (generated)     │
└─────────────────────────┘                                └──────────────┬───────────────┘
                                                                          │ pooled (runtime)
                                                                          │ unpooled (migrations)
                                                                          ▼
                                                              ┌──────────────────────────┐
                                                              │   Neon PostgreSQL        │
                                                              │   Drizzle ORM + SQL      │
                                                              │   migrations, row-level  │
                                                              │   security per tenant    │
                                                              └──────────────────────────┘
```

- **Money, totals, margin, risk, approvals, availability and proration are computed on the server only.**
  The frontend renders server values and `availableActions`; it never calculates truth.
- **Auth:** short-lived access JWT sent as `Authorization: Bearer` from memory; rotation via an
  opaque, httpOnly refresh-cookie session stored in Postgres. No tokens in `localStorage`.
- **Multi-tenant:** every internal route is tenant-scoped; Postgres row-level security is the backstop.
- **Realtime:** authenticated, tenant-scoped SSE at `GET /api/v1/events`; the client refetches the
  named entity after each event.

---

## Tech stack

| Concern | Choice |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Framer Motion, lucide-react, jsPDF |
| API runtime | Node.js 22+, Express 5, TypeScript (strict, ESM) |
| Database | Neon PostgreSQL (pooled URL at runtime, unpooled URL for migrations) |
| DB access | `drizzle-orm` + `drizzle-kit`, checked-in SQL migrations, raw SQL for locks/RLS |
| Validation & contract | `zod` + `@asteasolutions/zod-to-openapi` (OpenAPI 3.1 + Swagger UI) |
| Auth | `argon2` (Argon2id) password hashing, `jsonwebtoken` access tokens, DB refresh sessions |
| Logging | `pino` / `pino-http` (structured JSON, secrets redacted) |
| Security | `helmet`, `cors` allow-list, `express-rate-limit`, `cookie-parser` |
| Tests | Vitest + Supertest (unit / integration / contract) |
| Tooling | ESLint + Prettier |

---

## Repository layout

```
.
├── app/                       # Next.js frontend (App Router)
│   ├── (app)/                 #   authenticated sales workspace (dashboard, quotes, approvals, …)
│   ├── customer-portal/       #   customer-facing negotiation view
│   ├── login/ register/ …     #   public auth screens
│   └── lib/
│       ├── api-client.ts      #   typed fetch client for /api/v1
│       └── auth-context.tsx   #   session bootstrap + refresh
├── proxy.ts                   # Next 16 edge middleware (route-guard redirect)
├── next.config.mjs
├── package.json               # frontend package (name: dealflow360-next-prototype)
│
├── backend/                   # Express 5 API
│   ├── src/
│   │   ├── index.ts           #   process entrypoint (validates env, listens)
│   │   ├── app.ts             #   app assembly, middleware, route mounting
│   │   ├── config/env.ts      #   Zod-validated environment contract
│   │   ├── api/v1/*.routes.ts #   versioned HTTP routes
│   │   ├── domain/            #   business logic (quotes, billing, fulfillment, health, reports)
│   │   ├── db/
│   │   │   ├── schema/        #   Drizzle table definitions by domain
│   │   │   ├── migrations/    #   generated, checked-in SQL
│   │   │   ├── migrate.ts     #   explicit migration command (never on app startup)
│   │   │   └── seed.ts        #   idempotent demo data
│   │   └── openapi/           #   OpenAPI generation & endpoint
│   └── package.json           # backend package
│
├── docs/                      # Authoritative design docs + runbooks (see Documentation map)
├── plans/                     # Phased implementation plan (phase 00 → 10)
└── Problem Statement/         # Hackathon problem statement + flow diagram
```

---

## Prerequisites

- **Node.js 22 or newer** and npm 10+
- A **Neon** PostgreSQL project (free tier is fine for dev/demo) — <https://neon.com>
- `openssl` (or any CSPRNG) to generate secrets

---

## Local development

The backend and frontend are separate npm packages. Run them in two terminals.

### 1. Backend API

```bash
cd backend
npm install

# create your local env file
cp .env.example .env
#  → set DATABASE_URL and DATABASE_URL_UNPOOLED from the Neon dashboard
#  → set JWT_ACCESS_SECRET and SESSION_PEPPER to two different random values:
#       openssl rand -base64 48        # run twice
#  → set APP_ORIGIN and PORTAL_ORIGIN to the frontend origin (see note below)

npm run db:migrate     # apply schema to your Neon branch (uses the unpooled URL)
npm run db:seed        # optional: load demo tenants, users, catalogue
npm run dev            # tsx watch → http://localhost:4000
```

Health check: `curl http://localhost:4000/healthz` → `{"status":"ok","app":"DealFlow360",…}`
API docs: `http://localhost:4000/api/v1/openapi.json`

### 2. Frontend

```bash
# from the repository root
npm install

# point the browser client at the API
printf 'NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1\n' > .env.local

npm run dev            # → http://localhost:3000
```

> **CORS note (important).** `next dev` serves on **port 3000**, but `backend/.env.example`
> ships `APP_ORIGIN=http://localhost:5173`. The API's CORS layer is a strict allow-list and the
> client sends credentials, so the origins must match exactly. Either:
> - set `APP_ORIGIN=http://localhost:3000` and `PORTAL_ORIGIN=http://localhost:3000` in `backend/.env`, **or**
> - run the frontend on 5173: `npm run dev -- -p 5173` (and set `NEXT_PUBLIC_API_URL` accordingly).

---

## Environment variables

### Frontend (`.env.local` at repo root)

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | yes | `http://localhost:4000/api/v1` | **Inlined at build time.** Must be set when `next build` runs. Include the `/api/v1` suffix. |

### Backend (`backend/.env` locally; secret store in deployment)

| Variable | Required | Notes |
| --- | --- | --- |
| `NODE_ENV` | yes | `development` \| `test` \| `production`. Production **fails closed** on missing/placeholder secrets. |
| `PORT` | no | Defaults to `4000`. |
| `DATABASE_URL` | prod: yes | Neon **pooled** connection string — used by the running API. |
| `DATABASE_URL_UNPOOLED` | migrations | Neon **direct** connection string — used only by `db:migrate` / `db:seed` / CI. Never used by the web process. |
| `JWT_ACCESS_SECRET` | prod: yes | High-entropy (≥16 chars, not a placeholder). `openssl rand -base64 48`. |
| `SESSION_PEPPER` | prod: yes | A **different** high-entropy value. |
| `APP_ORIGIN` | yes | Exact origin of the internal workspace frontend (scheme + host + port). CORS allow-list. |
| `PORTAL_ORIGIN` | yes | Exact origin of the customer portal frontend (may equal `APP_ORIGIN`). |
| `EMAIL_PROVIDER_API_KEY`, `EMAIL_FROM` | no | Unset → console email adapter (`backend/src/integrations/email/console.ts`). |
| `OBJECT_STORAGE_*` | no | R2/S3 for durable exports; unset → inline generation. |
| `PAYMENT_PROVIDER`, `PAYMENT_WEBHOOK_SECRET` | no | Manual payment recording only until a provider is wired. |
| `ERROR_TRACKING_DSN` | no | Recommended before staging. |

The contract is validated by Zod at boot in [`backend/src/config/env.ts`](backend/src/config/env.ts).

---

## Scripts reference

### Frontend (repo root)

| Script | Action |
| --- | --- |
| `npm run dev` | Next dev server (port 3000). |
| `npm run build` | Production build. |
| `npm run start` | Serve the production build (Node server; honours `PORT`). |
| `npm run check:prototype` | Static sanity check that all workspace routes exist. |

### Backend (`backend/`)

| Script | Action |
| --- | --- |
| `npm run dev` | `tsx watch src/index.ts` — reloads on change. |
| `npm run build` | `tsc` → compiles `src/` to `dist/` (entry `dist/index.js`). |
| `npm run start` | `tsx src/index.ts` — run TS directly (no build step needed). |
| `npm run db:generate` | Generate a new SQL migration from schema changes. |
| `npm run db:migrate` | Apply pending migrations (uses `DATABASE_URL_UNPOOLED`). |
| `npm run db:seed` | Load idempotent demo data. |
| `npm run build:openapi` | Export the OpenAPI document. |
| `npm run typecheck` / `lint` / `format` | Quality gates. |
| `npm test` / `test:unit` / `test:integration` / `test:contract` | Vitest suites. |

---

## Seed data & demo logins

`npm run db:seed` (in `backend/`) creates two tenants and demo users. Password for all: **`DemoPass123!`**

| Email | Role | Tenant |
| --- | --- | --- |
| `alice@acme.test` | admin | Acme Corp (`acme`) |
| `bob@acme.test` | rep | Acme Corp (`acme`) |
| `carol@globex.test` | admin | Globex Inc (`globex`) |
| `dave@globex.test` | rep | Globex Inc (`globex`) |

Seed data is for development/demo only — never run the seed against a production database.

---

## Testing

```bash
cd backend
npm run typecheck
npm run lint
npm run test:unit          # pure domain functions — no DB
npm run test:integration   # needs a disposable Neon branch in DATABASE_URL_UNPOOLED
npm run test:contract      # Zod/OpenAPI + Supertest response contracts
```

CI quality gate (run in order): `npm ci` → `typecheck` → `lint` → `test:unit` →
`test:integration` → `test:contract` → `build`. See [`docs/08-testing-operations.md`](docs/08-testing-operations.md).

---

## Deployment

The frontend and backend deploy independently. Recommended shape: **frontend on a Next-aware
host (Vercel, or any Node host), backend on a Node host with a persistent process
(Render / Railway / Fly.io / a VPS), database on Neon.**

Pre-flight checklist (from [`docs/runbooks/01-deploy-rollback.md`](docs/runbooks/01-deploy-rollback.md)):

- [ ] Target branch passes `typecheck`, `lint`, `test:unit`, `test:contract`, `build`.
- [ ] Pending DB migrations are backward-compatible with the currently running version (expand/contract).
- [ ] All required env vars are set in the target environment's secret store.
- [ ] A Neon point-in-time branch / backup timestamp is recorded before any DDL change.

### 1. Provision the database (Neon)

1. Create a **separate Neon project** for production (do not reuse the dev project).
2. From the dashboard copy both strings for the production branch:
   - **pooled** → `DATABASE_URL`
   - **direct / unpooled** → `DATABASE_URL_UNPOOLED`
3. Keep both strings only in the deployment secret store — never in Git, chat, or screenshots.

### 2. Deploy the backend API

**Environment** — set in the host's secret manager:

```bash
NODE_ENV=production
PORT=4000                                  # or whatever the host injects
DATABASE_URL=postgresql://…pooled…
DATABASE_URL_UNPOOLED=postgresql://…direct…
JWT_ACCESS_SECRET=$(openssl rand -base64 48)
SESSION_PEPPER=$(openssl rand -base64 48)   # different value
APP_ORIGIN=https://app.yourdomain.com       # deployed frontend origin, exact
PORTAL_ORIGIN=https://app.yourdomain.com    # portal origin (same or separate)
# optional: EMAIL_*, OBJECT_STORAGE_*, PAYMENT_*, ERROR_TRACKING_DSN
```

`NODE_ENV=production` makes env validation **fail closed**: a missing or placeholder
`JWT_ACCESS_SECRET` / `SESSION_PEPPER` / `DATABASE_URL` aborts boot.

**Run database migrations once, before starting the new version** — always with the unpooled URL,
never on web-server startup:

```bash
cd backend
npm ci
DATABASE_URL="$DATABASE_URL_UNPOOLED" npm run db:migrate
# verify it exits 0 — if it fails, STOP the deploy
```

**Build & start:**

```bash
cd backend
npm ci
npm run build                 # tsc → dist/
node dist/index.js            # production start (compiled)
```

- The npm `start` script (`tsx src/index.ts`) also works and skips the build step; the compiled
  `node dist/index.js` path is preferred for production.
- Configure the host's **health check** to `GET /healthz` (liveness). `GET /readyz` is the
  readiness probe.
- Platform notes:
  - **Render / Railway / Fly.io:** root directory `backend/`, build `npm ci && npm run build`,
    start `node dist/index.js`, pre-deploy/release command
    `DATABASE_URL="$DATABASE_URL_UNPOOLED" npm run db:migrate`.
  - **Docker:** `node:22-slim` base, `npm ci`, `npm run build`, `CMD ["node","dist/index.js"]`,
    run the migrate command as a one-off job in the release pipeline.
- Do **not** run `npm run db:seed` against production.

**Verify:**

```bash
curl -f https://api.yourdomain.com/healthz              # 200 {"status":"ok","app":"DealFlow360"}
curl -f https://api.yourdomain.com/readyz               # 200 {"status":"ok",…}
curl -f https://api.yourdomain.com/api/v1/openapi.json  # 200 application/json
```

### 3. Deploy the frontend

The frontend is a standard Next.js 16 App-Router app — deploy as a **Node.js server**
(`next build` + `next start`). `proxy.ts` (edge route-guard) requires a server runtime, so a
plain static export is not sufficient.

**Set the build-time env var** (it is inlined into the bundle — it must be present when
`next build` runs, changing it later requires a rebuild):

```bash
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
```

**Build & start:**

```bash
# from repo root
npm ci
npm run build
npm run start        # Node server; set PORT / -p as the host requires
```

- **Vercel:** import the repo, framework auto-detected as Next.js, root directory = repo root,
  add `NEXT_PUBLIC_API_URL` as an environment variable, deploy. No extra config needed.
- **Other Node hosts (Render / Railway / Fly / Docker):** build `npm ci && npm run build`,
  start `npm run start`, expose `PORT`.
- **Docker:** for a minimal image, add `output: "standalone"` to `next.config.mjs` and copy
  `.next/standalone` + `.next/static` + `public` into a `node:22-slim` runtime image.

### 4. Wire the two together (CORS & cookies)

The browser client calls the API cross-origin with `credentials: "include"` and relies on an
httpOnly refresh cookie. For this to work in production:

1. The backend `APP_ORIGIN` / `PORTAL_ORIGIN` must be the **exact** deployed frontend origin(s)
   (scheme + host, no trailing slash). The CORS layer echoes only allow-listed origins and the
   404/preflight path depends on it. Update these and redeploy the backend **after** the
   frontend URL is known.
2. Both frontend and API must be served over **HTTPS**.
3. Cross-site cookies need `SameSite=None; Secure`. Hosting the API and frontend on the **same
   registrable domain** (e.g. `app.yourdomain.com` + `api.yourdomain.com`) avoids third-party
   cookie friction — strongly recommended.
4. `NEXT_PUBLIC_API_URL` on the frontend must point at the API's `/api/v1` base.

Order of operations for a first production cut:
deploy API (with a placeholder origin) → deploy frontend → set real `APP_ORIGIN`/`PORTAL_ORIGIN`
on the API → redeploy API → smoke-test login end to end.

### Rollback

- **Application:** redeploy the previous known-good commit/image; confirm `/healthz` and
  `/readyz` return `200`.
- **Database:** migrations follow expand/contract, so rolling back application code does **not**
  require rolling back schema. **Never** run `DROP TABLE` / `DROP COLUMN` in a panic rollback —
  write a corrective migration instead ([`docs/runbooks/02-migration-repair.md`](docs/runbooks/02-migration-repair.md)).

---

## Documentation map

| Path | Read it for |
| --- | --- |
| [`Problem Statement/PS.md`](Problem%20Statement/PS.md) | The hackathon brief, roles, flows, and the blended risk score explained. |
| [`docs/README.md`](docs/README.md) | Index of the authoritative design docs. |
| [`docs/FRONTEND_API.md`](docs/FRONTEND_API.md) | The frontend ⇄ API contract (endpoints, envelopes, error codes, SSE). |
| [`docs/02-technology-decisions.md`](docs/02-technology-decisions.md) | Why each library/service was chosen; dependency discipline. |
| [`docs/03-backend-architecture.md`](docs/03-backend-architecture.md) | Server code structure, domain services, error handling. |
| [`docs/04-tenancy-auth-security.md`](docs/04-tenancy-auth-security.md) | Organizations, identity, permissions, portal access, RLS. |
| [`docs/05-database-design.md`](docs/05-database-design.md) | Schema, migrations, money handling, data lifecycle. |
| [`docs/06-domain-workflows.md`](docs/06-domain-workflows.md) | Quotes, discounts, approvals, negotiation, inventory, billing, health. |
| [`docs/08-testing-operations.md`](docs/08-testing-operations.md) | Test layers, CI gate, monitoring, release gate. |
| [`docs/runbooks/`](docs/runbooks/) | Deploy/rollback, migration repair, outbox replay, session revocation, inventory correction, export recovery, Neon restore. |
| [`plans/PHASES.md`](plans/PHASES.md) | The phased build plan (phase 00 → 10). |
