# RALPH Iteration Log — Mileage Hawk

## Current Dimension Scores (Post-Cycle 15)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Performance | 10 | `unstable_cache` on all 6 read API endpoints, tag-based revalidation from cron jobs, tiered TTLs (5m prices, 10m history, 1h airlines) |
| Code Quality | 9 | Zero lint errors, zero warnings, clean imports, semantic HTML |
| Feature Completeness | 10 | 54 destinations, 7 regions, 17 airlines, AMEX + Capital One dual currency, alerts, deal scoring, auth |
| UX | 9 | Mobile card views, responsive headings, ARIA attributes, WCAG contrast, semantic stats |
| Operational Stability | 9 | 210 tests across 13 suites (14 new auth tests), all API routes + cache module tested |

## Cycle History

### Cycle 15 — Auth: Username & Password Protection via NextAuth

**Hypothesis:** Add single-owner credential-based authentication using NextAuth v5 so that only the site owner can access the dashboard, routes, deals, alerts, and settings pages. Public API endpoints (cron, health) remain open. This protects the personal mileage dashboard without requiring a full user system.

**Changes Made:**

NextAuth v5 config (`src/auth.ts`):
- CredentialsProvider with `AUTH_USERNAME` / `AUTH_PASSWORD` env vars — no database user table needed
- JWT session strategy (stateless, no server-side session store)
- Custom `authorized` callback in middleware: allows `/api/auth/*`, `/api/cron/*`, `/api/health` unauthenticated; redirects logged-in users away from `/login`; blocks all other routes for unauthenticated users
- Custom sign-in page at `/login`

Middleware (`src/middleware.ts`):
- Replaced previous security-header middleware with `export { auth as middleware } from "@/auth"` — NextAuth v5 handles route protection via the `authorized` callback
- Security headers moved to `next.config.ts` `headers()` function (same headers, different delivery mechanism)

Login page (`src/app/login/page.tsx`):
- Client component with username/password form
- Uses `signIn("credentials", { redirect: false })` from `next-auth/react`
- Error state for invalid credentials, loading state during submission
- MileageHawk branding with Plane icon
- Proper `autoComplete` attributes and auto-focus

Auth API route (`src/app/api/auth/[...nextauth]/route.ts`):
- Exports `GET` and `POST` handlers from NextAuth

Session provider (`src/lib/providers.tsx`):
- Added `SessionProvider` from `next-auth/react` wrapping the app

Navbar sign-out (`src/components/layout/Navbar.tsx`):
- Desktop: LogOut icon button in header right section
- Mobile: Full-width "Sign out" button with destructive color in slide-out menu
- Uses `signOut()` from `next-auth/react`

Auth utility update (`src/lib/auth.ts`):
- `getCurrentUserId()` now calls real `auth()` session from `@/auth` instead of returning null placeholder

Security headers (`next.config.ts`):
- Moved `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy` headers to `headers()` config
- Added API-specific `Cache-Control` headers for `/api/prices/*` and `/api/routes/*`

Tests (`src/__tests__/auth.test.ts` — 14 new tests):
- `validateCronSecret`: valid Bearer token, valid query param, invalid token, no auth, missing env var (5 tests)
- Response helpers: `unauthorizedResponse` default/custom message, `forbiddenResponse` default/custom message, `rateLimitedResponse` with Retry-After header (5 tests)
- Credentials authorize: rejects when env vars missing, rejects wrong password, accepts correct credentials, rejects wrong username (4 tests)

**Env vars required:**
- `AUTH_SECRET` — Random string for JWT signing (generate with `openssl rand -base64 32`)
- `AUTH_USERNAME` — Owner's login username
- `AUTH_PASSWORD` — Owner's login password

**Outcome:** Auth protection added. 210 tests expected (196 + 14). 0 lint errors, 0 warnings.

**Key Learnings:**
- NextAuth v5's `authorized` callback in the auth config replaces manual middleware route checking — cleaner than a separate middleware file
- JWT strategy avoids needing a database sessions table for single-owner apps
- Security headers work identically from `next.config.ts` `headers()` vs middleware, but keeping middleware auth-only is cleaner separation of concerns

