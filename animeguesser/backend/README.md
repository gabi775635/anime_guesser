# Anime Guesser — Backend Laravel

## Prérequis
- PHP >= 8.2
- Composer
- MySQL / MariaDB

## Installation rapide

```bash
# 1. Créer le projet Laravel
composer create-project laravel/laravel .
# (dans le dossier backend/)

# 2. Installer Sanctum
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"

# 3. Copier le .env
cp .env.example .env
# → Édite DB_DATABASE, DB_USERNAME, DB_PASSWORD

# 4. Générer la clé
php artisan key:generate

# 5. Remplacer les fichiers fournis :
#    - app/Http/Controllers/*.php   → tous les controllers
#    - app/Http/Middleware/CheckRole.php
#    - app/Models/*.php
#    - database/migrations/*.php
#    - database/seeders/DatabaseSeeder.php
#    - routes/api.php
#    - bootstrap/app.php
#    - config/cors.php

# 6. Migrations + seed
php artisan migrate
php artisan db:seed

# 7. Démarrer
php artisan serve --port=8000
```

## Alternative — setup standalone (sans Laravel)

```bash
# Crée la BDD + tables + données de test en une commande
php setup.php
```

## Routes API principales

| Méthode | Route                        | Auth     | Description            |
|---------|------------------------------|----------|------------------------|
| POST    | /api/login                   | Public   | Connexion              |
| POST    | /api/register                | Public   | Inscription            |
| GET     | /api/game/round?mode=X       | Joueur   | Récupère un round      |
| POST    | /api/game/session/start      | Joueur   | Démarre une session    |
| POST    | /api/game/session/answer     | Joueur   | Soumet une réponse     |
| GET     | /api/leaderboard             | Joueur   | Classement             |
| GET     | /api/admin/users             | Admin    | Liste utilisateurs     |
| GET     | /api/metrics/live            | Admin    | Métriques serveur live |
| GET     | /api/metrics/players         | Admin    | Stats joueurs          |

## Comptes de test

| Pseudo     | Email                      | Mot de passe | Rôle       |
|------------|----------------------------|--------------|------------|
| admin      | admin@animeguesser.local   | Admin1234!   | Admin      |
| moderator1 | mod1@animeguesser.local    | Mod1234!     | Modérateur |
| naruto_fan | naruto@test.local          | Pass1234!    | Joueur     |
