FROM apify/actor-node-puppeteer:latest

# Install gosu for secure user switching
RUN apt-get update && apt-get install -y gosu

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Install system dependencies as root
USER 0
RUN apt-get update && apt-get install -y \
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
    && rm -rf /var/lib/apt/lists/*

RUN which chromium-browser || which chromium

RUN mkdir -p /home/node/.cache/puppeteer && chown -R node:node /home/node/.cache

# Switch to non-root user using gosu
USER node
RUN gosu node

COPY . ./

RUN npm install --quiet --only=prod --no-optional && (npm list || true)

RUN chmod +x /usr/src/app/src/main.js
