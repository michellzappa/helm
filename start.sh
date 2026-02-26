#!/bin/bash
# Helm start script
# Copy to your install location and update paths, or run directly with pnpm.
set -e
cd "$(dirname "$0")"
PORT=${MC_PORT:-1111} pnpm run dev --hostname 0.0.0.0
