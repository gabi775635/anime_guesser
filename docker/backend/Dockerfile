# ── PHP 8.2 avec FPM ────────────────────────
# context = ./backend (racine du projet Laravel)
FROM php:8.2-fpm-alpine

# Extensions PHP
RUN apk add --no-cache \
        nginx supervisor mysql-client \
        libpng-dev libzip-dev zip unzip git curl \
    && docker-php-ext-install \
        pdo_mysql mbstring exif pcntl bcmath gd zip opcache

# Composer installé DANS l'image — pas besoin sur la machine hôte
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# ── Dépendances Composer ──────────────────
# Si composer.lock existe on l'utilise, sinon composer génère un lock frais
COPY composer.json ./
# Copie composer.lock seulement s'il existe (glob trick)
COPY composer.jso[n] composer.loc[k] ./
RUN composer install \
        --no-dev \
        --no-scripts \
        --no-interaction \
        --prefer-dist \
        --optimize-autoloader

# ── Code source ───────────────────────────
COPY . .

# ── Finalisation Laravel ─────────────────
# Crée les dossiers requis si absents (repo propre)
RUN mkdir -p storage/logs \
             storage/framework/cache \
             storage/framework/sessions \
             storage/framework/views \
             bootstrap/cache \
    && composer dump-autoload --optimize \
    && php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache \
    && chown -R www-data:www-data storage bootstrap/cache

# ── Configs Nginx + Supervisor ────────────
# Les configs sont dans docker/backend/docker/ mais le context est ./backend
# On les embarque via COPY depuis un chemin relatif au context
COPY docker/nginx.conf      /etc/nginx/http.d/default.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 8000
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
