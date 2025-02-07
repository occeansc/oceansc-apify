# Stage 1: Build the app
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Stage 2: Create the final image
FROM node:18-alpine
WORKDIR /app

COPY --from=build /app/config.js ./
COPY --from=build /app/main.js ./
COPY --from=build /app/package.json ./
COPY --from=build /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules/

USER node

CMD ["node", "main.js"]