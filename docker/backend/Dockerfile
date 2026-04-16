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

WORKDIR /var/www

COPY . .

# Supprime le .env local — les variables viennent de docker-compose
RUN rm -f .env

RUN if [ ! -f composer.json ]; then \
        echo "ERREUR : composer.json manquant" && exit 1; \
    fi && \
    if [ ! -f public/index.php ]; then \
        echo "ERREUR : public/index.php manquant" && exit 1; \
    fi

RUN composer install \
        --no-dev \
        --no-interaction \
        --prefer-dist \
        --optimize-autoloader \
    && composer clear-cache

# Crée les dossiers nécessaires sans faire config:cache au build
# (config:cache nécessite une DB connectée, on le fait au démarrage)
RUN mkdir -p \
        storage/logs \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# ── Force PHP-FPM sur 127.0.0.1:9000 ─────────────────────
# On remplace la config pour écouter sur toutes interfaces
RUN echo "listen = 127.0.0.1:9000" >> /usr/local/etc/php-fpm.d/zz-docker.conf

# ── Config Nginx ──────────────────────────────────────────
RUN printf 'server {\n\
    listen 10000;\n\
    root /var/www/public;\n\
    index index.php;\n\
    client_max_body_size 50M;\n\
    location / { try_files $uri $uri/ /index.php?$query_string; }\n\
    location ~ \\.php$ {\n\
        fastcgi_pass   127.0.0.1:9000;\n\
        fastcgi_index  index.php;\n\
        fastcgi_param  SCRIPT_FILENAME $realpath_root$fastcgi_script_name;\n\
        include        fastcgi_params;\n\
    }\n\
    location /health { return 200 "ok"; add_header Content-Type text/plain; }\n\
}\n' > /etc/nginx/http.d/default.conf

# ── Config Supervisor ─────────────────────────────────────
# php-fpm démarre en premier, nginx après
# laravel-setup fait config:cache + migrate au démarrage (DB dispo)
RUN mkdir -p /etc/supervisor/conf.d && \
    printf '[supervisord]\n\
nodaemon=true\n\
logfile=/dev/null\n\
logfile_maxbytes=0\n\
pidfile=/var/run/supervisord.pid\n\
\n\
[program:php-fpm]\n\
command=php-fpm -F\n\
autostart=true\n\
autorestart=true\n\
priority=1\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n\
\n\
[program:nginx]\n\
command=nginx -g "daemon off;"\n\
autostart=true\n\
autorestart=true\n\
priority=2\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n\
\n\
[program:laravel-setup]\n\
command=/bin/sh -c "sleep 2 && php /var/www/artisan config:cache && php /var/www/artisan route:cache && php /var/www/artisan migrate --force"\n\
autostart=true\n\
autorestart=false\n\
startsecs=0\n\
priority=10\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n' > /etc/supervisor/conf.d/supervisord.conf

EXPOSE 10000
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]