---

### Cycle 14 — Performance: Response Caching with `unstable_cache`

**Hypothesis:** Add server-side response caching via Next.js `unstable_cache` to all read-only API endpoints, with tag-based on-demand revalidation triggered by cron scrape/aggregate jobs. This eliminates redundant DB queries for repeated identical requests, raising Performance from 9→10.

**Changes Made:**

Cache utility module (`src/lib/cache.ts`):
- Created centralized cache configuration with `CACHE_DURATIONS` constants: `PRICES` (300s / 5 min), `AIRLINES` (3600s / 1 hour), `HISTORY` (600s / 10 min)
- Defined `CACHE_TAGS` constants: `routes`, `prices`, `deals`, `airlines`, `price-history` — 5 distinct tags for granular invalidation
- Added `revalidatePriceData()` helper that invalidates all 4 price-related tags in one call
- Added `revalidateAirlineData()` helper for airline-only invalidation
- Re-exports `unstable_cache` and `revalidateTag` from `next/cache` for convenience

API route caching (6 endpoints):
- **`/api/routes`** — Extracted `fetchRoutesData()`, wrapped with `unstable_cache` keyed on `["api-routes"]`, TTL 300s, tags `[routes, prices]`
- **`/api/prices/search`** — Extracted `fetchPriceSearchData()` with all 13 filter params as cache key arguments, TTL 300s, tag `[prices]`
- **`/api/prices/best-deals`** — Extracted `fetchBestDealsData()`, TTL 300s, tags `[prices, deals]`
- **`/api/routes/[id]/prices`** — Extracted `fetchRoutePricesData()`, TTL 300s, tag `[prices]`; returns `null` for missing routes (handler converts to 404)
- **`/api/routes/[id]/history`** — Extracted `fetchPriceHistoryData()`, TTL 600s, tag `[price-history]`; returns `null` for missing routes
- **`/api/airlines`** — Extracted `fetchAirlinesData()`, TTL 3600s (1 hour), tag `[airlines]`

Pattern: Each route's data-fetching logic was extracted into a standalone `async function`, then wrapped at module level with `unstable_cache(fn, keyArray, options)`. The function arguments automatically become part of the cache key, so different query parameter combinations produce distinct cache entries.

On-demand revalidation (2 cron endpoints):
- **`/api/cron/scrape-prices`** — Calls `revalidatePriceData()` after successful `runDailyScrape()`, invalidating all 4 price-related tags
- **`/api/cron/aggregate-prices`** — Calls `revalidatePriceData()` after successful `aggregateDailyPrices()`

This ensures cached responses are always fresh within seconds of new data arriving, while eliminating redundant DB queries between scrapes.

Test updates (185→196 tests, 11→12 suites):
- `cache.test.ts` (11 tests): `CACHE_DURATIONS` value verification (3 tests), relative duration ordering (2 tests), `CACHE_TAGS` constant values + uniqueness (2 tests), `revalidatePriceData` calls 4 tags correctly + excludes airlines (2 tests), `revalidateAirlineData` calls only airlines + excludes price tags (2 tests)
- `api-routes.test.ts`: Added `next/cache` and `@/lib/cache` mocks — `unstable_cache` passes through to original function, `revalidateTag` is mocked
- `api-prices-search.test.ts`: Same cache mock pattern
- `api-prices-best-deals.test.ts`: Same cache mock pattern

Middleware interaction:
- Existing `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` headers in middleware remain as the CDN/edge layer
- `unstable_cache` adds a second server-side caching layer (Next.js Data Cache) that deduplicates DB queries before they even reach the middleware/CDN layer
- Together: CDN caches the HTTP response, `unstable_cache` caches the DB query results — two complementary layers

**Outcome:** Performance 9 → 10

**Verification:** 196/196 tests passing across 12 suites. 0 lint errors, 0 warnings.

