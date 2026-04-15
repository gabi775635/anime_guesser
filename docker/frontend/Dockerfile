# ── Stage 1 : Build SolidJS ─────────────────
# context = ./frontend (racine du projet SolidJS)
# Node et npm sont dans l'image — pas besoin sur la machine hôte
FROM node:20-alpine AS builder

WORKDIR /app

# Copie package.json en premier pour le cache des layers
COPY package*.json ./

# npm ci installe exactement ce qui est dans package-lock.json
# Si pas de lock : npm install génère le lock
RUN if [ -f package-lock.json ]; then \
        npm ci; \
    else \
        npm install; \
    fi

# Copie tout le source et build
COPY . .
RUN npm run build

# ── Stage 2 : Serve avec Nginx ───────────────
FROM nginx:1.25-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Config SPA inline — pas besoin de fichier externe
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
    location / { try_files $uri $uri/ /index.html; }\n\
    location /health { return 200 "ok\\n"; add_header Content-Type text/plain; }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
