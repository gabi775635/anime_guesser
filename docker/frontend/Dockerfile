# ── Stage 1 : Build SolidJS ─────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copie dépendances en premier (cache layer)
COPY package*.json ./
RUN npm ci

# Copie sources et build
COPY . .
RUN npm run build

# ── Stage 2 : Serve avec Nginx ───────────────
FROM nginx:1.25-alpine

# Config Nginx pour SPA (toutes les routes → index.html)
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

# Copie le build
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