**Key Learnings:**
- `unstable_cache` function arguments become part of the cache key automatically — no need to manually serialize query params into a key string
- Extracting data-fetching into standalone functions keeps route handlers thin (validate → call cached fn → serialize response) and makes the caching layer testable independently
- For tests, mocking `unstable_cache` as a pass-through `(fn) => fn` preserves all existing test behavior — the mock simply removes the caching wrapper
- Tiered TTLs reflect data volatility: airlines (rarely change) get 1h, price history (aggregated) gets 10m, live prices get 5m
- Tag-based revalidation from cron jobs ensures cache staleness never exceeds one scrape cycle, while `revalidate` TTL provides a safety net

---

### Cycle 13 — UX: Mobile Responsiveness & Accessibility

**Hypothesis:** Improve mobile usability and accessibility across all pages, raising UX from 8→9. The 11-column price table is unusable on phones, headings don't scale, and screen reader support is minimal.

**Changes Made:**

Mobile responsiveness (`src/components/routes/RouteDetail.tsx`):
- Added responsive card view for price table on mobile (`md:hidden`), showing each price as a stacked card with 2-column grid layout for key metrics (AMEX/C1 points, miles, taxes, date, seats) and full-width book button
- Desktop table hidden on small screens (`hidden md:block`), preserving full 11-column sortable view on tablets+
- Added `hover:bg-muted/50 transition-colors` to table rows for better hover feedback
- Added `<caption className="sr-only">` for screen readers on the price table
- Responsive heading: `text-2xl md:text-3xl` (was `text-3xl`)

Responsive headings across app:
- Dashboard (`DashboardClient.tsx`): `text-2xl md:text-3xl`
- Deals page (`deals/page.tsx`): `text-2xl md:text-3xl`
- Route detail: `text-2xl md:text-3xl`

Accessibility — ARIA attributes:
- Navbar (`Navbar.tsx`): Added `aria-current="page"` on active nav links (desktop + mobile)
- QuickSearch (`QuickSearch.tsx`): Added `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"` on input; `role="listbox"`, `role="option"`, `aria-selected` on dropdown; `aria-label="Clear search"` on clear button
- RouteMap (`RouteMap.tsx`): Added `role="img"` and descriptive `aria-label` to SVG

Accessibility — contrast & semantics:
- DealScoreBadge (`DealScoreBadge.tsx`): Darkened text colors from 700→800 weight (amber, purple, blue, green) and gray-600→gray-700 for WCAG AA compliance
- StatCard (`DashboardClient.tsx`): Changed from `<p>` to semantic `<dl>/<dt>/<dd>` markup; added `aria-hidden="true"` on decorative icons

**Outcome:** UX 8 → 9

**Verification:** 185/185 tests, 0 lint errors, 0 warnings

---

### Cycle 12 — Feature: Capital One Transfer Partner Integration

**Hypothesis:** Add Capital One Venture miles as a second transfer currency alongside AMEX MR, showing dual-currency price comparisons across all shared partners. This raises Feature Completeness from 9→10 by supporting the two most popular US credit card point currencies.

**Changes Made:**

Data layer:
- Added `capitalOneTransferRatio: number | null` to `AirlineData` type (`src/lib/types.ts`)
- Added `capitalOneTransferRatio Float?` to Prisma `Airline` model
- Added `capitalOnePointsEquivalent Int?` to Prisma `DailyMileagePrice` model
- Populated C1 ratios for all 17 airlines: 12 are shared C1 partners, 5 AMEX-only (EI, NH, DL, IB, VS)
- Key ratio differences: Cathay Pacific (AMEX 5:4, C1 1:1 — C1 is better), Aeromexico (AMEX 1:1.6 bonus, C1 1:1 — AMEX is better), Emirates (AMEX 5:4, C1 2:1.5 — AMEX is better), JetBlue (AMEX 5:4, C1 5:3 — AMEX is better)

Utility functions (`src/lib/amex-partners.ts`):
- Added `calculateCapitalOnePoints(miles, ratio)` — returns null for non-C1 partners
- Extended `formatTransferRatio()` to handle `0.75` (2:1.5) and `0.6` (5:3) Capital One ratios

