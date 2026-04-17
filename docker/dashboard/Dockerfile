FROM node:20-alpine

WORKDIR /app

# ── Dépendances Node ──────────────────────────────────────────────────────────
COPY backend/package.json ./
RUN npm install --omit=dev

# ── Sources backend ────────────────────────────────────────────────────────────
COPY backend/ ./

# ── Frontend statique ──────────────────────────────────────────────────────────
# Le dossier frontend/ est servi en statique par Express
COPY frontend/ ./frontend/

EXPOSE 9000

CMD ["node", "server.js"]
