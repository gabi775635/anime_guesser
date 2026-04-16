FROM alpine:3.19

# mysql-client pour mysqldump, cronie pour le cron, gzip pour compression
RUN apk add --no-cache \
        mysql-client \
        dcron \
        gzip \
        tzdata \
        bash

# Script de backup
COPY backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# Script de status (lu par le dashboard)
COPY status.sh /usr/local/bin/status.sh
RUN chmod +x /usr/local/bin/status.sh

# Cron job : tous les jours à 2h00
RUN echo "0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" | crontab -

# Dossier de stockage des snapshots
RUN mkdir -p /backups /var/log

VOLUME ["/backups"]

CMD ["crond", "-f", "-l", "2"]