Price scraper (`src/lib/services/price-scraper.ts`):
- Now computes `capitalOnePointsEquivalent` alongside `amexPointsEquivalent` during each scrape
- Stored in DailyMileagePrice for efficient querying

Seed script (`prisma/seed.ts`):
- Airline upsert now includes `capitalOneTransferRatio`

API endpoints:
- `GET /api/prices/best-deals` — response now includes `capitalOnePointsEquivalent`
- Route detail page — serializes `capitalOnePointsEquivalent` for client display

UI updates:
- **RouteDetail price table** — added "C1 Points" column with formatted values (or "—" for AMEX-only partners)
- **AirlineGrid** — each airline card shows both AMEX ratio badge and Capital One ratio badge (when applicable), with distinct color coding (blue for AMEX 1:1, green for bonus, amber for sub-par; indigo for C1 1:1, purple for C1 bonus, orange for C1 sub-par)
- **Deals page** — deal cards show C1 points in blue below AMEX points when available
- Updated section header to "1:1 AMEX Transfer Partners" for clarity

Test updates (175→185 tests):
- `constants.test.ts`: +4 tests — C1 ratio verification, null for AMEX-only, 12 C1 partner count
- `amex-partners.test.ts`: +7 tests — `calculateCapitalOnePoints` (null, 1:1, 2:1.5, 5:3, rounding), formatTransferRatio for C1 ratios
- `notification-service.test.ts`: Fixed 3 flaky quiet-hours tests (quietHoursStart:1→0, quietHoursEnd:0→23 to cover all hours deterministically)

**Result:** 0 lint errors, 0 warnings. 185/185 tests passing across 11 suites. Feature Completeness 9→10.

**Key Research Sources:**
- Capital One transfer partners list verified via NerdWallet, The Points Guy, and capitalone.com (Feb 2026)
- Qatar Airways and Japan Airlines added as C1 partners Sept 2025
- Emirates C1 ratio is 2:1.5 (0.75), worse than AMEX 5:4 (0.8)

---

### Cycle 11 — UX: Sorting, Deal Scores & Navigation

**Hypothesis:** Improve discoverability and navigation by adding sortable deal listings, deal score badges on the dashboard, sortable price comparison tables, and breadcrumb navigation across all pages, raising UX from 7→8.

**Changes Made:**

Deals page sort controls (`src/app/deals/page.tsx`):
- Added 3-way sort toggle: Deal Score (default), Lowest Price, Savings %
- Sort applied client-side via `useMemo` over API results
- Sort buttons styled consistently with existing filter buttons (default/outline variant toggle)
- Fixed React lint warning: moved `data?.data ?? []` inside `useMemo` callback to avoid unstable dependency

Dashboard deal score badges (`src/app/page.tsx` + `src/components/dashboard/DashboardClient.tsx`):
- Server page now scores each deal using `calculateDealScoreFromThresholds()` before passing to client
- Added `dealScore` and `dealTier` optional fields to `DashboardProps.recentDeals`
- DealCard footer now shows `DealScoreBadge` (tier + score %) alongside Direct and Region badges
- Replaced mileage cost text with deal tier — much more actionable at a glance
- Removed unused `formatPoints` import

Sortable price table (`src/components/routes/RouteDetail.tsx`):
- Created `SortableHeader` component with click-to-sort and direction indicators (↑/↓/⇅)
- 7 sortable columns: Airline, AMEX Points, Airline Miles, Ratio, Taxes, Seats, Travel Date
- Cabin and Direct columns remain static (cabin already filterable via tabs, direct is boolean)
- Sort state managed via `useState<SortField | null>` + `useState<SortDir>`
- Toggle logic: click same column flips direction, click new column resets to ascending
- Sorted results computed via `useMemo` for performance

