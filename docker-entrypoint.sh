#!/bin/sh
set -e

echo "🚀 Starting H2T Home Inventory Application..."

# If DATABASE_URL is present, run db push to ensure tables exist
if [ -n "$DATABASE_URL" ]; then
  echo "📦 Syncing PostgreSQL schema with Prisma..."
  npx prisma db push --skip-generate || echo "⚠️ Warning: Prisma db push encountered an issue, proceeding with server startup..."
fi

exec "$@"
