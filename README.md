# MileageHawk

Track award flight mileage costs across AMEX Membership Rewards transfer partners. Get notified when prices drop below your target thresholds.

## What It Does

MileageHawk monitors award flight pricing from Austin/Dallas to 30+ international destinations across 17 AMEX transfer partner airlines. It scrapes daily availability data from Seats.aero, normalizes prices to AMEX Membership Rewards points, and alerts you when deals appear.

### Key Features

- **Daily price tracking** across Economy Plus, Business, and First Class cabins
- **AMEX points normalization** — see the true cost in Membership Rewards points (accounting for transfer ratios like 1:1, 5:4, 1:1.6)
- **Deal scoring** — prices rated from Fair to Unicorn based on 30-day averages and regional thresholds
- **Configurable alerts** — get notified via Email (Resend) or SMS (Twilio) when prices drop below your target
- **Route browser** with SVG world map visualization and typeahead search
- **Price history charts** (30/60/90 day) with per-airline breakdown
- **Route detail pages** with full price comparison tables across all airlines

### Covered Airlines (17 AMEX Transfer Partners)

| Airline | Program | Ratio | Seats.aero |
|---------|---------|-------|------------|
| Aer Lingus | AerClub | 1:1 | - |
| Aeromexico | Aeromexico Rewards | 1:1.6 | Yes |
| Air Canada | Aeroplan | 1:1 | Yes |
| Air France/KLM | Flying Blue | 1:1 | Yes |
| ANA | Mileage Club | 1:1 | - |
| Avianca | LifeMiles | 1:1 | Yes |
| British Airways | Executive Club | 1:1 | - |
| Cathay Pacific | Asia Miles | 5:4 | - |
| Delta | SkyMiles | 1:1 | Yes |
| Emirates | Skywards | 5:4 | Yes |
| Etihad | Etihad Guest | 1:1 | Yes |
| Iberia | Iberia Plus | 1:1 | - |
| JetBlue | TrueBlue | 5:4 | Yes |
| Qantas | Frequent Flyer | 1:1 | Yes |
| Qatar Airways | Privilege Club | 1:1 | Yes |
| Singapore Airlines | KrisFlyer | 1:1 | Yes |
| Virgin Atlantic | Flying Club | 1:1 | Yes |

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Components)
- **Language**: TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **State**: TanStack React Query
- **Validation**: Zod
- **Notifications**: Resend (email), Twilio (SMS)
- **Data Source**: Seats.aero Pro API
- **Testing**: Vitest (57 tests)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (local or cloud via Neon/Supabase)
- Seats.aero Pro API key ($9.99/month)

### Setup

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd mileage-hawk
   npm install --legacy-peer-deps
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database URL, API keys, etc.
   ```

3. **Set up database**
   ```bash
   npm run db:generate    # Generate Prisma client
   npm run db:push        # Push schema to database
   npm run db:seed        # Seed airlines, airports, and routes
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open** [http://localhost:3000](http://localhost:3000)

### Environment Variables

See `.env.example` for all variables. Required ones:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SEATS_AERO_API_KEY` | Yes | Seats.aero Pro API key |
| `CRON_SECRET` | Yes | Secret for authenticating cron endpoints |
| `NEXTAUTH_SECRET` | For auth | NextAuth.js session secret |
| `RESEND_API_KEY` | For email | Resend API key for email alerts |
| `TWILIO_ACCOUNT_SID` | For SMS | Twilio SID for SMS alerts |
| `TWILIO_AUTH_TOKEN` | For SMS | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | For SMS | Twilio sender number |

## Architecture

### Data Pipeline (Daily Cron)

```
6:00 AM CT  -  Scrape prices from Seats.aero API
                    |
6:30 AM CT  -  Aggregate prices (min/avg/max by route+airline+cabin)
                    |
7:00 AM CT  -  Evaluate alerts (compare thresholds, send notifications)
```

### Database Schema

- **Airline** — 17 AMEX transfer partners with ratios
- **Airport** — 36 airports (3 origins + 33 destinations)
- **Route** — Origin-destination pairs (~90 routes)
- **DailyMileagePrice** — Raw scraped prices with deduplication
- **PriceHistory** — Aggregated daily min/avg/max
- **User** — User accounts (NextAuth)
- **UserAlert** — Alert configurations (route, cabin, threshold, channels)
- **AlertHistory** — Alert trigger log with notification status
- **ScrapeLog** — Scraping job history and metrics

### API Routes (12 endpoints)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/routes` | List routes with filters |
| GET | `/api/routes/[id]/prices` | Current prices for a route |
| GET | `/api/routes/[id]/history` | Price history for charts |
| GET | `/api/prices/best-deals` | Top deals with scoring |
| GET | `/api/prices/search` | Full price search with pagination |
| GET | `/api/airlines` | AMEX partner list |
| GET/POST | `/api/alerts` | List/create alerts (auth required) |
| PUT/DELETE | `/api/alerts/[id]` | Manage alerts (auth required) |
| POST | `/api/cron/scrape-prices` | Daily scrape (CRON_SECRET) |
| POST | `/api/cron/aggregate-prices` | Daily aggregation (CRON_SECRET) |
| POST | `/api/cron/check-alerts` | Alert evaluation (CRON_SECRET) |
| GET | `/api/health` | Health check with data freshness |

### Pages (8)

| Path | Description |
|------|-------------|
| `/` | Dashboard — stats, quick search, best deals |
| `/routes` | Route browser — map, filters, grouped cards |
| `/routes/[slug]` | Route detail — price table, history chart |
| `/deals` | Best deals — filterable grid |
| `/airlines` | AMEX partner directory |
| `/alerts` | Alert management — toggle, delete |
| `/alerts/new` | Alert wizard — 4-step creation flow |
| `/settings` | User settings |

## NPM Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npm run test         # Run tests (Vitest)
npm run test:watch   # Tests in watch mode

# Database
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to DB
npm run db:migrate   # Run migrations
npm run db:seed      # Seed reference data
npm run db:studio    # Open Prisma Studio
npm run db:reset     # Reset database
```

## Deployment (Vercel)

1. Connect your GitHub repo to Vercel
2. Set all environment variables in the Vercel dashboard
3. Vercel auto-detects Next.js and builds
4. Cron jobs are configured in `vercel.json`:
   - Scrape: `0 12 * * *` (12:00 UTC = 6:00 AM CT)
   - Aggregate: `30 12 * * *` (12:30 UTC)
   - Alerts: `0 13 * * *` (13:00 UTC)

## Testing

```bash
npm run test
```

57 unit tests covering:
- AMEX transfer ratio calculations
- Deal scoring algorithm
- Rate limiting logic
- Zod validators (alerts, search)
- Reference data integrity (airlines, airports, thresholds)

## Security

- **CRON_SECRET** protects all cron endpoints
- **Rate limiting** on alert creation (10/min) and search (30/min)
- **Security headers** via middleware (X-Content-Type-Options, X-Frame-Options, etc.)
- **Zod validation** on all API inputs
- **Auth guards** on alert CRUD endpoints
- **Cache-Control** headers on price/route GET endpoints

## License

Private.
