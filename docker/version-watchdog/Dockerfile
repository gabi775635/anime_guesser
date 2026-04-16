FROM alpine:3.19

RUN apk add --no-cache \
        bash \
        nodejs \
        git \
        dcron \
        tzdata

# Le script vient du dossier scripts/ à la racine
COPY bump-version.sh /usr/local/bin/bump-version.sh
RUN chmod +x /usr/local/bin/bump-version.sh

# Cron : tous les jours à 3h00 (1h après le backup pour éviter les conflits)
RUN echo "0 3 * * * /usr/local/bin/bump-version.sh >> /var/log/version-watchdog.log 2>&1" | crontab -

RUN mkdir -p /var/log

CMD ["crond", "-f", "-l", "2"]
