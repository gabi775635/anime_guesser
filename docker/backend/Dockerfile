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

# ── Force PHP-FPM à écouter sur 0.0.0.0:9000 (IPv4 + IPv6) ──
RUN sed -i 's|listen = 127.0.0.1:9000|listen = 0.0.0.0:9000|' /usr/local/etc/php-fpm.d/www.conf || true && \
    sed -i 's|listen = 9000|listen = 0.0.0.0:9000|' /usr/local/etc/php-fpm.d/www.conf || true && \
    sed -i 's|;listen = 9000|listen = 0.0.0.0:9000|' /usr/local/etc/php-fpm.d/www.conf || true

# ── Config Nginx — utilise 0.0.0.0:9000 pour joindre FPM ─
RUN printf 'server {\n\
    listen 10000;\n\
    root /var/www/public;\n\
    index index.php;\n\
    client_max_body_size 50M;\n\
    location / { try_files $uri $uri/ /index.php?$query_string; }\n\
    location ~ \.php$ {\n\
        fastcgi_pass   0.0.0.0:9000;\n\
        fastcgi_index  index.php;\n\
        fastcgi_param  SCRIPT_FILENAME $realpath_root$fastcgi_script_name;\n\
        include        fastcgi_params;\n\
    }\n\
    location /health { return 200 "ok"; add_header Content-Type text/plain; }\n\
}\n' > /etc/nginx/http.d/default.conf

# ── Config Supervisor ─────────────────────────────────────
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
