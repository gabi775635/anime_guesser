#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  backup.sh — Snapshot MySQL quotidien avec rétention 7 jours
# ─────────────────────────────────────────────────────────────

set -e

BACKUP_DIR="/backups"
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_DATABASE:-anime_guesser}"
DB_USER="${DB_USERNAME:-animeguesser}"
DB_PASS="${DB_PASSWORD:-secret}"
RETENTION_DAYS=7

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"
STATUS_FILE="${BACKUP_DIR}/.last_status.json"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

log "=== Début du snapshot ==="
log "Base : ${DB_NAME} sur ${DB_HOST}:${DB_PORT}"

# Attendre que la DB soit prête
for i in $(seq 1 10); do
  if mysqladmin ping -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASS}" --silent 2>/dev/null; then
    break
  fi
  log "Attente DB... (${i}/10)"
  sleep 5
done

START_TIME=$(date +%s)

# Dump + compression
if mysqldump \
    -h "${DB_HOST}" \
    -P "${DB_PORT}" \
    -u "${DB_USER}" \
    -p"${DB_PASS}" \
    --single-transaction \
    --routines \
    --triggers \
    --add-drop-table \
    "${DB_NAME}" | gzip > "${FILENAME}"; then

  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))
  SIZE=$(du -sh "${FILENAME}" | cut -f1)

  log "✓ Snapshot créé : ${FILENAME} (${SIZE}) en ${DURATION}s"

  # Écrit le statut
  cat > "${STATUS_FILE}" << JSON
{
  "last_backup": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "last_file": "${FILENAME}",
  "last_size": "${SIZE}",
  "last_duration_s": ${DURATION},
  "last_status": "success",
  "last_error": null
}
JSON

else
  ERROR_MSG="mysqldump a échoué"
  log "✗ Erreur : ${ERROR_MSG}"

  cat > "${STATUS_FILE}" << JSON
{
  "last_backup": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "last_file": null,
  "last_size": null,
  "last_duration_s": null,
  "last_status": "error",
  "last_error": "${ERROR_MSG}"
}
JSON

  exit 1
fi

# ── Nettoyage : garde seulement les 7 derniers jours ─────────
log "Nettoyage des snapshots > ${RETENTION_DAYS} jours..."
DELETED=0
for old_file in "${BACKUP_DIR}"/backup_*.sql.gz; do
  if [ -f "${old_file}" ]; then
    FILE_DATE=$(basename "${old_file}" | sed 's/backup_//' | sed 's/_[0-9-]*\.sql\.gz//' | sed 's/_/ /' | cut -d_ -f1)
    FILE_EPOCH=$(date -d "${FILE_DATE}" +%s 2>/dev/null || echo 0)
    CUTOFF_EPOCH=$(date -d "${RETENTION_DAYS} days ago" +%s)
    if [ "${FILE_EPOCH}" -lt "${CUTOFF_EPOCH}" ] && [ "${FILE_EPOCH}" -gt 0 ]; then
      rm -f "${old_file}"
      log "  Supprimé : $(basename ${old_file})"
      DELETED=$((DELETED + 1))
    fi
  fi
done

log "Nettoyage : ${DELETED} fichier(s) supprimé(s)"

# ── Liste des snapshots actuels ───────────────────────────────
SNAPSHOTS_JSON="["
FIRST=1
for f in $(ls -t "${BACKUP_DIR}"/backup_*.sql.gz 2>/dev/null); do
  if [ -f "$f" ]; then
    FNAME=$(basename "$f")
    FSIZE=$(du -sh "$f" | cut -f1)
    FDATE=$(stat -c %y "$f" | cut -d. -f1)
    if [ $FIRST -eq 0 ]; then SNAPSHOTS_JSON="${SNAPSHOTS_JSON},"; fi
    SNAPSHOTS_JSON="${SNAPSHOTS_JSON}{\"file\":\"${FNAME}\",\"size\":\"${FSIZE}\",\"date\":\"${FDATE}\"}"
    FIRST=0
  fi
done
SNAPSHOTS_JSON="${SNAPSHOTS_JSON}]"

# Met à jour le fichier d'index
cat > "${BACKUP_DIR}/.snapshots.json" << JSON
{
  "updated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "count": $(ls "${BACKUP_DIR}"/backup_*.sql.gz 2>/dev/null | wc -l),
  "retention_days": ${RETENTION_DAYS},
  "snapshots": ${SNAPSHOTS_JSON}
}
JSON

log "=== Snapshot terminé ==="
