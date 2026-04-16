#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  bump-version.sh — Bump automatique du numéro de version
#
#  Logique :
#    1. Calcule le hash git HEAD du frontend
#    2. Compare avec le hash stocké dans .version-hash
#    3. Si identique → aucun changement, on s'arrête
#    4. Si différent → bump PATCH dans package.json + tauri.conf.json
#                    → met à jour .version-hash
#
#  Appelé par :
#    - Dockerfile.release (au moment du build des exécutables)
#    - version-watchdog (service Docker, tourne toutes les nuits)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${SCRIPT_DIR}/../frontend"
HASH_FILE="${FRONTEND_DIR}/.version-hash"
PKG_FILE="${FRONTEND_DIR}/package.json"
TAURI_CONF="${FRONTEND_DIR}/src-tauri/tauri.conf.json"

log()  { echo "[bump-version] $1"; }
warn() { echo "[bump-version] ⚠  $1"; }

# ── 1. Hash courant ───────────────────────────────────────────────────────────
# Priorité : hash git du contenu du dossier frontend (portable dans Docker)
if git -C "${FRONTEND_DIR}" rev-parse HEAD > /dev/null 2>&1; then
    CURRENT_HASH=$(git -C "${FRONTEND_DIR}" log -1 --format="%H" -- . 2>/dev/null || echo "")
    if [ -z "${CURRENT_HASH}" ]; then
        # Fallback : hash global du repo
        CURRENT_HASH=$(git -C "${FRONTEND_DIR}" rev-parse HEAD)
    fi
else
    # Pas de dépôt git (Docker build sans .git) → hash du contenu des sources
    CURRENT_HASH=$(find "${FRONTEND_DIR}/src" -type f | sort | xargs sha256sum 2>/dev/null | sha256sum | cut -d' ' -f1)
fi

log "Hash courant : ${CURRENT_HASH:0:12}..."

# ── 2. Hash précédent ─────────────────────────────────────────────────────────
if [ -f "${HASH_FILE}" ]; then
    PREVIOUS_HASH=$(cat "${HASH_FILE}" | tr -d '[:space:]')
else
    PREVIOUS_HASH=""
fi

# ── 3. Comparaison ────────────────────────────────────────────────────────────
if [ "${CURRENT_HASH}" = "${PREVIOUS_HASH}" ]; then
    CURRENT_VERSION=$(node -p "require('${PKG_FILE}').version" 2>/dev/null || echo "inconnu")
    log "Aucune modification détectée — version inchangée : ${CURRENT_VERSION}"
    exit 0
fi

log "Modifications détectées (${PREVIOUS_HASH:0:12:-0} → ${CURRENT_HASH:0:12})."

# ── 4. Lecture de la version actuelle ────────────────────────────────────────
if [ ! -f "${PKG_FILE}" ]; then
    warn "package.json introuvable dans ${FRONTEND_DIR}, abandon."
    exit 1
fi

if command -v node &> /dev/null; then
    CURRENT_VERSION=$(node -p "require('${PKG_FILE}').version")
else
    CURRENT_VERSION=$(grep '"version"' "${PKG_FILE}" | head -1 | sed 's/.*"\([0-9]*\.[0-9]*\.[0-9]*\)".*/\1/')
fi

if [[ ! "${CURRENT_VERSION}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    warn "Version malformée : '${CURRENT_VERSION}' — abandon."
    exit 1
fi

# ── 5. Calcul du nouveau PATCH ────────────────────────────────────────────────
IFS='.' read -r MAJOR MINOR PATCH <<< "${CURRENT_VERSION}"
NEW_PATCH=$(( PATCH + 1 ))
NEW_VERSION="${MAJOR}.${MINOR}.${NEW_PATCH}"

log "Bump : ${CURRENT_VERSION} → ${NEW_VERSION}"

# ── 6. Mise à jour package.json ───────────────────────────────────────────────
if command -v node &> /dev/null; then
    node -e "
        const fs  = require('fs');
        const pkg = JSON.parse(fs.readFileSync('${PKG_FILE}', 'utf8'));
        pkg.version = '${NEW_VERSION}';
        fs.writeFileSync('${PKG_FILE}', JSON.stringify(pkg, null, 2) + '\n');
    "
    log "✓ package.json mis à jour"
else
    sed -i "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" "${PKG_FILE}"
    log "✓ package.json mis à jour (sed)"
fi

# ── 7. Mise à jour tauri.conf.json (si existant) ──────────────────────────────
if [ -f "${TAURI_CONF}" ]; then
    if command -v node &> /dev/null; then
        node -e "
            const fs   = require('fs');
            const conf = JSON.parse(fs.readFileSync('${TAURI_CONF}', 'utf8'));
            if (conf.version !== undefined)         conf.version         = '${NEW_VERSION}';
            if (conf.package?.version !== undefined) conf.package.version = '${NEW_VERSION}';
            fs.writeFileSync('${TAURI_CONF}', JSON.stringify(conf, null, 2) + '\n');
        "
        log "✓ tauri.conf.json mis à jour"
    else
        sed -i "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" "${TAURI_CONF}"
        log "✓ tauri.conf.json mis à jour (sed)"
    fi
fi

# ── 8. Enregistrement du nouveau hash ────────────────────────────────────────
echo "${CURRENT_HASH}" > "${HASH_FILE}"
log "✓ Hash enregistré dans ${HASH_FILE}"

log "=== Bump terminé : ${CURRENT_VERSION} → ${NEW_VERSION} ==="
