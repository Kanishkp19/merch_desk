#!/bin/sh
set -eu

# Render Free has no persistent disk. Initialize a disposable demo database on
# each boot; never copy the developer's database or accept destructive changes.
export DATABASE_URL="${DATABASE_URL:-file:/tmp/merchdesk.db}"
export HOSTNAME=0.0.0.0
export PORT="${PORT:-10000}"
export NODE_ENV=production

node node_modules/prisma/build/index.js db push --skip-generate
exec node .next/standalone/server.js
