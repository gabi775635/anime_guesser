# AnimeGuesser — Infrastructure Docker

## Structure du monorepo (après git clone)

```
animeguesser/                  ← racine du repo Git
├── docker-compose.yml         ← à la racine (pas dans docker/)
├── docker/                    ← configs infra (ce dossier)
│   ├── init.sh                ← à lancer une fois après clone
│   ├── backend/Dockerfile
│   ├── frontend/Dockerfile
│   ├── nginx-lb/
│   └── dashboard/
├── frontend/                  ← code SolidJS
│   ├── package.json
│   ├── src/
│   └── ...
└── backend/                   ← code Laravel
    ├── composer.json
    ├── app/
    └── ...
```

## Démarrage — premier clone

```bash
git clone <ton-repo> animeguesser
cd animeguesser

# 1. Copie les configs dans les bons endroits
bash docker/init.sh

# 2. Configure les variables d'environnement
cp docker/.env.example .env
# Édite .env si besoin (mots de passe, APP_KEY...)

# 3. Build et démarrage — tout se fait dans Docker
#    Node, npm, Composer : rien à installer sur ta machine
docker compose up -d --build

# 4. Migrations Laravel (premier lancement uniquement)
docker compose exec backend php artisan migrate --seed
```

## Après un git pull

```bash
git pull
docker compose up -d --build   # rebuild uniquement ce qui a changé
```

## Accès

| Service   | URL                   |
|-----------|-----------------------|
| App        | http://localhost:80   |
| Dashboard  | http://localhost:9000 |

## Ce que Docker gère tout seul

- **npm install** + **npm run build** → dans le conteneur frontend
- **composer install** → dans le conteneur backend
- **php artisan config:cache** etc. → au build
- **Nginx** + **PHP-FPM** + **Queue worker** → via Supervisor dans le backend

## Commandes utiles

```bash
docker compose ps                             # état des services
docker compose logs -f backend                # logs backend live
docker compose exec backend php artisan migrate   # migrations
docker compose up -d --build frontend-1       # rebuild un seul service
docker compose down                           # tout arrêter
docker compose down -v                        # tout arrêter + supprimer DB
```