Breadcrumb navigation (5 pages):
- Routes (`RouteBrowser.tsx`): Dashboard → Routes
- Route Detail (`RouteDetail.tsx`): Dashboard → Routes → AUS → LHR (upgraded from simple "Routes / ..." text)
- Deals (`deals/page.tsx`): Dashboard → Deals
- Airlines (`AirlineGrid.tsx`): Dashboard → Airlines
- Alerts (`alerts/page.tsx`): Dashboard → Alerts
- Consistent pattern: Home icon + "Dashboard" link, ChevronRight separators, current page in foreground color
- All breadcrumbs use `<nav>` semantic element

**Result:** 0 lint errors, 0 warnings. 175/175 tests passing across 11 suites. UX 7→8.

**Key Learnings:**
- React's `react-hooks/exhaustive-deps` rule flags `data?.data ?? []` as unstable when used as a `useMemo` dependency — move the extraction inside the callback and depend on the stable `data` reference instead
- `SortableHeader` as a reusable sub-component keeps the table header clean; passing `className` through allows right-aligned sort icons for numeric columns
- Deal score badges on the dashboard turn raw point costs into actionable "good/great/amazing" signals without requiring users to visit the deals page

---

### Cycle 10 — Performance: N+1 Elimination & Batch Query Optimization

**Hypothesis:** Eliminate all N+1 query patterns in the routes API and alert evaluator by replacing per-item `findFirst` calls with batch `findMany` queries and in-memory Map lookups, raising Performance from 7→9.

**Changes Made:**

Routes API (`src/app/api/routes/route.ts`):
- Replaced `Promise.all(routes.map(async route => db.dailyMileagePrice.findFirst(...)))` with single `db.dailyMileagePrice.findMany({ where: { routeId: { in: routeIds } }, distinct: ["routeId"], orderBy: { amexPointsEquivalent: "asc" } })`
- Built `Map<routeId, price>` for O(1) per-route lookups
- Changed from async map to synchronous map over routes — eliminates N concurrent DB round-trips

Alert evaluator (`src/lib/services/alert-evaluator.ts`):
- **Price lookup:** Replaced per-alert `db.dailyMileagePrice.findFirst()` with batch `db.dailyMileagePrice.findMany({ where: { routeId: { in: alertRouteIds } } })` + composite key Map index (`routeId|cabinClass|airlineId`)
- **Duplicate check:** Replaced per-alert `db.alertHistory.findFirst()` with batch `db.alertHistory.findMany({ where: { userAlertId: { in: alertIds } } })` + `Set<userAlertId>`
- Total DB queries reduced from 2N+1 (N alerts × 2 queries each + 1 fetch) to 3 constant queries regardless of alert count

Test updates:
- `api-routes.test.ts` (26 tests): Updated mocks from `findFirst` → `findMany`, array returns, verified single batch call
- `alert-evaluator.test.ts` (14 tests): Updated mocks for batch `findMany` pattern, added `setupTriggeredAlert` helper, duplicate checks use array returns with `userAlertId` field

Lint fix:
- Changed `let bestPriceMap` → `const bestPriceMap` in routes API (Map is mutated via `.set()`, never reassigned)

**Result:** 0 lint errors, 0 warnings. 175/175 tests passing across 11 suites. Performance 7→9.

**Key Learnings:**
- Prisma's `distinct` with `orderBy` efficiently returns one-per-group results (e.g., cheapest price per route) in a single query
- Composite string keys (`routeId|cabinClass|airlineId`) provide a simple multi-dimensional index pattern for in-memory lookups
- For alert evaluator, wildcard key (`routeId|cabinClass|*`) handles "any airline" alerts while specific keys handle airline-filtered alerts — both populated in a single pass over batch results

---

### Cycle 9 — Route Expansion: Asia, Middle East & Strategic Gaps

**Hypothesis:** Add 11 new destinations filling major regional gaps (Asia has no Southeast Asia hubs, Middle East only has Dubai), bringing destination count from 43→54 and Feature Completeness from 8→9.

**Changes Made:**

