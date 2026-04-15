# ════════════════════════════════════════════════════════
#  Backend Dockerfile
#  context = ./backend  (racine du projet Laravel)
#
#  Ce Dockerfile est dans docker/backend/Dockerfile
#  Il n'y a RIEN à ajouter dans le dossier backend/
#  Composer est installé ici, pas sur la machine hôte
# ════════════════════════════════════════════════════════

FROM php:8.2-fpm-alpine

# ── Dépendances système ──────────────────────────────────
RUN apk add --no-cache \
        nginx \
        supervisor \
        mysql-client \
        libpng-dev \
        libzip-dev \
        zip unzip git curl bash

# ── Extensions PHP pour Laravel ─────────────────────────
RUN docker-php-ext-install \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        opcache

# ── Composer — copié depuis l'image officielle ───────────
#    Rien à installer sur la machine hôte
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# ── Dépendances Composer ─────────────────────────────────
#    On copie uniquement composer.json d'abord (cache layer)
#    Si composer.lock absent → composer le génère
COPY composer.json ./
RUN composer install \
        --no-dev \
        --no-interaction \
        --prefer-dist \
        --optimize-autoloader \
    && composer clear-cache

# ── Code source Laravel ──────────────────────────────────
COPY . .

# ── Setup Laravel ────────────────────────────────────────
RUN mkdir -p \
        storage/logs \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        bootstrap/cache \
    && php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# ── Config Nginx ─────────────────────────────────────────
#    Inline — rien à copier depuis le projet
RUN printf 'server {\n\
    listen 8000;\n\
    root /var/www/html/public;\n\
    index index.php;\n\
    client_max_body_size 50M;\n\
    location / { try_files $uri $uri/ /index.php?$query_string; }\n\
    location ~ \\.php$ {\n\
        fastcgi_pass   127.0.0.1:9000;\n\
        fastcgi_index  index.php;\n\
        fastcgi_param  SCRIPT_FILENAME $realpath_root$fastcgi_script_name;\n\
        include        fastcgi_params;\n\
    }\n\
    location /health { return 200 "ok\\n"; add_header Content-Type text/plain; }\n\
}\n' > /etc/nginx/http.d/default.conf

# ── Config Supervisor ────────────────────────────────────
RUN mkdir -p /etc/supervisor/conf.d && \
    printf '[supervisord]\n\
nodaemon=true\n\
logfile=/dev/null\n\
logfile_maxbytes=0\n\
pidfile=/var/run/supervisord.pid\n\
\n\
[program:nginx]\n\
command=nginx -g "daemon off;"\n\
autostart=true\n\
autorestart=true\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n\
\n\
[program:php-fpm]\n\
command=php-fpm -F\n\
autostart=true\n\
autorestart=true\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n\
\n\
[program:laravel-migrate]\n\
command=php /var/www/html/artisan migrate --force\n\
autostart=true\n\
autorestart=false\n\
startsecs=0\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n' > /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
