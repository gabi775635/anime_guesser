FROM php:8.2-fpm-alpine

# ── Dépendances système ───────────────────────────────────
RUN apk add --no-cache \
        nginx supervisor mysql-client \
        libpng-dev libjpeg-turbo-dev freetype-dev \
        libzip-dev zip unzip \
        git curl bash \
        oniguruma-dev

# ── Extensions PHP ────────────────────────────────────────
RUN docker-php-ext-configure gd \
        --with-freetype \
        --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        opcache

# ── Composer ──────────────────────────────────────────────
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# ── Le WORKDIR est le chemin DANS le conteneur ───────────
#    Peu importe où le code est sur le serveur hôte
#    Docker copie tout ici au moment du build
WORKDIR /var/www

# ── Copie tout le code source Laravel ────────────────────
#    context = ./backend dans docker-compose.yml
#    donc "." = tout le contenu de ton dossier backend/
COPY . .

# ── Vérification que le projet Laravel est complet ────────
RUN if [ ! -f composer.json ]; then \
        echo "ERREUR : composer.json manquant" && exit 1; \
    fi && \
    if [ ! -f public/index.php ]; then \
        echo "ERREUR : public/index.php manquant — projet Laravel incomplet" && exit 1; \
    fi

# ── Install des dépendances Composer ─────────────────────
RUN composer install \
        --no-dev \
        --no-interaction \
        --prefer-dist \
        --optimize-autoloader \
    && composer clear-cache

# ── Setup Laravel ─────────────────────────────────────────
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

# ── Config Nginx inline ───────────────────────────────────
RUN printf 'server {\n\
    listen 10000;\n\
    root /var/www/public;\n\
    index index.php;\n\
    client_max_body_size 50M;\n\
    location / { try_files $uri $uri/ /index.php?$query_string; }\n\
    location ~ \\.php$ {\n\
        fastcgi_pass   127.0.0.1:8000;\n\
        fastcgi_index  index.php;\n\
        fastcgi_param  SCRIPT_FILENAME $realpath_root$fastcgi_script_name;\n\
        include        fastcgi_params;\n\
    }\n\
    location /health { return 200 "ok\\n"; add_header Content-Type text/plain; }\n\
}\n' > /etc/nginx/http.d/default.conf

# ── Config Supervisor inline ──────────────────────────────
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
command=php /var/www/artisan migrate --force\n\
autostart=true\n\
autorestart=false\n\
startsecs=0\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n' > /etc/supervisor/conf.d/supervisord.conf

EXPOSE 10000
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