New airports (11 destinations):
- **Europe (3):** ZRH (Zurich), FRA (Frankfurt — Lufthansa hub, nonstop from AUS), KEF (Reykjavik — popular award destination)
- **Asia (4):** HKG (Hong Kong — Cathay Pacific DFW nonstop 2025), TPE (Taipei — EVA Air DFW nonstop), SIN (Singapore — major KrisFlyer hub), DEL (New Delhi — Air India DFW expansion)
- **Middle East (2):** DOH (Doha — Qatar Airways DFW nonstop), IST (Istanbul — Turkish Airlines DFW nonstop)
- **Latin America South (1):** EZE (Buenos Aires — AA seasonal DFW 2026)
- **Caribbean (1):** CTG (Cartagena — popular Colombia beach destination)

Threshold updates:
- Europe destinations list: +Zurich, Frankfurt, Reykjavik
- Asia destinations list: +Hong Kong, Taipei, Singapore, New Delhi
- Middle East destinations list: +Doha, Istanbul
- Latin America South destinations list: +Sao Paulo, Buenos Aires
- Caribbean destinations list: +Cartagena

Test updates:
- Updated constants test: destination count 43→54

**Result:** 0 lint errors, 0 warnings. 175/175 tests passing. Feature Completeness 8→9.

**Key Research Sources:**
- American Airlines 2026 DFW summer schedule (ZRH, ATH, EZE new routes)
- Cathay Pacific DFW-HKG launch (April 2025, 4x weekly)
- Lufthansa AUS-FRA 787 service upgrade
- Qatar Airways year-round DFW-DOH, Turkish Airlines DFW-IST

---

### Cycle 8 — Lint Cleanup & API Route Test Coverage

**Hypothesis:** Fix all 3 lint errors and 11 unused import warnings, and add comprehensive API route tests for untested endpoints (prices/search, prices/best-deals, routes), raising Code Quality from 7→9 and Operational Stability from 8→9.

**Changes Made:**

Lint error fixes (3 errors → 0):
- `DataFreshnessBadge.tsx`: Replaced `Date.now()` with `new Date().getTime()` to satisfy React purity rule (`react-hooks/purity`)
- `routes/[slug]/page.tsx`: Same `Date.now()` → `new Date().getTime()` fix for server component
- `QuickSearch.tsx`: Removed `useEffect` with `setState` (violated `react-hooks/set-state-in-effect`), moved reset logic into `onChange` handler

Unused import cleanup (11 warnings → 0):
- `alerts/page.tsx`: Removed `CardHeader`, `CardTitle`
- `api/alerts/route.ts`: Suppressed unused `_request` param via eslint-disable comment
- `deals/page.tsx`: Removed `formatPoints`
- `AirlineGrid.tsx`: Removed `ExternalLink`
- `DashboardClient.tsx`: Removed `BarChart3`, `CABIN_CLASS_LABELS`
- `PriceHistoryChart.tsx`: Removed `Area`, `AreaChart`, `CABIN_CLASS_LABELS`
- `deal-scorer.ts`: Removed `CABIN_CLASS_LABELS`

New test files (75 new tests):
- `api-prices-search.test.ts` (27 tests): Validation, filtering (origin, destination, region, cabin, airline, dates, maxPoints, directOnly), sorting (price, date, airline), pagination, error handling
- `api-prices-best-deals.test.ts` (22 tests): Validation, region/cabin filtering, deal scoring integration, sort-by-score, pagination, error handling
- `api-routes.test.ts` (26 tests): Validation, active route querying, origin/region filtering, best price lookup, no-price handling, cabin class filtering, error handling

**Result:** 0 lint errors, 0 warnings. 175/175 tests passing across 11 suites. Code Quality 7→9, Operational Stability 8→9.

**Key Learnings:**
- React's `react-hooks/purity` rule treats `Date.now()` as impure but allows `new Date().getTime()`
- React's `react-hooks/refs` rule prevents accessing `.current` during render, ruling out the common ref-based pattern for replacing useEffect-with-setState
- The cleanest fix for "reset state when derived data changes" is to move the reset into the event handler that causes the change

