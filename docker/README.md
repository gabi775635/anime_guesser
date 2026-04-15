# AnimeGuesser — Docker

## Structure du repo après git clone

```
anime_guesser/
├── docker-compose.yml      ← à la racine (remplace l'ancien)
├── docker/                 ← configs infra (ce dossier)
│   ├── .env.example
│   ├── backend/Dockerfile  ← Dockerfile Laravel (ne touche pas backend/)
│   ├── frontend/Dockerfile ← Dockerfile SolidJS (ne touche pas frontend/)
│   ├── nginx-lb/
│   └── dashboard/
├── frontend/               ← code SolidJS — intact, rien ajouté
└── backend/                ← code Laravel  — intact, rien ajouté
```

**Node, npm, Composer, PHP** → tout installé dans Docker. Rien sur ta machine.

---

## Premier lancement

```bash
git clone <repo> anime_guesser
cd anime_guesser

# Copie le docker-compose.yml à la racine
cp docker/docker-compose.yml ./docker-compose.yml

# Variables d'environnement (optionnel, les défauts marchent)
cp docker/.env.example .env

# Build + démarrage — tout se fait dans les conteneurs
docker compose up -d --build
```

C'est tout. Les migrations Laravel tournent automatiquement au démarrage.

---

## Après un git pull

```bash
git pull
docker compose up -d --build
```

---

## Accès

| Service   | URL                    |
|-----------|------------------------|
| App       | http://localhost:80    |
| Dashboard | http://localhost:9000  |

---

## Commandes utiles

```bash
docker compose ps                                # état
docker compose logs -f backend                   # logs Laravel
docker compose exec backend php artisan migrate  # migrations manuelles
docker compose up -d --build backend             # rebuild backend seul
docker compose down                              # arrêt
docker compose down -v                           # arrêt + suppression DB
```
