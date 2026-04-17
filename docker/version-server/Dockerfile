FROM ubuntu:22.04

# ── Dépendances système ────────────────────────────────────────────────────────
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y \
    curl wget git nodejs npm \
    build-essential pkg-config \
    libssl-dev libgtk-3-dev libwebkit2gtk-4.0-dev \
    libappindicator3-dev librsvg2-dev patchelf \
    squashfs-tools binutils \
    tzdata cron \
    && rm -rf /var/lib/apt/lists/*

# ── Rust + Cargo ──────────────────────────────────────────────────────────────
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y --default-toolchain stable
ENV PATH="/root/.cargo/bin:${PATH}"

# ── Tauri CLI ─────────────────────────────────────────────────────────────────
RUN cargo install tauri-cli --version "^1.6" --locked

# ── Android SDK (optionnel, commenté par défaut pour alléger l'image) ─────────
# Pour activer le build Android, décommenter ci-dessous et rebuilder :
# RUN apt-get install -y openjdk-17-jdk android-sdk
# ENV ANDROID_HOME=/usr/lib/android-sdk
# RUN cargo install tauri-cli --features android --locked

# ── Répertoires ───────────────────────────────────────────────────────────────
RUN mkdir -p /releases /var/log /app
WORKDIR /app

# ── Script de build ────────────────────────────────────────────────────────────
COPY build-release.sh /usr/local/bin/build-release.sh
RUN chmod +x /usr/local/bin/build-release.sh

# ── Cron : build chaque nuit à 03h30 (après le bump-version à 03h00) ──────────
RUN echo "30 3 * * * root /usr/local/bin/build-release.sh >> /var/log/version-server.log 2>&1" \
    > /etc/cron.d/version-server && \
    chmod 644 /etc/cron.d/version-server

RUN touch /var/log/version-server.log

CMD ["cron", "-f"]
