FROM apify/actor-node-puppeteer:latest

USER 0 # Switch to root user

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

# Install system dependencies (all in ONE RUN command)
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

# Verify Chromium installation
RUN which chromium-browser || which chromium

# Set Puppeteer cache permissions
RUN mkdir -p /home/node/.cache/puppeteer && chown -R node:node /home/node/.cache

USER node # Switch back to non-root user

COPY . ./

RUN npm install --quiet --only=prod --no-optional && (npm list || true)

RUN chmod +x /usr/src/app/src/main.js
