FROM alpine:3.19

RUN apk add --no-cache \
        mysql-client \
        gzip \
        tzdata \
        bash

COPY backup.sh  /usr/local/bin/backup.sh
COPY status.sh  /usr/local/bin/status.sh
RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/status.sh

# Cron via busybox (déjà inclus dans alpine — pas besoin de dcron)
RUN echo "0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" \
    > /etc/crontabs/root

RUN mkdir -p /backups /var/log

VOLUME ["/backups"]

# busybox crond : -f = foreground, -l 2 = log level, -d 0 = log to stderr
CMD ["crond", "-f", "-l", "2", "-d", "0"]
