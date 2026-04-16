FROM alpine:3.19

RUN apk add --no-cache \
        mysql-client \
        dcron \
        gzip \
        tzdata \
        bash

# Les scripts viennent du dossier backup/ à la racine (context dans docker-compose)
COPY backup.sh  /usr/local/bin/backup.sh
COPY status.sh  /usr/local/bin/status.sh
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/status.sh

# Cron : tous les jours à 2h00 UTC
RUN echo "0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" | crontab -

RUN mkdir -p /backups /var/log

VOLUME ["/backups"]

CMD ["crond", "-f", "-l", "2"]
