FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Étape 1 : outils de base + activation universe
RUN apt-get update && apt-get install -y \
    software-properties-common \
    ca-certificates curl wget git \
    && add-apt-repository universe \
    && apt-get update

# Étape 2 : libs de dev
RUN apt-get install -y \
    build-essential pkg-config \
    libssl-dev \
    libgtk-3-dev \
    libwebkit2gtk-4.0-dev \
    librsvg2-dev \
    patchelf \
    squashfs-tools binutils \
    tzdata cron \
    && rm -rf /var/lib/apt/lists/*

# Node via NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Rust
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y --default-toolchain stable
ENV PATH="/root/.cargo/bin:${PATH}"

# Tauri CLI
RUN cargo install tauri-cli --version "^1.6" --locked

RUN mkdir -p /releases /var/log /app
WORKDIR /app

COPY build-release.sh /usr/local/bin/build-release.sh
RUN chmod +x /usr/local/bin/build-release.sh

RUN echo "30 3 * * * root /usr/local/bin/build-release.sh >> /var/log/version-server.log 2>&1" \
    > /etc/cron.d/version-server && \
    chmod 644 /etc/cron.d/version-server

RUN touch /var/log/version-server.log

CMD ["cron", "-f"]
