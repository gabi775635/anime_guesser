# AnimeGuesser

Jeu de devinettes d'anime — Infrastructure Docker complète avec dashboard d'administration.

## Arborescence

```
animeguesser/
├── animeguesser/
│   ├── frontend/          SolidJS + Tauri (web + desktop + Android)
│   └── backend/           Laravel API REST
├── dashboard/
│   ├── backend/           Node.js — API dashboard
│   │   ├── server.js      Point d'entrée (aucune logique ici)
│   │   ├── middleware/    auth.js
│   │   ├── routes/        auth, containers, cron, traffic, backups, versions, server
│   │   └── services/      docker.js, ws.js
│   └── frontend/
│       ├── pages/         Une page HTML par fonctionnalité (pas de SPA)
│       └── shared/        style.css, api.js, layout.html
├── version-server/        Génère les releases (APK Android, desktop Linux/Windows)
├── backup/                Scripts mysqldump automatisés
├── scripts/               bump-version.sh
├── docker/                Dockerfiles par service
├── nginx-lb/              Config load balancer nginx
├── .env.example           Toutes les variables à configurer
└── docker-compose.yml     Point d'entrée unique
```

## Démarrage rapide

```bash
# 1. Variables d'environnement
cp .env.example .env
# Éditer .env avec tes valeurs

# 2. Première installation (migrations + seed)
docker compose --profile setup up setup

# 3. Démarrer tous les services
docker compose up -d

# 4. Dashboard
# http://localhost:9000
```

## Services

| Service              | Port  | Description                                   |
|----------------------|-------|-----------------------------------------------|
| `animeguesser-lb`    | 8080  | Load balancer nginx (frontend)                |
| `animeguesser-dashboard` | 9000 | Dashboard d'administration               |
| `animeguesser-frontend-1/2` | —  | Instances frontend SolidJS              |
| `animeguesser-backend`   | —   | API Laravel                                   |
| `animeguesser-db`        | —   | MySQL 8                                       |
| `animeguesser-backup`    | —   | Backup BDD quotidien (cron 02h00)            |
| `animeguesser-version-server` | — | Build releases Tauri (cron 03h30)       |
| `animeguesser-version-watchdog` | — | Bump version si nouveau commit (03h00) |

## Dashboard — Pages

| Page                   | URL                           | Description                          |
|------------------------|-------------------------------|--------------------------------------|
| Connexion              | `/pages/login.html`           | Auth                                 |
| Accueil                | `/pages/index.html`           | Vue globale, stats, dernière version |
| Conteneurs             | `/pages/containers.html`      | Liste + actions                      |
| Détail conteneur       | `/pages/container-detail.html?id=X` | Logs, cron, stats, infos spécifiques |
| Cron                   | `/pages/cron.html`            | Crontabs de tous les conteneurs      |
| Trafic                 | `/pages/traffic.html`         | Requêtes LB, codes statut            |
| Performance            | `/pages/perf.html`            | CPU/RAM par conteneur, live          |
| Backups                | `/pages/backups.html`         | Statut, snapshots, trigger manuel    |
| Versions               | `/pages/versions.html`        | Releases téléchargeables             |
| Mentions légales       | `/pages/legal.html`           | RGPD, mentions obligatoires          |
| Contact                | `/pages/contact.html`         | Formulaire + canaux                  |
| Support                | `/pages/support.html`         | FAQ, statut services                 |

## Version Server

Le conteneur `version-server` compile automatiquement les exécutables via **Tauri** :

- **Cron** : tous les soirs à 03h30 (après le bump de version à 03h00)
- **Sorties** : Linux AppImage, .deb, Android APK
- **Stockage** : volume Docker `releases`, accessible en lecture par le dashboard
- **Téléchargement** : `GET /api/versions/download/:filename`
- **Base de données** : `/releases/versions.json` — liste toutes les versions

Build manuel :
```bash
docker compose exec version-server build-release.sh
```

## Variables d'environnement

Voir `.env.example` — toutes les variables sont documentées et regroupées par catégorie :
- Base de données
- Laravel
- Dashboard admin
- Docker / Réseau
- Version server
- Backups
- Mentions légales (nom, adresse, SIRET)
- Contact & réseaux sociaux (Discord, Twitter…)
- Sécurité / CORS

## Mentions légales

Les pages légales (`/pages/legal.html`, `/pages/contact.html`) sont pré-remplies
depuis les variables d'environnement `LEGAL_*` et `CONTACT_EMAIL`.
**Renseigner obligatoirement** avant mise en production :
- `LEGAL_NAME`, `LEGAL_ADDRESS`, `LEGAL_SIRET` (si micro-entreprise)
- `CONTACT_EMAIL`
- `HOSTING_PROVIDER`, `HOSTING_ADDRESS`
