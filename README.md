# AXIS — Aviation Solutions Permit Workflow System

A full-stack port of the AXIS/ECAA permit-workflow prototype (`axis-permits-system-v20.html`) into a
real, deployable, multi-user web application for Air Cairo's permit operations team.

- **`/backend`** — Node.js + Express + TypeScript API, PostgreSQL via Prisma, JWT auth, local file storage.
- **`/frontend`** — React + Vite + TypeScript SPA, styled with the prototype's original CSS
  (`frontend/src/styles/legacy.css`, copied verbatim) so the visual design (colors, spacing, layout,
  components) matches the reference file exactly.

## What's implemented

- Roles: Specialist, Manager, ECAA, Admin, with the same permission rules as the prototype
  (`isManager`, `isECAA`, `isAdmin`, `canEditApplications`, `canPrintApplication`, `canUploadEcaaApproval`).
- Self-registration → Admin approval → login, with hashed passwords, JWT session cookies, "remember me",
  and secure forgot-password (a new temp password is generated server-side and emailed — never
  displayed in the UI, unlike the original demo).
- All 12 application types from `FORM_TYPES` (Charter, Urgent Charter, ACMI, Domestic, Season Schedule,
  etc.), including the Travel Program sub-form attached to Charter / Urgent Charter.
- The exact workflow state machine:
  `Pending Manager Approval → Manager Changes Requested ⇄ → Manager Approved → Waiting ECAA Approval
  → ECAA Changes Requested ⇄ → ECAA Approved`, plus `Cancelled`.
- The **Electronic Signature Approval** toggle in Admin Settings, gating the automatic e-signature
  path (Manager approval auto-stamps and jumps straight to the ECAA queue) vs. the manual print /
  physical-stamp / upload path (default, OFF) — including the fallback to manual when no Company
  Signature has been uploaded yet.
