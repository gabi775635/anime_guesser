#!/bin/bash
# Retourne le statut complet en JSON pour le dashboard

BACKUP_DIR="/backups"
STATUS_FILE="${BACKUP_DIR}/.last_status.json"
SNAPSHOTS_FILE="${BACKUP_DIR}/.snapshots.json"

# Calcule la prochaine exécution (2h00 demain)
NEXT=$(date -d "tomorrow 02:00" -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "")

# Lit les fichiers de statut
if [ -f "${STATUS_FILE}" ]; then
  LAST_STATUS=$(cat "${STATUS_FILE}")
else
  LAST_STATUS='{"last_backup":null,"last_file":null,"last_size":null,"last_duration_s":null,"last_status":"never","last_error":null}'
fi

if [ -f "${SNAPSHOTS_FILE}" ]; then
  SNAPSHOTS=$(cat "${SNAPSHOTS_FILE}")
else
  SNAPSHOTS='{"updated_at":null,"count":0,"retention_days":7,"snapshots":[]}'
fi

# Log des 20 dernières lignes
if [ -f "/var/log/backup.log" ]; then
  LOG=$(tail -20 /var/log/backup.log | sed 's/"/\\"/g' | tr '\n' '|')
else
  LOG=""
fi

cat << JSON
{
  "next_backup": "${NEXT}",
  "schedule": "Tous les jours à 02:00 UTC",
  "retention_days": 7,
  "last": ${LAST_STATUS},
  "index": ${SNAPSHOTS},
  "log": "${LOG}"
}
JSON