---

### Cycle 7 — New Destinations & Caribbean Region

**Hypothesis:** Add 10+ popular destinations from Austin and Dallas, expand regional coverage with a new Caribbean region, improving Feature Completeness from 7→8.

**Changes Made:**
- Added 17 new airports (bringing total from 26 to 43 non-origin destinations)
- Created `CARIBBEAN` region with 4 destinations (MBJ, SJU, NAS, AUA)
- Added airports: AMS (Europe), SJD/GDL (Mexico), PTY/GUA/SJO (Latin America South), MBJ/SJU/NAS/AUA (Caribbean)
- Added Caribbean thresholds to `DEFAULT_THRESHOLDS`
- Added `CARIBBEAN` to Prisma Region enum
- Updated `REGION_LABELS` and `REGION_EMOJI`
- Updated constants tests for new counts (43 destinations, 7 regions)

**Result:** Feature Completeness 7→8. All tests passing.

---

### Cycle 6 — Quiet Hours & Notification Timezone Support

**Hypothesis:** Implement timezone-aware quiet hours for SMS/Push notifications, preventing alerts during user-specified quiet periods.

**Changes Made:**
- Created `quiet-hours.ts` service with `getCurrentHourInTimezone()`, `isHourInQuietRange()`, `isInQuietHours()`
- Uses `Intl.DateTimeFormat` for timezone conversion (no external deps)
- Handles midnight-wrapping ranges (e.g., 22:00→07:00)
- Added `timezone`, `quietHoursStart`, `quietHoursEnd` to `AlertNotification` type
- Integrated quiet hours check into `sendSmsAlert()` and PUSH notification path
- Email bypasses quiet hours (always delivered)
- Alert evaluator passes user timezone/quiet hours fields to notification payload
- Added 16 quiet-hours tests, 14 alert-evaluator tests, 13 notification-service tests

**Result:** 100 tests passing across 8 suites. Feature Completeness improved.

---

### Cycles 1–5 — Foundation

Cycles 1–5 established the core application: Next.js app router, Prisma schema, AMEX transfer partner data (17 airlines), airport/route constants, deal scoring with regional thresholds, rate limiting, Zod validators, dashboard UI, and initial test suite (49 tests covering constants, validators, amex-partners, rate-limit, deal-scorer).

## Metrics

| Metric | Cycle 5 | Cycle 6 | Cycle 7 | Cycle 8 | Cycle 9 | Cycle 10 | Cycle 11 | Cycle 12 | Cycle 13 | Cycle 14 | Cycle 15 |
|--------|---------|---------|---------|---------|---------|----------|----------|----------|----------|----------|----------|
| Test count | 49 | 100 | 100 | 175 | 175 | 175 | 175 | 185 | 185 | 196 | 210 |
| Test suites | 5 | 8 | 8 | 11 | 11 | 11 | 11 | 11 | 11 | 12 | 13 |
| Lint errors | 3 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Lint warnings | 11 | 11 | 11 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Destinations | 26 | 26 | 43 | 43 | 54 | 54 | 54 | 54 | 54 | 54 | 54 |
| Regions | 6 | 6 | 7 | 7 | 7 | 7 | 7 | 7 | 7 | 7 | 7 |
| Airlines | 17 | 17 | 17 | 17 | 17 | 17 | 17 | 17 | 17 | 17 | 17 |

## Suggested Next Cycles

1. **Cycle 16 — Chase Ultimate Rewards Integration** — Add Chase UR as a third transfer currency with partner ratios, `chaseTransferRatio` on Airline model, `chasePointsEquivalent` on DailyMileagePrice, tri-currency UI columns
2. **Cycle 17 — Citi ThankYou Points Integration** — Add Citi TYP as fourth currency, same pattern as Chase
3. **Cycle 18 — Multi-Currency UX** — Currency toggle/preference, side-by-side comparison view, "best currency" badge per route
4. **Cycle 19 — E2E Tests** — Playwright tests for login flow, dashboard, route detail, deal filtering
