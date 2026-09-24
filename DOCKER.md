# Docker Setup for CodeArena

This guide explains how to run the entire CodeArena application (frontend + backend) using Docker.

## Quick Start

### 1. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your actual configuration values:
- Database credentials
- Google OAuth client ID
- JWT secret
- API URLs

### 2. Build and Run All Services

```bash
docker-compose up -d
```

This will start:
- **Backend** on port 4000
- **Frontend** on port 80

### 3. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 4. Stop Services

```bash
docker-compose down
```

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   Frontend      │         │    Backend      │
│   (React/Nginx) │◄────────│  (Node/Express) │
│   Port 80       │         │    Port 4000    │
└─────────────────┘         └─────────────────┘
                                      │
                                      ▼
                              ┌─────────────────┐
                              │   MySQL DB      │
                              │   (External)    │
                              └─────────────────┘
```

## Individual Services

### Backend Only

```bash
cd codearena-backend
docker-compose up -d
```

### Frontend Only

```bash
cd codearena-frontend
docker-compose up -d
```

## Environment Variables

### Backend Variables
- `NODE_ENV` - Environment (production/development)
- `PORT` - Backend port (default: 4000)
- `CLIENT_ORIGINS` - CORS allowed origins
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - MySQL configuration
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `JWT_ACCESS_SECRET` - JWT signing secret
- `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL_DAYS` - Token expiration
- `COOKIE_SAMESITE`, `COOKIE_SECURE` - Cookie security settings

### Frontend Variables (Build-time)
- `VITE_APP_URL` - Public URL for link previews
- `VITE_API_URL` - Backend API URL
- `VITE_GOOGLE_CLIENT_ID` - Google OAuth client ID
- `VITE_ENABLE_PAYWALL` - Enable/disable paywall
- `VITE_PRESENCE_URL` - WebSocket URL for live presence

## Database Setup

Before running the containers, ensure your MySQL database is ready:

1. Create the database:
   ```bash
   cd codearena-backend
   npm run db:create
   ```

2. Run migrations:
   ```bash
   npm run db:migrate
   ```

## Troubleshooting

### Build Issues

If you encounter build errors, try rebuilding without cache:
```bash
docker-compose build --no-cache
docker-compose up -d
```

### Permission Issues

If you encounter permission issues, ensure your `.env` file has the correct permissions:
```bash
chmod 600 .env
```

### Port Conflicts

If ports 80 or 4000 are already in use, modify the ports in `docker-compose.yml`:
```yaml
services:
  backend:
    ports:
      - "4001:4000"  # Use 4001 instead of 4000
  frontend:
    ports:
      - "8080:80"    # Use 8080 instead of 80
```

### Container Not Starting

Check logs for specific errors:
```bash
docker-compose logs backend
docker-compose logs frontend
```

## Production Deployment

For production deployment:

1. **Use environment-specific `.env` file**
2. **Set `COOKIE_SECURE=true`**
3. **Use real domain names in `VITE_APP_URL` and `CLIENT_ORIGINS`**
4. **Configure SSL/TLS termination** (reverse proxy like nginx or Traefik)
5. **Use secrets management** for sensitive data
6. **Set up proper database backups**

## Development

For local development, it's recommended to run services directly without Docker:

```bash
# Backend
cd codearena-backend
npm install
npm run dev

# Frontend (new terminal)
cd codearena-frontend
npm install
npm run dev
```

## Health Checks

- **Frontend:** http://localhost/health
- **Backend:** http://localhost:4000/api (check API endpoints)

## Additional Documentation

- [Backend Docker Setup](./codearena-backend/DOCKER.md)
- [Frontend Docker Setup](./codearena-frontend/DOCKER.md)
