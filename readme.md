# AnimeGuesser — Frontend SolidJS

Application de quiz animé construite avec **SolidJS + Vite**, conçue pour tourner dans **Tauri**.

---

## Stack technique

| Couche | Techno |
|--------|--------|
| UI Framework | SolidJS 1.8 |
| Routing | @solidjs/router 0.13 |
| Build | Vite 5 |
| Desktop | Tauri 1.6 |
| Styling | CSS custom (variables CSS, pas de framework) |
| Backend | Laravel (PHP) sur `localhost:8000` |

---

## Structure du projet

```
animeguesser/
├── index.html                   Point d'entrée HTML
├── vite.config.js               Config Vite (port 1420)
├── package.json
├── src-tauri/                   Code Tauri (Rust) — inchangé
└── src/
    ├── index.jsx                Montage SolidJS
    ├── App.jsx                  Routeur principal
    ├── styles.css               CSS global
    │
    ├── api/
    │   └── client.js            Fetch helper avec token Bearer
    │
    ├── store/
    │   └── auth.js              État global user/token (solid-js/store)
    │
    ├── utils/
    │   └── score.js             scoreColor, scoreRank, formatDate…
    │
    ├── components/
    │   ├── AppLayout.jsx        Shell : sidebar + main content
    │   ├── Sidebar.jsx          Navigation réactive avec guards de rôle
    │   ├── Modal.jsx            Composant modal générique
    │   ├── Sparkline.jsx        Graphe en barres (métriques)
    │   └── ProtectedRoute.jsx   Guards auth / admin / modérateur
    │
    └── pages/
        ├── Auth.jsx             Connexion & inscription
        ├── Home.jsx             Accueil + choix du mode de jeu
        ├── Game.jsx             Moteur de jeu complet
        ├── Leaderboard.jsx      Classement global
        ├── Profile.jsx          Profil + stats globales + stats par mode
        ├── ModAnimes.jsx        Gestion des animés (modérateurs)
        ├── ModReports.jsx       Signalements (modérateurs)
        ├── AdminUsers.jsx       Gestion des utilisateurs (admin)
        ├── AdminServer.jsx      Métriques serveur en temps réel (admin)
        └── AdminStats.jsx       Statistiques joueurs 30 jours (admin)
```

---

## Installation

### Prérequis

- Node.js 18+
- Rust + Tauri CLI (`cargo install tauri-cli`)
- Backend Laravel qui tourne sur `http://localhost:8000`

### Dépendances

```bash
npm install
```

---

## Lancer le projet

### Développement web seul (sans Tauri)

```bash
npm run dev
# Ouvre http://localhost:1420
```

### Développement complet avec Tauri

```bash
npm run tauri dev
# Lance Vite + la fenêtre Tauri en parallèle
```

### Build de production

```bash
npm run build          # Build Vite → dist/
npm run tauri build    # Build Tauri complet (installeur natif)
```

---

## Backend Laravel

```bash
# Dans le dossier du backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate          # Inclut la migration best_score
php artisan serve            # Lance sur http://localhost:8000
```

---

## Configuration Tauri

Dans `src-tauri/tauri.conf.json`, vérifie ces champs :

```json
{
  "build": {
    "devUrl": "http://localhost:1420",
    "frontendDist": "../dist"
  }
}
```

> Si ton projet utilisait un autre port (ex: 3000), remplace `1420`.

---

## Routing

| Route | Page | Accès |
|-------|------|-------|
| `/auth` | Connexion / Inscription | Public |
| `/home` | Accueil | Connecté |
| `/game` | Jeu (`?mode=screenshot\|description\|portrait`) | Connecté |
| `/leaderboard` | Classement | Connecté |
| `/profile` | Profil | Connecté |
| `/mod/animes` | Gestion des animés | Modérateur+ |
| `/mod/reports` | Signalements | Modérateur+ |
| `/admin/users` | Utilisateurs | Admin |
| `/admin/server` | Métriques serveur | Admin |
| `/admin/stats` | Statistiques | Admin |

> **Note Tauri :** Si tu rencontres des problèmes de navigation au rechargement, remplace `<Router>` par `<HashRouter>` dans `App.jsx`. Les URLs passeront en `#/home`, `#/game`, etc.

---

## Système de score

Le score est calculé sur **1000 points** (10 rounds × 100 pts max par round).

| Rang | Score | Couleur |
|------|-------|---------|
| S | 900 – 1000 | Vert (`#00d4aa`) |
| A | 700 – 899 | Bleu (`#4d9fff`) |
| B | 500 – 699 | Or (`#f5c842`) |
| C | 300 – 499 | Orange (`#ff8c42`) |
| D | 0 – 299 | Rouge (`#e8365d`) |

Les points sont calculés côté backend : `max(0, 1000 - temps_ms / 20)`, puis normalisés sur 100 côté frontend.

---

## État global (store)

```js
import { authStore, setSession, clearSession, isLoggedIn } from './store/auth';

authStore.user    // { id, pseudo, role, xp, ... }
authStore.token   // string | null

setSession(token, user)   // connexion
clearSession()            // déconnexion
```

Le token est persisté dans `localStorage` (compatible WebView Tauri).

---

## Modifications backend

Deux fichiers Laravel mis à jour (dans le zip `animeguesser-frontend-backend.zip`) :

- **`ProfileController.php`** — `GET /api/profile` retourne maintenant `mode_stats` avec les stats par mode (screenshot, description, portrait).
- **`GameController.php`** — Score sur 1000 pts explicite, retourne `max_points`, met à jour `best_score` en fin de partie.
- **Migration** `add_best_score_to_users.php` — Ajoute la colonne `best_score` sur `users`. Lancer avec `php artisan migrate`.