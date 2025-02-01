FROM node:18-bullseye-slim

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

USER 0

# Add the Debian Backports repository (for Chromium)
RUN echo "deb http://deb.debian.org/debian bullseye-backports main contrib non-free" >> /etc/apt/sources.list

# Update package lists (separate RUN command)
RUN apt-get update

# Install dependencies (separate RUN command for better caching)
RUN apt-get install -y gosu \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    lsb-release \
    xdg-utils \
    wget \
    chromium-browser -t bullseye-backports \
    && rm -rf /var/lib/apt/lists/*

RUN which chromium-browser || which chromium

RUN mkdir -p /home/node/.cache/puppeteer
