# Stage 1: Build the app with development dependencies
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev  # Install dev dependencies for linting
COPY . .
RUN npm run lint  # Run linting

# Stage 2: Create optimized production image
FROM node:18-alpine
WORKDIR /app

# Install curl for health checks (and tini if you need it)
RUN apk add --no-cache curl tini

# Copy only the necessary files from the build stage
COPY --from=build /app/config.js ./
COPY --from=build /app/main.js ./
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules/
COPY --from=build /app/error-handler.js ./  
COPY --from=build /app/scraping-middleware.js ./ 

# Create separate user with restricted permissions (important for security)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose the port (if your app needs to listen on a port)
# EXPOSE 3000  # Uncomment if needed - replace 3000 with your port

# Health check (important for Docker's self-healing)
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1 # Create a health endpoint in your app

# Use tini as the entrypoint (process manager)
ENTRYPOINT ["/tini", "--"]

CMD ["node", "--trace-warnings", "main.js"] # Run the app