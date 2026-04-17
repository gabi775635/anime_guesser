FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    software-properties-common \
    ca-certificates curl wget git unzip \
    && add-apt-repository universe \
    && apt-get update

RUN apt-get install -y \
    build-essential pkg-config \
    libssl-dev \
    libgtk-3-dev \
    libwebkit2gtk-4.0-dev \
    librsvg2-dev \
    patchelf \
    squashfs-tools binutils \
    tzdata cron \
    mingw-w64 \
    openjdk-17-jdk \
    && rm -rf /var/lib/apt/lists/*

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH="${PATH}:${JAVA_HOME}/bin"

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

RUN curl https://sh.rustup.rs -sSf | sh -s -- -y --default-toolchain stable
ENV PATH="/root/.cargo/bin:${PATH}"

RUN rustup target add x86_64-pc-windows-gnu \
    && rustup target add aarch64-linux-android \
    && rustup target add armv7-linux-androideabi \
    && rustup target add i686-linux-android \
    && rustup target add x86_64-linux-android

RUN cargo install tauri-cli --version "^2.0" --locked

ENV ANDROID_HOME=/opt/android-sdk
ENV NDK_VERSION=25.2.9519653
ENV NDK_HOME=${ANDROID_HOME}/ndk/${NDK_VERSION}
ENV PATH="${PATH}:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools"

RUN mkdir -p ${ANDROID_HOME}/cmdline-tools \
    && wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/cmdline-tools.zip \
    && unzip -q /tmp/cmdline-tools.zip -d ${ANDROID_HOME}/cmdline-tools \
    && mv ${ANDROID_HOME}/cmdline-tools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest \
    && rm /tmp/cmdline-tools.zip

RUN yes | sdkmanager --licenses > /dev/null 2>&1 \
    && sdkmanager \
        "platform-tools" \
        "platforms;android-33" \
        "build-tools;33.0.0" \
        "ndk;${NDK_VERSION}"

RUN mkdir -p /releases /var/log /app
WORKDIR /app

COPY build-release.sh /usr/local/bin/build-release.sh
RUN sed -i 's/\r//g' /usr/local/bin/build-release.sh \
    && chmod +x /usr/local/bin/build-release.sh

RUN echo "30 3 * * * root /usr/local/bin/build-release.sh >> /var/log/version-server.log 2>&1" \
    > /etc/cron.d/version-server && \
    chmod 644 /etc/cron.d/version-server

RUN touch /var/log/version-server.log

CMD ["cron", "-f"]