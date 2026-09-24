# Docker Setup for CodeArena Backend

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
   docker-compose logs -f backend
   ```

4. **Stop the container:**
   ```bash
   docker-compose down
   ```

### Using Docker directly

1. **Build the image:**
   ```bash
   docker build -t codearena-backend .
   ```

2. **Run the container:**
   ```bash
   docker run -d \
     --name codearena-backend \
     -p 4000:4000 \
     --env-file .env \
     codearena-backend
   ```

3. **View logs:**
   ```bash
   docker logs -f codearena-backend
   ```

4. **Stop the container:**
   ```bash
   docker stop codearena-backend
   docker rm codearena-backend
   ```

## Environment Variables

Make sure to set these environment variables in your `.env` file:

- **Database:** `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- **Google OAuth:** `GOOGLE_CLIENT_ID`
- **JWT:** `JWT_ACCESS_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS`
- **CORS:** `CLIENT_ORIGINS`
- **Cookies:** `COOKIE_SAMESITE`, `COOKIE_SECURE`

## Database Setup

Before running the container, ensure your MySQL database is set up:

1. Create the database:
   ```bash
   npm run db:create
   ```

2. Run migrations:
   ```bash
   npm run db:migrate
   ```

## Ports

- **4000** - Main API endpoint
- **WebSocket** - Live presence at `/presence`

## Development vs Production

- **Development:** Use `npm run dev` with nodemon for hot reloading
- **Production:** Use Docker with `npm start` for optimized performance
