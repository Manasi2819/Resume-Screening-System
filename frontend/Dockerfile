# ── Stage 1: Build ────────────────────────────────────────────────────────────
# Use Node.js 20 to build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (Docker caches this layer)
COPY package.json package-lock.json ./

# Install all Node dependencies
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the production bundle (outputs to /app/dist)
# VITE_API_URL tells the frontend where the backend lives in production
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
# Use Nginx (tiny, fast web server) to serve the built React files
FROM nginx:1.27-alpine AS runtime

# Remove the default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy our custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built React app from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 (standard HTTP port)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1

# Start Nginx in the foreground (required for Docker)
CMD ["nginx", "-g", "daemon off;"]
