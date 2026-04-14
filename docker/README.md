# AnimeGuesser — Infrastructure Docker

Conteneurisation complète avec load balancing et dashboard de gestion.

## Architecture

```
Internet
    │
    ▼
┌─────────────┐   :80
│  Nginx LB   │ ──────── round-robin ──────────────────┐
└─────────────┘                                        │
    │                                                  │
    ├── /api/* ──► [ backend:8000 ] (Laravel)   ┌──────┴──────┐
    │               CPU max 20% / RAM 512MB      │ frontend-1  │
    │                                            │ frontend-2  │
    └─────────────────────────────────────────── │ frontend-N  │
                                                 └─────────────┘
                                                  (Nginx SPA)

┌───────────────┐   :9000
│   Dashboard   │ ◄── Docker socket → gestion des conteneurs
└───────────────┘

┌────────────┐
│  MySQL 8   │
└────────────┘
```

## Démarrage rapide

```bash
# 1. Copie la config
cp .env.example .env

# 2. Place ton code dans les bons dossiers
cp -r /path/to/ton/frontend/build/* frontend/   # Build SolidJS (npm run build)
cp -r /path/to/ton/backend/*         backend/   # Code Laravel

# 3. Lance tout
docker compose up -d --build

# 4. Migrations Laravel (premier lancement)
docker compose exec backend php artisan migrate --seed
```

## Accès

| Service | URL |
|---------|-----|
| Application | http://localhost:80 |
| Dashboard   | http://localhost:9000 |

## Dashboard — fonctionnalités

- **Vue temps réel** : CPU & RAM de chaque conteneur (WebSocket, push toutes les 3s)
- **Ajouter** une instance frontend en un clic
- **Supprimer** une instance dynamique (les 2 de base sont protégées)
- **Stop / Start / Restart** de n'importe quel conteneur
- **Logs** : affichage des 100 dernières lignes

> Quand tu ajoutes ou supprimes un frontend, le dashboard regénère automatiquement la config Nginx et recharge le load balancer sans downtime.

## Limites de ressources (backend)

Dans `docker-compose.yml` :
```yaml
deploy:
  resources:
    limits:
      cpus: "0.20"    # 20% d'un CPU
      memory: 512M
```

Pour changer, édite ces valeurs et `docker compose up -d backend`.

## Scaler manuellement

```bash
# Via le dashboard (recommandé) → http://localhost:9000

# Ou en ligne de commande
docker compose up -d --scale frontend=4   # 4 instances (recrée les conteneurs)
```

## Commandes utiles

```bash
docker compose ps                          # État des services
docker compose logs -f backend             # Logs backend en live
docker compose restart nginx-lb            # Reload du load balancer
docker compose exec backend php artisan    # Commandes Laravel
docker compose down                        # Tout arrêter
docker compose down -v                     # Tout arrêter + supprimer les volumes
```

## Structure des fichiers

```
docker/
├── docker-compose.yml
├── .env.example
├── nginx-lb/
│   ├── Dockerfile
│   └── nginx.conf          ← Config LB (modifiée dynamiquement par le dashboard)
├── frontend/
│   ├── Dockerfile           ← Build SolidJS + Nginx SPA
│   └── nginx-spa.conf
├── backend/
│   ├── Dockerfile           ← PHP-FPM + Nginx + Supervisor
│   └── docker/
│       ├── nginx.conf
│       └── supervisord.conf
└── dashboard/
    ├── Dockerfile
    ├── package.json
    ├── server.js            ← API Express + WebSocket + Dockerode
    └── public/
        └── index.html       ← Interface web
```
