# Docker Setup for CodeArena Frontend

## Quick Start

### Using Docker Compose (Recommended)

1. **Create environment file:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your actual configuration values.

2. **Build and run:**
   ```bash
   docker-compose up -d
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f frontend
   ```

4. **Stop the container:**
   ```bash
   docker-compose down
   ```

### Using Docker directly

1. **Build the image:**
   ```bash
   docker build -t codearena-frontend \
     --build-arg VITE_APP_URL=http://localhost:80 \
     --build-arg VITE_API_URL=http://localhost:4000 \
     --build-arg VITE_GOOGLE_CLIENT_ID=your_client_id \
     --build-arg VITE_ENABLE_PAYWALL=false \
     --build-arg VITE_PRESENCE_URL=ws://localhost:4000/presence \
     .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name codearena-frontend \
     -p 80:80 \
     codearena-frontend
   ```

3. **View logs:**
   ```bash
   docker logs -f codearena-frontend
   ```

4. **Stop the container:**
   ```bash
   docker stop codearena-frontend
   docker rm codearena-frontend
   ```

## Environment Variables

Build-time variables (set during Docker build):
- **VITE_APP_URL** - Public URL of the deployed site (for link previews)
- **VITE_API_URL** - Backend API URL
- **VITE_GOOGLE_CLIENT_ID** - Google OAuth client ID
- **VITE_ENABLE_PAYWALL** - Enable/disable paywall feature
- **VITE_PRESENCE_URL** - WebSocket URL for live presence

## Architecture

This Docker setup uses a **multi-stage build**:

1. **Builder Stage:** Node.js 20 Alpine builds the React app with Vite
2. **Production Stage:** Nginx Alpine serves the static files with optimized configuration

Benefits:
- Smaller final image size
- Optimized static file serving
- Built-in gzip compression
- SPA routing support
- Security headers

## Ports

- **80** - HTTP server (nginx)

## Nginx Configuration

The nginx configuration includes:
- Gzip compression for better performance
- Static asset caching (1 year)
- SPA routing (all routes go to index.html)
- Security headers
- Health check endpoint at `/health`

## Development vs Production

- **Development:** Use `npm run dev` with Vite dev server
- **Production:** Use Docker with nginx for optimal performance
