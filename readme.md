# AnimeGuesser

Jeu de devinette de personnages d'anime — SolidJS + Tauri (web / desktop / Android) + Laravel + MySQL.

---

## Structure du projet

```
anime_guesser/
│
├── docker-compose.yml          ← point d'entrée unique
│
├── docker/                     ← UNIQUEMENT Dockerfiles + configs infra
│   ├── backend/Dockerfile
│   ├── backup/Dockerfile
│   ├── dashboard/Dockerfile
│   ├── frontend/
│   │   ├── Dockerfile              (web → nginx)
│   │   └── Dockerfile.release      (Tauri → Desktop + Android)
│   ├── nginx-lb/
│   │   ├── Dockerfile
│   │   └── nginx.conf
│   └── version-watchdog/Dockerfile
│
├── frontend/                   ← SolidJS + Tauri
│   ├── src/
│   ├── src-tauri/
│   │   ├── src/main.rs + lib.rs
│   │   ├── tauri.conf.json
│   │   ├── Cargo.toml
│   │   ├── build.rs
│   │   └── capabilities/default.json
│   ├── package.json            ← version auto-bump par version-watchdog
│   └── vite.config.js
│
├── backend/                    ← API Laravel
│
├── dashboard/                  ← App Node.js gestion infra
│   ├── server.js
│   ├── package.json
│   └── public/index.html
│
├── backup/                     ← Scripts snapshot MySQL
│   ├── backup.sh
│   └── status.sh
│
└── scripts/
    └── bump-version.sh         ← Versioning automatique
```

---

## Démarrage rapide

```bash
# 1. Variables d'environnement
cp .env.example .env

# 2. Build + démarrage de l'infrastructure
docker compose up -d --build

# 3. Setup initial (migrations + seed) — une seule fois
docker compose run --rm setup

# Web   → http://localhost:8080
# Admin → http://localhost:9000
```

> Le service `setup` est idempotent (`migrate` ne rejoue pas ce qui est déjà fait)
> — tu peux le relancer sans risque après une mise à jour du schéma.

---

## Services

| Service            | Rôle                                           | Port   |
|--------------------|------------------------------------------------|--------|
| `db`               | MySQL 8.0                                      | —      |
| `backend`          | API Laravel                                    | —      |
| `frontend-1/2`     | SolidJS buildé, servi par nginx                | —      |
| `nginx-lb`         | Load balancer + reverse proxy                  | `8080` |
| `dashboard`        | Dashboard de gestion infra                     | `9000` |
| `backup`           | Snapshot MySQL quotidien 02:00, rétention 7j   | —      |
| `version-watchdog` | Bump PATCH auto si le frontend a changé 03:00  | —      |

---

## Build des exécutables Tauri

### Desktop Linux (.AppImage + .deb)

```bash
docker build \
  -f docker/frontend/Dockerfile.release \
  --target desktop \
  -t animeguesser-release-desktop \
  ./frontend

docker run --rm -v ./releases:/out animeguesser-release-desktop
```

### Android (.apk)

```bash
docker build \
  -f docker/frontend/Dockerfile.release \
  --target android \
  -t animeguesser-release-android \
  ./frontend

docker run --rm -v ./releases:/out animeguesser-release-android
```

### iOS

Impossible sous Linux — nécessite macOS + Xcode.

```bash
# En local macOS uniquement
cd frontend && npm run tauri ios build
```

### Injecter l'URL serveur au build

```bash
docker build \
  --build-arg ANIMEGUESSER_API_URL=https://api.monserveur.com/api \
  -f docker/frontend/Dockerfile.release \
  --target desktop \
  ...
```

---

## Versioning automatique

`scripts/bump-version.sh` :
- Hash le contenu de `frontend/src/`
- Aucune modif → version inchangée
- Modif → bump PATCH dans `package.json` + `tauri.conf.json`

Déclenché :
- Au build Tauri (dans `Dockerfile.release`)
- Chaque nuit à **03:00** par `version-watchdog`

Visible dans l'onglet **Version** du dashboard.

---

## Variables d'environnement

| Variable           | Défaut          | Description                     |
|--------------------|-----------------|---------------------------------|
| `DB_ROOT_PASSWORD` | `rootpassword`  | Root MySQL                      |
| `DB_DATABASE`      | `anime_guesser` | Nom de la base                  |
| `DB_USERNAME`      | `animeguesser`  | Utilisateur MySQL               |
| `DB_PASSWORD`      | `secret`        | Mot de passe MySQL              |
| `APP_KEY`          | (défaut)        | Clé Laravel — regénérer en prod |
| `LB_PORT`          | `8080`          | Port load balancer              |
| `DASHBOARD_PORT`   | `9000`          | Port dashboard                  |
| `DASHBOARD_USER`   | `admin`         | Login dashboard                 |
| `DASHBOARD_PASS`   | `changeme`      | Mot de passe dashboard          |

---

## Développement local

### Web

```bash
cd frontend && npm install && npm run dev
# → http://localhost:1420
```

### Desktop Tauri

```bash
cd frontend && npm install && npm run tauri dev
```

Prérequis : [Rust](https://rustup.rs) + dépendances listées sur [tauri.app/start/prerequisites](https://tauri.app/start/prerequisites/).

### Backend

```bash
cd backend && composer install
php artisan migrate --seed
php artisan serve
```

---

## Dashboard

`http://localhost:9000` — authentification requise.

| Onglet       | Contenu                                                 |
|--------------|---------------------------------------------------------|
| Conteneurs   | Liste, scaling, démarrage/arrêt/restart, logs           |
| Perf serveur | CPU + mémoire temps réel par conteneur (WebSocket)      |
| Trafic       | Requêtes/min, codes HTTP, répartition par réplique      |
| Backups      | Snapshots MySQL, statut, déclenchement manuel           |
| Version      | Version du frontend, hash source, date du dernier bump  |
