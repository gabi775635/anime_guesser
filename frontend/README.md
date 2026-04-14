# Anime Guesser — Frontend Tauri

## Prérequis
- Node.js >= 18
- Rust + Cargo (https://rustup.rs)
- Tauri CLI v2

## Installation

```bash
cd frontend
npm install
```

## Développement

Ouvre **deux terminaux** :

**Terminal 1 — serveur HTML :**
```bash
node server.js
# → http://localhost:1420
```

**Terminal 2 — app Tauri :**
```bash
npm run tauri dev
```

## Build production

```bash
npm run tauri build
# Binaires dans : src-tauri/target/release/bundle/
```

## Configuration API

Dans `src/index.html`, ligne 7, modifie l'URL de l'API si besoin :
```js
const API = 'http://localhost:8000/api';  // ← ton serveur Laravel
```

## Structure

```
frontend/
├── src/
│   └── index.html        ← Toute l'interface (HTML + CSS + JS)
├── src-tauri/
│   ├── src/
│   │   ├── main.rs       ← Entry point Rust
│   │   └── lib.rs        ← App builder Tauri
│   ├── Cargo.toml        ← Dépendances Rust
│   └── tauri.conf.json   ← Config fenêtre & bundle
├── server.js             ← Serveur dev Node.js (port 1420)
└── package.json
```

## Comptes de test (après php setup.php)

| Pseudo      | Mot de passe | Rôle       |
|-------------|--------------|------------|
| admin       | Admin1234!   | Admin      |
| moderator1  | Mod1234!     | Modérateur |
| naruto_fan  | Pass1234!    | Joueur     |