- Manager Approval queue, ECAA Review queue, live notification dropdowns (polled), the ECAA Approvals
  Archive sidebar tree (grouped by season / country / month, matching the original's grouping logic).
- Dashboard KPIs, approval pipeline, status distribution, top countries, by application type.
- Records/Search, Edit/Cancel (Lookup), Activity Log (Admin only, matching the original's sidebar
  visibility rules).
- Admin Settings: Electronic Signature toggle, Company Signature upload, User Management (approve/
  reject/role/activate/deactivate), Fleet (owned + ACMI + named Special Aircraft tables), Countries,
  Domestic Airports.
- Print/Download hides all internal workflow elements (comments, action buttons, status banners) —
  only the official letter content, approval number, and signatures are ever in the printed output.

### Known simplifications vs. the prototype

These don't affect the workflow's correctness, only some cosmetic/UX polish:
- Search & Records matches whole records (via a search over each application's stored fields) rather
  than surfacing the exact matching flight-leg row the way the original's `recordFlightEntries` did.
- The "Travel Program" pages are generated the same way as the original (contacts you enter once,
  flight legs pulled automatically from flight rows 1 and 2), but the `travelPages`/"travel"-style form
  code path in the prototype was already dead code (no `FORM_TYPES` entry used it) and was not ported.

## Architecture

- **Database**: PostgreSQL, schema in `backend/prisma/schema.prisma`. Applications store their
  type-specific fields (flight rows, meta, travel program, etc.) as a JSON `data` column — deliberately,
  since the reference app's own form model is itself dynamic per `FORM_TYPES` config — while workflow
  state (status, approver, timestamps, notes) are first-class columns so they can be queried/indexed.
- **Auth**: bcrypt-hashed passwords, JWT in an httpOnly cookie (`axis_token`), role stored in the token
  and re-checked against the DB on every request. Every route enforces the same role rules as the
  frontend — the frontend hiding a button is UX only, never the security boundary.
- **Files**: uploaded to local disk (`backend/uploads/`, configurable via `UPLOAD_DIR`) and served at
  `/uploads/...`; the DB stores only the URL + metadata. Swap `backend/src/middleware/upload.ts` for an
  S3-compatible client to move to object storage without touching route logic.
- **Notifications**: polled every 20s from the frontend (`AppDataContext`) rather than websockets, to
  keep the deployment footprint small — swap in a websocket/SSE push in
  `frontend/src/context/AppDataContext.tsx` if real-time is required.

## Local development

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ (or use `docker compose up db`)

### 1. Backend

```bash
cd backend
cp .env.example .env        # edit DATABASE_URL / JWT_SECRET / SEED_ADMIN_* as needed
npm install
npx prisma migrate dev      # creates the schema
npm run seed                # creates the first Admin account + default reference data
npm run dev                 # starts the API on http://localhost:4000
```

The seed script prints the first Admin's email/password (defaults to
`admin@aircairo.com` / `ChangeMe123!` — **change this immediately after first login** via
My Account Settings, or set `SEED_ADMIN_PASSWORD` before seeding).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # starts Vite on http://localhost:5173, proxying /api and /uploads to :4000
```

Open http://localhost:5173 and sign in with the seeded Admin account.

### 3. Manual test pass

- Register a second account → sign in as Admin → Admin Settings → approve it with a role.
- Create an application (New Request) → Generate Form → it lands in the Manager Approval queue.
- As a Manager (or Admin, which carries Manager rights): Approve it.
  - **Toggle OFF (default)**: status becomes `Manager Approved`. Print the application, then use the
    Approval No. field + "Upload ECAA approval" to finalize it directly to `ECAA Approved` — no ECAA
    login required.
  - **Toggle ON** (Admin Settings, after uploading a Company Signature): approving jumps straight to
    `Waiting ECAA Approval` with the signature auto-stamped. Sign in as an ECAA user, review the
    application, enter an Approval No., and Approve.
- Confirm notification badges (bell icons) update for the relevant roles, and that
  Download/Print of an ECAA Approved application never shows internal status banners or comments.

## Production build

```bash
# backend
cd backend && npm run build && npx prisma migrate deploy && npm run seed && node dist/server.js

# frontend
cd frontend && npm run build   # outputs static files to frontend/dist
```

Serve `frontend/dist` from any static host (Nginx, etc.) and reverse-proxy `/api/*` and `/uploads/*`
to the backend on the same origin — the frontend calls those as relative paths, no build-time API URL
needed. `frontend/nginx.conf` + `frontend/Dockerfile` do exactly this.

### Docker Compose

```bash
docker compose up --build
```

Brings up Postgres, the backend (migrating + seeding on boot), and the frontend behind Nginx.
**Change every default secret/password in `docker-compose.yml` before using this outside local dev.**

### Deploying behind Nginx + PM2 on a VPS (without Docker)

1. Provision PostgreSQL, create a database + user.
2. `cd backend && npm ci && npm run build && npx prisma migrate deploy && npm run seed`
3. Run the API with PM2: `pm2 start dist/server.js --name axis-api`
4. `cd frontend && npm ci && npm run build`
5. Point Nginx's `root` at `frontend/dist`, `try_files $uri /index.html`, and reverse-proxy
   `/api/` and `/uploads/` to `http://127.0.0.1:4000` (see `frontend/nginx.conf` for the exact rules).
6. Put both behind TLS (e.g. Let's Encrypt via certbot).

## Environment variables

See `backend/.env.example` for the full list (`DATABASE_URL`, `JWT_SECRET`, `UPLOAD_DIR`, mailer
settings, etc.). The frontend needs none at build time — see `frontend/.env.example`.

## Repository structure

```
/backend
  prisma/schema.prisma   Database schema
  prisma/seed.ts         First-Admin + reference-data seed script
  src/routes/            REST API (auth, applications, workflow, admin, settings, reference)
  src/middleware/        Auth (JWT) + file upload (multer) middleware
  src/lib/                Shared constants (FORM_TYPES etc.), workflow helpers
/frontend
  src/pages/              One component per screen (Dashboard, NewApplication, Preview, ...)
  src/components/Shell/   Sidebar, header, notification panels, ECAA archive tree
  src/context/            Auth + polled app-wide data (settings, notifications, queue counts)
  src/styles/legacy.css   The prototype's CSS, copied verbatim
  public/assets/          Logo / aircraft images, extracted from the prototype's embedded base64
```
