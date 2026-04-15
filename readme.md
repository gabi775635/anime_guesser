# AnimeGuesser — Infrastructure Docker

## Architecture

```
Internet
    │  :80
    ▼
┌──────────────┐
│  Nginx LB    │  round-robin / least_conn
└──────┬───────┘
       │                          ┌──────────────────┐
       ├─── /api/* ──────────────►│ backend:8000     │ Laravel + PHP-FPM
       │                          │ CPU max 20%       │ Migrations auto
       │                          │ RAM max 512MB     │
       │                          └──────────────────┘
       │
       ├─── /* ──────────────────►│ frontend-1:80    │
       │                          │ frontend-2:80    │ SolidJS (Nginx SPA)
       │                          │ frontend-N:80    │
       │                          └──────────────────┘
:9000  │
┌──────▼───────┐
│  Dashboard   │  Gestion des conteneurs (WebSocket live)
└──────┬───────┘
       └── /var/run/docker.sock
```

---

## Structure du repo

```
anime_guesser/
├── docker-compose.yml         ← à la racine (fourni dans ce zip)
├── .env                       ← à créer depuis docker/.env.example
│
├── docker/                    ← configs infra (ce dossier)
│   ├── .env.example
│   ├── README.md
│   ├── backend/
│   │   └── Dockerfile         ← build Laravel, installe Composer, migrations
│   ├── frontend/
│   │   └── Dockerfile         ← build SolidJS, installe Node/npm
│   ├── nginx-lb/
│   │   ├── Dockerfile
│   │   └── nginx.conf         ← config LB (modifiée par le dashboard)
│   └── dashboard/
│       ├── Dockerfile
│       ├── package.json
│       ├── server.js          ← API Express + WebSocket + Dockerode
│       └── public/index.html  ← interface web
│
├── frontend/                  ← code SolidJS — NON MODIFIÉ par Docker
└── backend/                   ← code Laravel  — NON MODIFIÉ par Docker
```

> Composer, Node, npm, PHP sont installés **dans les conteneurs**.
> Rien à installer sur ta machine hormis Docker.

---

## Premier lancement

```bash
# 1. Clone
git clone <ton-repo> anime_guesser
cd anime_guesser

# 2. Place le docker-compose.yml à la racine du repo
cp docker/docker-compose.yml ./docker-compose.yml

# 3. Variables d'environnement (les défauts fonctionnent tels quels)
cp docker/.env.example .env

# 4. Build + démarrage
docker compose up -d --build
```

Docker se charge automatiquement de :
- `composer install` dans le conteneur backend
- `npm ci` + `npm run build` dans le conteneur frontend
- Les migrations Laravel au démarrage du backend

---

## Après un git pull

```bash
git pull
docker compose up -d --build
```

---

## Accès

| Service      | URL                    |
|--------------|------------------------|
| Application  | http://localhost       |
| API Laravel  | http://localhost/api/  |
| Dashboard    | http://localhost:9000  |

---

## Dashboard (:9000)

- Voir CPU/RAM de chaque conteneur en temps réel (push WebSocket toutes les 3s)
- Ajouter une instance frontend → LB reconfiguré automatiquement
- Supprimer une instance dynamique (les 2 de base sont protégées)
- Stop / Start / Restart sur n'importe quel conteneur
- Consulter les 100 dernières lignes de logs

---

## Limites de ressources (backend)

```yaml
# docker-compose.yml
deploy:
  resources:
    limits:
      cpus: "0.20"   # 20% d'un cœur
      memory: 512M
```

Pour modifier : édite ces valeurs puis `docker compose up -d --build backend`.

---

## Variables d'environnement (.env)

| Variable           | Défaut          |
|--------------------|-----------------|
| `LB_PORT`          | `80`            |
| `DASHBOARD_PORT`   | `9000`          |
| `DB_ROOT_PASSWORD` | `rootpassword`  |
| `DB_DATABASE`      | `anime_guesser` |
| `DB_USERNAME`      | `animeguesser`  |
| `DB_PASSWORD`      | `secret`        |

La `APP_KEY` Laravel est lue depuis `backend/.env` — pas besoin de la redéfinir.

---

## Commandes utiles

```bash
docker compose ps                                 # état de tous les services
docker compose logs -f backend                    # logs Laravel en live
docker compose logs -f frontend-1                 # logs frontend en live
docker compose exec backend php artisan migrate   # migrations manuelles
docker compose exec backend sh                    # shell dans le backend
docker compose up -d --build backend              # rebuild backend seul
docker compose up -d --build frontend-1           # rebuild frontend-1 seul
docker compose down                               # arrêt
docker compose down -v                            # arrêt + suppression DB
```