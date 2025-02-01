FROM node:18-bullseye-slim

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

USER 0

RUN echo "deb http://deb.debian.org/debian bullseye-backports main contrib non-free" >> /etc/apt/sources.list

RUN apt-get update && \  # && on the same line as apt-get update
    apt-get install -y --no-install-recommends \
        chromium -t bullseye-backports \
        fonts-liberation \
        libasound2 \
        libatk-bridge2.0-0 \
        libatk1.0-0 \
        libcairo2 \
        libcups2 \
        libdbus-1-3 \
        libdrm2 \
        libgbm1 \
        libglib2.0-0 \
        libnspr4 \
        libnss3 \
        libpango-1.0-0 \
        libx11-6 \
        libxcb1 \
        libxcomposite1 \
        libxdamage1 \
        libxext6 \
        libxfixes3 \
        libxrandr2 \
        libxshmfence1 \
        xdg-utils \
        && apt-get clean \ # && on the same line as the last package
        && rm -rf /var/lib/apt/lists/*  # && on the same line as apt-get clean

RUN which chromium || { echo "Chromium not found!"; exit 1; }

RUN mkdir -p /home/node/.cache/puppeteer && chown -R node:node /home/node/.cache/puppeteer

USER node

WORKDIR /usr/src/app

COPY . .

RUN npm install --quiet --only=prod --no-optional && npm list || true

RUN chmod +x /usr/src/app/src/main.js
