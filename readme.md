# Anime Guesser — Guide d'installation

## Prérequis

- PHP >= 8.2
- Composer
- Node.js >= 18 + npm
- MySQL / MariaDB
- Rust + Cargo (pour Tauri)

---

## 1. Backend Laravel

```bash
# Créer le projet Laravel
composer create-project laravel/laravel backend
cd backend

# Installer Sanctum (authentification API)
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"

# Configurer .env
cp .env.example .env
```

Modifier `.env` :
```env
APP_URL=http://localhost:8000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=anime_guesser
DB_USERNAME=root
DB_PASSWORD=

# CORS (important pour Tauri)
SANCTUM_STATEFUL_DOMAINS=localhost,localhost:1420,tauri://localhost
SESSION_DOMAIN=localhost
```

```bash
# Générer la clé
php artisan key:generate

# Copier les fichiers de migration (depuis laravel_migrations_reference.php)
# Créer chaque fichier séparément dans database/migrations/

# Lancer les migrations
php artisan migrate

# Copier les controllers (depuis laravel_api_reference.php)
# dans app/Http/Controllers/

# Copier routes/api.php

# Ajouter le middleware CheckRole dans app/Http/Middleware/
# L'enregistrer dans bootstrap/app.php

# Démarrer le serveur
php artisan serve --port=8000
```

### CORS — config/cors.php
```php
return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => ['*'],
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
```

---

## 2. Base de données (setup rapide)

```bash
# Option A : script standalone PHP (crée tout + seed)
# php setup.php

# Option B : migrations + seeders Laravel
php artisan migrate
php artisan db:seed
```

---

## 3. Frontend Tauri

```bash
# Créer le projet Tauri
npm create tauri-app@latest frontend
cd frontend
# Choisir : Vanilla + TypeScript/JavaScript

# Copier index.html dans src/
cp ../index.html src/index.html

# Configurer tauri.conf.json
```

`src-tauri/tauri.conf.json` :
```json
{
  "build": {
    "beforeDevCommand": "",
    "beforeBuildCommand": "",
    "devUrl": "http://localhost:1420",
    "frontendDist": "../src"
  },
  "app": {
    "windows": [
      {
        "title": "Anime Guesser",
        "width": 1280,
        "height": 800,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "identifier": "com.animeguesser.app",
    "icon": ["icons/32x32.png", "icons/128x128.png"]
  }
}
```

```bash
# Lancer en dev
npm run tauri dev

# Builder pour production
npm run tauri build
```

---

## 4. Structure finale du projet

```
anime-guesser/
├── setup.php                    ← Script BDD standalone
├── backend/                     ← Laravel API
│   ├── app/Http/Controllers/
│   │   ├── AuthController.php
│   │   ├── GameController.php
│   │   ├── AnimeController.php
│   │   ├── AdminController.php
│   │   ├── ModController.php
│   │   ├── MetricsController.php
│   │   ├── ProfileController.php
│   │   └── CharacterController.php
│   ├── app/Http/Middleware/
│   │   └── CheckRole.php
│   ├── app/Models/
│   │   ├── User.php
│   │   ├── Anime.php
│   │   ├── Character.php
│   │   ├── Round.php
│   │   ├── GameSession.php
│   │   └── SessionAnswer.php
│   ├── database/migrations/     ← 10 fichiers de migration
│   └── routes/api.php
└── frontend/                    ← Tauri + Vanilla JS
    ├── src/
    │   └── index.html           ← Toute l'interface
    └── src-tauri/
        └── tauri.conf.json
```

---

## 5. Comptes de test

| Pseudo      | Email                       | Mot de passe | Rôle       |
|-------------|------------------------------|--------------|------------|
| admin       | admin@animeguesser.local     | Admin1234!   | admin      |
| moderator1  | mod1@animeguesser.local      | Mod1234!     | modérateur |
| naruto_fan  | naruto@test.local            | Pass1234!    | joueur     |

---

## 6. Prochaine étape — AniList API

Quand tu veux remplacer les données fictives par les vraies :

```php
// backend/app/Services/AniListService.php
class AniListService {
    const API_URL = 'https://graphql.anilist.co';
    
    public function searchAnime(string $query): array {
        $graphql = '{
            Media(search: "' . $query . '", type: ANIME) {
                id title { romaji english }
                description
                startDate { year }
                genres
                episodes
                coverImage { large }
            }
        }';
        // ... fetch + return
    }
}
```

Demande-moi simplement "intègre l'API AniList" quand tu es prêt.