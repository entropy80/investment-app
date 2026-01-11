# Development Environment Reference

## Deployment Overview

| Environment | Hosting | Database | URL |
|-------------|---------|----------|-----|
| **Production** | Vercel | Neon PostgreSQL 17 | https://your-domain.com |
| **Development** | Local/PM2 | PostgreSQL 17 (localhost) | http://localhost:3000 |

---

## Local Development Setup

### Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm package manager
- PostgreSQL 17
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-username/investment-app.git
cd investment-app

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database credentials

# Run database migrations
pnpm prisma migrate dev

# Start development server
pnpm dev
```

---

## PM2 Production Setup (Optional)

For self-hosting with PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Set environment variable for app directory
export PM2_APP_DIR=$(pwd)

# Start the application
pm2 start ecosystem.config.js

# View status and logs
pm2 list
pm2 logs investment-app
```

---

## Environment Variables

See `.env.example` for required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Secret for NextAuth.js
- `NEXTAUTH_URL` - Base URL of your application
- `FMP_API_KEY` - Financial Modeling Prep API key (optional)
- `ALPHA_VANTAGE_API_KEY` - Alpha Vantage API key (optional)

---

## Utility Scripts

```bash
# Seed demo user for testing
node scripts/seed-demo-user.mjs

# Query documents in a portfolio
node scripts/query-docs.mjs <portfolio-id>

# Fetch and display document content
node scripts/fetch-doc.mjs <document-id>

# Check transaction summary for a portfolio
node scripts/check-transactions.mjs <portfolio-id>
```

---

## Documentation Structure

```
docs/
├── README.md                    # Technical reference (main)
├── CLAUDE.md                    # Development setup guide
├── ACKNOWLEDGMENTS.md           # Credits/attributions
├── CHANGELOG.md                 # Version history
├── upcoming_phases.md           # Project roadmap
│
├── api/                         # API integrations & models
├── csv-parsing/                 # CSV import documentation
├── database/                    # Database documentation
├── deployment/                  # Hosting & infrastructure
├── security/                    # Security documentation
└── maintenance/                 # Audits & upkeep
```

---

## Additional Resources

- [Migration Guide: Vercel + Neon](deployment/migration-vercel-neon.md)
- [Security Practices](security/security-practices.md)
- [Database Schema](database/schema-overview.md)
