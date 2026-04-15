#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  init.sh — À lancer UNE FOIS après git clone / git pull
#  Copie les configs Docker dans les bons dossiers du projet
# ─────────────────────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"  # racine du monorepo

echo "→ Copie configs backend..."
mkdir -p "$REPO_ROOT/backend/docker"
cp "$SCRIPT_DIR/backend/docker/nginx.conf"       "$REPO_ROOT/backend/docker/nginx.conf"
cp "$SCRIPT_DIR/backend/docker/supervisord.conf" "$REPO_ROOT/backend/docker/supervisord.conf"

echo "→ Copie .env Laravel si absent..."
if [ ! -f "$REPO_ROOT/backend/.env" ]; then
    if [ -f "$REPO_ROOT/backend/.env.example" ]; then
        cp "$REPO_ROOT/backend/.env.example" "$REPO_ROOT/backend/.env"
        echo "   .env créé depuis .env.example — pense à mettre APP_KEY"
    fi
fi

echo "✓ Init terminé. Lance maintenant :"
echo "   docker compose up -d --build"
