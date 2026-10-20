#!/bin/bash
# ==============================================================================
# VizAI Media Engine - 1-Click Update Script for VPC / Linux Deployments
# Usage: ./update.sh
# ==============================================================================

set -e

echo "=============================================="
echo "  [1/4] Pulling latest changes from GitHub... "
echo "=============================================="
git pull origin main

echo "=============================================="
echo "  [2/4] Building Backend TypeScript API...    "
echo "=============================================="
npm --prefix server run build

echo "=============================================="
echo "  [3/4] Restarting Streaming Infrastructure..."
echo "=============================================="
docker compose up -d

echo "=============================================="
echo "  [4/4] Verifying Running Services...         "
echo "=============================================="
docker compose ps

echo ""
echo ">>> VizAI Media Engine updated and running successfully!"
