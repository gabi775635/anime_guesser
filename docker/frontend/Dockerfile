# ════════════════════════════════════════════════════════
#  Frontend Dockerfile
#  context = ./frontend  (racine du projet SolidJS)
#
#  Ce Dockerfile est dans docker/frontend/Dockerfile
#  Node/npm installés ici — rien sur la machine hôte
#  Build SolidJS → Nginx SPA
# ════════════════════════════════════════════════════════

# ── Stage 1 : Build ──────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copie package.json en premier pour profiter du cache Docker
# Si package-lock.json existe : npm ci (reproductible)
# Sinon : npm install (génère le lock)
COPY package*.json ./
RUN if [ -f package-lock.json ]; then \
        npm ci --silent; \
    else \
        npm install --silent; \
    fi

# Copie tout le source
COPY . .

# Build de production
RUN npm run build

# ── Stage 2 : Serve ──────────────────────────────────────
FROM nginx:1.25-alpine

# Copie le build depuis le stage précédent
COPY --from=builder /app/dist /usr/share/nginx/html

# Config Nginx SPA inline
RUN printf 'server {\n\
    listen 80;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    gzip on;\n\
    gzip_types text/plain text/css application/json application/javascript text/javascript;\n\
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location /health {\n\
        return 200 "ok\\n";\n\
        add_header Content-Type text/plain;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
