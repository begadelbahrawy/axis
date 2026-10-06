#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Seeding first Admin + master data (idempotent, skips if already present)..."
npx prisma db seed

exec "$@"
