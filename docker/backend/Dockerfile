# ── PHP 8.2 avec FPM ────────────────────────
FROM php:8.2-fpm-alpine

# Extensions PHP nécessaires pour Laravel
RUN apk add --no-cache \
        nginx \
        supervisor \
        mysql-client \
        libpng-dev \
        libzip-dev \
        zip \
        unzip \
    && docker-php-ext-install \
        pdo_mysql \
        mbstring \
        exif \
        pcntl \
        bcmath \
        gd \
        zip \
        opcache

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# Copie dépendances en premier
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --optimize-autoloader

# Copie tout le code
COPY . .

# Finalise l'install
RUN composer dump-autoload --optimize \
    && php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

# Config Nginx pour Laravel
COPY docker/nginx.conf /etc/nginx/http.d/default.conf

# Supervisor pour gérer nginx + php-fpm ensemble
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8000

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
