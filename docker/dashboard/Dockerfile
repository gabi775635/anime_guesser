FROM node:20-alpine

WORKDIR /app

# Dépendances Node
COPY backend/package.json ./
RUN npm install --omit=dev

# Sources backend (copiées à la racine /app)
COPY backend/ ./

# Frontend statique (copié dans /app/frontend)
COPY frontend/ ./frontend/

EXPOSE 9000

CMD ["node", "server.js"]
