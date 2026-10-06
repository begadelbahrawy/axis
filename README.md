# AXIS — Air Cairo ECAA Permit Approvals

Full-stack permit-workflow system for creating, approving and archiving Air
Cairo's flight-permit applications through Manager and ECAA approval. React +
Vite frontend, Node/Express/Prisma/PostgreSQL backend.

## Repository layout

```
backend/    Express API + Prisma/PostgreSQL
frontend/   React + Vite SPA
e2e/        Playwright end-to-end tests (drive the two apps above over HTTP)
docker-compose.yml   db + backend + frontend (nginx), for local or production use
```

## Local development

Prerequisites: Node 20+, a local PostgreSQL 16 instance (or run `docker compose up db` for just the database).

1. **Database.** Create two databases (dev and test):
   ```bash
   createdb axis
   createdb axis_test
   ```
2. **Backend.**
   ```bash
   cd backend
   cp .env.example .env     # edit DATABASE_URL / JWT_SECRET / SEED_ADMIN_* as needed
   npm install
   npx prisma migrate deploy
   npx prisma db seed       # creates the first Admin from SEED_ADMIN_* — no other accounts/data
   npm run dev               # http://localhost:4000
   ```
3. **Frontend.**
   ```bash
   cd frontend
   npm install
   npm run dev               # http://localhost:5173, proxies /api and /uploads to :4000
   ```
4. Sign in at `http://localhost:5173/login` with the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you set, then use Admin Settings → User Management to approve further registrations with a role.

## Tests

**Backend unit + API integration (Vitest + Supertest):**
```bash
cd backend
createdb axis_test     # once, matching TEST_DATABASE_URL in .env
npx prisma migrate deploy --schema prisma/schema.prisma   # against TEST_DATABASE_URL, or just let `npm test` apply it the first time
npm test
```
`npm test` runs every unit test (text builders) and integration test (auth,
rate-limiting/lockout, password reset, the full applications/workflow API
including real concurrent Request No. allocation and the creator-only delete
403 matrix) against `TEST_DATABASE_URL`, truncating tables between tests —
never point it at a database with real data.

**End-to-end (Playwright):** the backend and frontend dev servers (or the
docker-compose stack) must already be running at `:4000`/`:5173`:
```bash
cd e2e
npm install
E2E_ADMIN_PASSWORD=<your SEED_ADMIN_PASSWORD> npx playwright test
```
This covers all 10 end-to-end scenarios from the build spec: registration →
approval → login/role enforcement; preview-before-confirm with atomic Request
No. allocation; the esig-OFF manual path; the esig-ON auto-sign path
(including its no-signature fallback and a full ECAA-changes-requested
round-trip); round-trip PAX/POS/FRY purposes; Travel Program's multi-select
A/C type; editing leaving the original untouched until Confirm; creator-only
cancel/delete; print/download output purity and RTL rendering; and the full
role matrix with forbidden direct API calls returning 403.

**Type-checking, lint, production build (both apps):**
```bash
cd backend  && npx tsc --noEmit && npm run lint && npm run build
cd frontend && npx tsc --noEmit && npm run lint && npm run build
```

## Production build & deployment (Docker Compose)

1. On the server, clone the repo and copy the root env file:
   ```bash
   cp .env.example .env
   ```
   Edit `.env`: set a strong `POSTGRES_PASSWORD`, a random `JWT_SECRET`
   (`openssl rand -hex 32`), `CORS_ORIGIN` to your public domain
   (`https://permits.example.com`), and `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`
   for the one Admin account that will be created on first boot.
2. Build and start everything:
   ```bash
   docker compose up --build -d
   ```
   The backend container's entrypoint runs `prisma migrate deploy` then the
   idempotent seed (first Admin + default master data only — no demo
   accounts/applications) automatically before the server starts; this is
   safe to run on every restart. The site is published on `HTTP_PORT`
   (default `8080`).
3. **Put Nginx + Let's Encrypt in front of it** (recommended — the compose
   stack's own nginx serves plain HTTP on `HTTP_PORT` only):
   ```nginx
   # /etc/nginx/sites-available/permits.example.com
   server {
       listen 80;
       server_name permits.example.com;
       location / {
           proxy_pass http://127.0.0.1:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   ```bash
   sudo ln -s /etc/nginx/sites-available/permits.example.com /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d permits.example.com   # obtains + auto-renews the certificate
   ```
   Once HTTPS is live, set `CORS_ORIGIN=https://permits.example.com` in `.env`
   and `docker compose up -d` again to pick it up.

### Backups

The database and uploaded files live in two named Docker volumes
(`axis_db-data`, `axis_uploads` — prefixed with your compose project name).

```bash
# Database dump
docker compose exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > backup-db-$(date +%F).sql.gz

# Uploaded files
docker run --rm -v axis_uploads:/data -v "$PWD":/backup alpine \
  tar czf /backup/backup-uploads-$(date +%F).tar.gz -C /data .
```
Restore the equivalents with `gunzip | docker compose exec -T db psql ...` and
`tar xzf ... -C /data` into a fresh volume respectively. Schedule both via cron.

### Updating to a new version

```bash
git pull
docker compose up --build -d   # rebuilds changed images; the entrypoint re-runs
                                 # migrate deploy (safe/idempotent) before restart
```
Take a database backup first for anything beyond a trivial change. Rolling
back: `git checkout <previous-tag>` then `docker compose up --build -d` again —
Prisma migrations are additive/forward-only in this schema, so only roll back
application code, not a migration that already shipped.

## Security notes

See `backend/src/middleware/{auth,csrf,rateLimit,upload}.ts` and
`backend/src/lib/{crypto,loginAttempts}.ts` for the implementation of:
bcrypt password hashing, httpOnly JWT session cookies, double-submit-cookie
CSRF protection, login/register/forgot-password rate limiting plus a
DB-backed sliding-window lockout, hashed/expiring/single-use password-reset
tokens, server-side role checks on every route, and upload validation
(content-type/size/extension, randomized storage filenames, path-traversal
guards on delete).
