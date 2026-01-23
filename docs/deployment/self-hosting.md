# Self-Hosting Guide

This guide covers deploying Investment App on your own infrastructure instead of Vercel.

## Prerequisites

- **Node.js 24+** (LTS recommended)
- **pnpm** package manager (`npm install -g pnpm`)
- **PostgreSQL 17+** database
- **Git** for cloning the repository

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/entropy80/investment-app.git
cd investment-app
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

Copy the example environment file and configure it:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your settings (see [Environment Configuration](#environment-configuration) below).

### 4. Set Up Database

Run Prisma migrations to create the database schema:

```bash
pnpm prisma migrate deploy
```

Generate the Prisma client:

```bash
pnpm prisma generate
```

### 5. Build and Start

For production:

```bash
pnpm build
pnpm start
```

For development:

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`.

---

## Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Public URL of your app | `https://investments.example.com` |
| `DATABASE_URL` | PostgreSQL connection string (pooled) | `postgresql://user:pass@host/db` |
| `DIRECT_URL` | PostgreSQL direct connection (for migrations) | `postgresql://user:pass@host/db` |
| `NEXTAUTH_URL` | Same as `NEXT_PUBLIC_APP_URL` | `https://investments.example.com` |
| `NEXTAUTH_SECRET` | Random 32+ character secret | Generate with `openssl rand -base64 48` |

### Storage Configuration

The app supports multiple storage backends for document uploads:

| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_PROVIDER` | Storage backend: `vercel_blob`, `local`, or `s3` | Auto-detected |
| `STORAGE_LOCAL_PATH` | Directory for local file storage | `./uploads` |
| `STORAGE_LOCAL_URL` | URL prefix for serving local files | `/api/storage` |

**For self-hosted deployments, use `STORAGE_PROVIDER=local`.**

The local storage provider:
- Stores files in the `./uploads` directory (or `STORAGE_LOCAL_PATH`)
- Serves files through `/api/storage/...` with authentication
- Requires no external services

### Email Configuration

For password reset and email verification:

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | API key from [Resend](https://resend.com) |
| `EMAIL_FROM` | Sender address (e.g., `"App Name <noreply@domain.com>"`) |

**Alternative:** You can modify `src/lib/email.ts` to use SMTP or another email provider.

### Price API Keys (Optional)

For real-time stock prices:

| Variable | Description |
|----------|-------------|
| `FMP_API_KEY` | [Financial Modeling Prep](https://financialmodelingprep.com/developer/docs/) API key |
| `ALPHA_VANTAGE_API_KEY` | [Alpha Vantage](https://www.alphavantage.co/support/) API key (fallback) |

Without these, the app will still function but won't fetch live prices.

---

## Deployment Options

### Option 1: Docker Compose (Recommended)

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:17
    restart: unless-stopped
    environment:
      POSTGRES_USER: investment
      POSTGRES_PASSWORD: your_secure_password
      POSTGRES_DB: investment_app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U investment"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_APP_URL=https://your-domain.com
      - DATABASE_URL=postgresql://investment:your_secure_password@postgres:5432/investment_app
      - DIRECT_URL=postgresql://investment:your_secure_password@postgres:5432/investment_app
      - NEXTAUTH_URL=https://your-domain.com
      - NEXTAUTH_SECRET=your_32_char_secret_here
      - STORAGE_PROVIDER=local
      - STORAGE_LOCAL_PATH=/app/uploads
    volumes:
      - uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
  uploads:
```

Create a `Dockerfile`:

```dockerfile
FROM node:24-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Build the app
RUN pnpm build

# Create uploads directory
RUN mkdir -p /app/uploads

EXPOSE 3000

# Run migrations and start
CMD pnpm prisma migrate deploy && pnpm start
```

Deploy with:

```bash
docker compose up -d
```

### Option 2: VPS Direct Deployment

1. **Install Node.js 24+:**

```bash
# Using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 24
nvm use 24
```

2. **Install pnpm:**

```bash
npm install -g pnpm
```

3. **Install PostgreSQL:**

```bash
# Debian/Ubuntu
sudo apt update
sudo apt install postgresql-17

# Create database
sudo -u postgres createuser investment
sudo -u postgres createdb -O investment investment_app
sudo -u postgres psql -c "ALTER USER investment PASSWORD 'your_password';"
```

4. **Clone and setup:**

```bash
git clone https://github.com/entropy80/investment-app.git
cd investment-app
pnpm install
cp .env.example .env.local
# Edit .env.local with your settings
pnpm prisma migrate deploy
pnpm build
```

5. **Run with PM2:**

```bash
npm install -g pm2
pm2 start pnpm --name "investment-app" -- start
pm2 save
pm2 startup
```

### Option 3: Proxmox LXC/VM

For Proxmox deployments, use a Debian 13 or Ubuntu 24.04 container/VM and follow the VPS deployment steps above.

Recommended specs:
- **CPU:** 2 cores
- **RAM:** 2 GB minimum, 4 GB recommended
- **Storage:** 20 GB (adjust based on document storage needs)

---

## Reverse Proxy Configuration

### Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # File upload size limit (match MAX_FILE_SIZE in app)
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Caddy

```caddyfile
your-domain.com {
    reverse_proxy localhost:3000
}
```

---

## S3/MinIO Storage (Future)

S3-compatible storage is planned but not yet implemented. When available, configure:

```bash
STORAGE_PROVIDER=s3
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
S3_ENDPOINT=https://s3.amazonaws.com  # Or MinIO endpoint
```

---

## Backup Strategy

### Database Backup

```bash
# Manual backup
pg_dump -U investment investment_app > backup_$(date +%Y%m%d).sql

# Automated daily backup (add to crontab)
0 2 * * * pg_dump -U investment investment_app | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz
```

### File Storage Backup

```bash
# Backup uploads directory
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz ./uploads/

# Sync to remote storage
rsync -avz ./uploads/ backup-server:/backups/investment-app/uploads/
```

### Restore

```bash
# Database
psql -U investment investment_app < backup.sql

# Files
tar -xzf uploads_backup.tar.gz -C /path/to/app/
```

---

## Troubleshooting

### Common Issues

**Database connection refused:**
- Verify PostgreSQL is running: `systemctl status postgresql`
- Check connection string format
- Ensure user has access to the database

**Prisma migration fails:**
- Use `DIRECT_URL` for migrations (not pooled connection)
- Check database user permissions

**File uploads fail:**
- Verify `STORAGE_LOCAL_PATH` directory exists and is writable
- Check file size limits in nginx/reverse proxy configuration

**Authentication issues:**
- Ensure `NEXTAUTH_URL` matches your public URL exactly
- Verify `NEXTAUTH_SECRET` is set and consistent

### Logs

```bash
# PM2 logs
pm2 logs investment-app

# Docker logs
docker compose logs -f app

# System logs
journalctl -u investment-app -f
```

---

## Security Considerations

1. **Use HTTPS:** Always deploy behind a reverse proxy with TLS
2. **Secure secrets:** Never commit `.env` files; use environment variables
3. **Database security:** Use strong passwords and restrict network access
4. **File permissions:** Ensure uploads directory is not web-accessible except through the API
5. **Keep updated:** Regularly update Node.js, dependencies, and the app itself

---

## Getting Help

- **Issues:** [GitHub Issues](https://github.com/entropy80/investment-app/issues)
- **Source Code:** [GitHub Repository](https://github.com/entropy80/investment-app)
