# Investment App

Personal investment portfolio tracker and financial content platform.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.1 (App Router) |
| Runtime | Node.js 24.12.0 LTS |
| Language | TypeScript 5.x |
| Database | PostgreSQL 17.7 |
| ORM | Prisma 6.19 |
| Auth | NextAuth.js |
| Styling | Tailwind CSS 4.x |
| MDX | next-mdx-remote 5.x, remark-gfm 4.x |
| Package Manager | pnpm 10.26 |

## Environment

### Production (Vercel + Neon)

| Service | Details |
|---------|---------|
| Hosting | Vercel (Hobby tier) |
| Database | Neon PostgreSQL 17 (us-east-1) |
| Domain | https://investment-app.com |
| DNS | Cloudflare |

### Development (Local)

| Service | Details |
|---------|---------|
| Database | PostgreSQL 17 on localhost:5432 |
| DB Name | investment_app |
| Access URL | http://localhost:3000 |

## Quick Start

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm prisma migrate deploy

# Start development server
pnpm dev

# Production build
pnpm build && pnpm start

# Production with PM2
pm2 start ecosystem.config.js
```

## Project Structure

```
src/
├── app/           # Next.js App Router pages
├── components/    # React components
├── lib/           # Utilities and services
└── types/         # TypeScript definitions
prisma/
└── schema.prisma  # Database schema
```

## Features

- User authentication with 2FA support
- Portfolio management (accounts, holdings, transactions)
- CSV import from Schwab, IBKR, Chase, Bank of America, NBK
- Real-time price tracking (FMP, Alpha Vantage)
- Multi-currency support (USD, EUR, GBP, CHF, KWD)
- Tax lot tracking (FIFO) with Form 8949 generation
- Historical performance charts
- Budget tracking
- Educational content (articles, videos, broker reviews)
- Admin panel with role-based access control

## Future Development

- [ ] Email notifications (Resend integration)
- [ ] Vercel Cron for scheduled price refresh
- [ ] Additional broker/bank CSV parsers
