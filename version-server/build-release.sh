#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/app/frontend"
RELEASES_DIR="/releases"
VERSIONS_DB="/releases/versions.json"
LOG_FILE="/var/log/version-server.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }
die() { log "❌ ERREUR : $1"; exit 1; }

mkdir -p "$RELEASES_DIR"

# ── 1. Version ────────────────────────────────────────────────────────────────
VERSION=$(node -e "console.log(require('${APP_DIR}/package.json').version)" 2>/dev/null) \
  || die "Impossible de lire la version dans package.json"
log "Version : $VERSION"

# ── 2. Déjà buildée ? ────────────────────────────────────────────────────────
if [ -f "$VERSIONS_DB" ]; then
  EXISTING=$(node -e "
    const db = require('$VERSIONS_DB');
    console.log(db.versions.some(v => v.version === '$VERSION') ? 'yes' : 'no');
  " 2>/dev/null || echo "no")
  if [ "$EXISTING" = "yes" ]; then
    log "Version $VERSION déjà buildée. Rien à faire."
    exit 0
  fi
fi

cd "$APP_DIR"
[ ! -d node_modules ] && npm ci --silent

# ── 3. Android APK ───────────────────────────────────────────────────────────
log "Build Android APK…"
# Init projet Android si pas encore fait
if [ ! -d "$APP_DIR/src-tauri/gen/android" ]; then
  cargo tauri android init 2>>"$LOG_FILE" || log "⚠️  android init échoué"
fi
cargo tauri android build --apk 2>>"$LOG_FILE" || log "⚠️  Build Android échoué (non bloquant)"
ANDROID_APK=$(find "$APP_DIR/src-tauri/gen/android" -name "*.apk" 2>/dev/null | head -1)

# ── 4. Build Linux ───────────────────────────────────────────────────────────
log "Build Tauri Linux…"
cargo tauri build --target x86_64-unknown-linux-gnu 2>>"$LOG_FILE" || die "Tauri build Linux échoué"
LINUX_APPIMAGE=$(find "$APP_DIR/src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/appimage" -name "*.AppImage" 2>/dev/null | head -1)
LINUX_DEB=$(find "$APP_DIR/src-tauri/target/x86_64-unknown-linux-gnu/release/bundle/deb" -name "*.deb" 2>/dev/null | head -1)

# ── 5. Build Windows ─────────────────────────────────────────────────────────
log "Build Tauri Windows…"
cargo tauri build --target x86_64-pc-windows-gnu 2>>"$LOG_FILE" || log "⚠️  Build Windows échoué (non bloquant)"
WINDOWS_EXE=$(find "$APP_DIR/src-tauri/target/x86_64-pc-windows-gnu/release/bundle" -name "*.exe" 2>/dev/null | head -1)
WINDOWS_MSI=$(find "$APP_DIR/src-tauri/target/x86_64-pc-windows-gnu/release/bundle" -name "*.msi" 2>/dev/null | head -1)

# ── 6. Copier les releases ────────────────────────────────────────────────────
FILES_METADATA="[]"

copy_release() {
  local src="$1" platform="$2" arch="$3" ext="$4"
  if [ -f "$src" ]; then
    local filename="animeguesser-${VERSION}-${platform}-${arch}.${ext}"
    cp "$src" "$RELEASES_DIR/$filename"
    local size_mb=$(du -m "$RELEASES_DIR/$filename" | cut -f1)
    log "  ✅ $filename (${size_mb} Mo)"
    FILES_METADATA=$(node -e "
      const arr = $FILES_METADATA;
      arr.push({ platform: '$platform', arch: '$arch', filename: '$filename', sizeMb: $size_mb });
      console.log(JSON.stringify(arr));
    ")
  else
    log "  ⚠️  Fichier source non trouvé : $src"
  fi
}

[ -n "${ANDROID_APK:-}"    ] && copy_release "$ANDROID_APK"    "android" "arm64" "apk"
[ -n "${LINUX_APPIMAGE:-}" ] && copy_release "$LINUX_APPIMAGE" "linux"   "x64"   "AppImage"
[ -n "${LINUX_DEB:-}"      ] && copy_release "$LINUX_DEB"      "linux"   "x64"   "deb"
[ -n "${WINDOWS_EXE:-}"    ] && copy_release "$WINDOWS_EXE"    "windows" "x64"   "exe"
[ -n "${WINDOWS_MSI:-}"    ] && copy_release "$WINDOWS_MSI"    "windows" "x64"   "msi"

# ── 7. Commit hash ────────────────────────────────────────────────────────────
COMMIT_HASH=""
if git -C "$APP_DIR" rev-parse HEAD > /dev/null 2>&1; then
  COMMIT_HASH=$(git -C "$APP_DIR" rev-parse HEAD)
fi

# ── 8. versions.json ─────────────────────────────────────────────────────────
log "Mise à jour de versions.json…"
node - <<EOF
const fs  = require('fs');
const db  = fs.existsSync('$VERSIONS_DB') ? JSON.parse(fs.readFileSync('$VERSIONS_DB')) : { versions: [] };

const entry = {
  version:    '$VERSION',
  builtAt:    new Date().toISOString(),
  commitHash: '$COMMIT_HASH',
  channel:    'stable',
  notes:      '',
  files:      $FILES_METADATA,
};

db.versions = db.versions.filter(v => v.version !== '$VERSION');
db.versions.push(entry);
db.versions.sort((a, b) => {
  const pa = a.version.split('.').map(Number);
  const pb = b.version.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i]||0) !== (pb[i]||0)) return (pb[i]||0) - (pa[i]||0);
  return 0;
});
if (db.versions.length > 20) db.versions = db.versions.slice(0, 20);

fs.writeFileSync('$VERSIONS_DB', JSON.stringify(db, null, 2));
console.log('versions.json mis à jour. Total : ' + db.versions.length + ' version(s).');
EOF

log "✅ Build $VERSION terminé."