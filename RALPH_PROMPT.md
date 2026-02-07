# RALPH Loop — Mileage Hawk

## Instructions

Clone https://github.com/SeannyQuest/mileage-hawk. Read `RALPH_LOG.md` for full history. Execute cycles below **in order**, one per run. After each cycle: run `npm test` (all must pass), run `npx next lint` (0 errors), update `RALPH_LOG.md` with changes/outcome/learnings, commit, and report results.

## Project Summary

Next.js 16 app (Turbopack) tracking award flight mileage prices from Seats.aero. Deployed on Netlify with Neon PostgreSQL. Currently supports **AMEX MR + Capital One** transfer currencies across 17 airlines, 54 destinations, 7 regions.

**Stack:** Next.js 16.1.6, React 19, Prisma 6, NextAuth 5 beta, TanStack Query, Zod 4, Radix UI, Tailwind, Recharts, Vitest
**Post-Cycle 14 scores:** Performance 10, Code Quality 9, Feature Completeness 10, UX 9, Operational Stability 9
**Tests:** 196 across 12 suites, 0 lint errors

## Key Architecture

- **Schema enums:** CabinClass (ECONOMY_PLUS/BUSINESS/FIRST), Region (7 values), AlertChannel, ScrapeStatus
- **Transfer points pattern:** Each `Airline` has `amexTransferRatio Float` + `capitalOneTransferRatio Float?`. `DailyMileagePrice` stores pre-computed `amexPointsEquivalent Int` + `capitalOnePointsEquivalent Int?`. Calculation in `src/lib/amex-partners.ts`: `ceil(miles / ratio)`, null if no partnership.
- **Caching:** `unstable_cache` on all 6 read API routes with tag-based revalidation. `revalidateTag(tag, "max")` (Next.js 16 two-arg API).
- **Auth models exist but are unused:** `User`, `Account`, `Session`, `VerificationToken` tables in Prisma schema with NextAuth adapter (`@auth/prisma-adapter`). `next-auth@5.0.0-beta.30` is installed.
- **Test mocking pattern:** `vi.mock("next/cache", () => ({ unstable_cache: (fn) => fn, revalidateTag: vi.fn() }))` — cache pass-through.

## Cycles

### Cycle 15 — Auth: Username & Password Protection

**Goal:** Require login to access the app. Single user (owner-only).

**Approach:** NextAuth credentials provider with env-var credentials (`AUTH_USERNAME`, `AUTH_PASSWORD`). No registration — owner sets creds in `.env`.

**Changes needed:**
1. `src/lib/auth.ts` — NextAuth config with CredentialsProvider, PrismaAdapter, session strategy "jwt"
2. `src/middleware.ts` — Add auth check (redirect unauthenticated to `/login` except `/api/cron/*` which uses Bearer token)
3. `src/app/login/page.tsx` — Simple login form (email + password, error state, submit to NextAuth `signIn()`)
4. `src/app/api/auth/[...nextauth]/route.ts` — NextAuth route handler
5. `src/app/layout.tsx` — Wrap with SessionProvider
6. Add sign-out button to Navbar
7. Env vars: `AUTH_USERNAME`, `AUTH_PASSWORD`, `AUTH_SECRET` (for JWT)
8. Tests: Auth config tests, middleware redirect tests, login page render test
9. Update `RALPH_LOG.md`

**Target:** Operational Stability 9→10 (auth hardening + new tests)

---

### Cycle 16 — Feature: Chase Ultimate Rewards Integration

**Goal:** Add Chase UR as third transfer currency.

**Research first:** Search "Chase Ultimate Rewards transfer partners 2026" for current ratios. Known partners include United (1:1), Hyatt (1:1), Southwest (1:1), British Airways (1:1), Air France/KLM (1:1), Singapore (1:1), Emirates (1:1), Iberia (1:1), Aer Lingus (1:1), Virgin Atlantic (1:1), JetBlue (1:1).

**Changes needed:**
1. Prisma: Add `chaseTransferRatio Float?` to `Airline`, `chasePointsEquivalent Int?` to `DailyMileagePrice`
2. `prisma/seed.ts` — Add Chase ratios for all 17 airlines
3. `src/lib/amex-partners.ts` → rename file to `src/lib/transfer-partners.ts`. Add `calculateChasePoints()`. Update all imports.
4. `src/lib/services/price-scraper.ts` — Compute `chasePointsEquivalent` during scrape
5. API responses — Include Chase points in search/deals/route-prices responses
6. UI — Add Chase column to RouteDetail price table, Chase points display on deal cards, Chase badge on AirlineGrid
7. Tests: Chase calculation tests, ratio verification, updated API response assertions
8. `prisma db push` + re-seed
9. Update `RALPH_LOG.md`

**Target:** Feature Completeness stays 10 (expansion, not new dimension)

---

### Cycle 17 — Feature: Citi ThankYou Points Integration

**Goal:** Add Citi TYP as fourth transfer currency. Complete the "big 4" US credit card currencies.

**Research first:** Search "Citi ThankYou Points transfer partners 2026" for current ratios. Known partners include Avianca LifeMiles (1:1), Air France/KLM (1:1), Etihad (1:1), JetBlue (1:1), Qatar (1:1), Singapore (1:1), Turkish (1:1), Virgin Atlantic (1:1), Cathay Pacific (1:1).

**Changes needed:**
1. Prisma: Add `citiTransferRatio Float?` to `Airline`, `citiPointsEquivalent Int?` to `DailyMileagePrice`
2. `prisma/seed.ts` — Add Citi ratios
3. `src/lib/transfer-partners.ts` — Add `calculateCitiPoints()`
4. Scraper — Compute `citiPointsEquivalent`
5. API + UI — Same pattern as Cycle 16 (add column, badge, card display)
6. Tests + `RALPH_LOG.md`

**Target:** Feature Completeness stays 10

---

### Cycle 18 — UX: Multi-Currency Comparison & Best-Value Finder

**Goal:** Make the app a true one-stop-shop. Users select which card(s) they have; the UI highlights the best redemption path.

**Changes needed:**
1. "My Cards" selector (persistent via localStorage or user prefs) — checkboxes for AMEX/Chase/Citi/C1
2. Deal cards show **best value across selected currencies** with "Best via Chase UR" or "Best via AMEX MR" label
3. Sort/filter deals by any currency (not just AMEX)
4. Route detail comparison view — side-by-side table showing all 4 currency costs per airline, highlighting the cheapest
5. Dashboard stats adapt to selected currencies
6. Tests + `RALPH_LOG.md`

**Target:** UX 9→10

---

### Cycle 19 — Code Quality: Component Tests & E2E

**Goal:** Add Playwright E2E smoke tests for critical flows + unit tests for key UI components.

**Changes needed:**
1. Install Playwright, configure for Next.js
2. E2E tests: login flow, dashboard load, route detail navigation, deal filtering, sign out
3. Component tests: DealScoreBadge, QuickSearch, multi-currency display
4. Tests + `RALPH_LOG.md`

**Target:** Code Quality 9→10, all dimensions at 10

---

## Execution Rules

- **One cycle per run.** Complete fully before starting next.
- **Research before coding** for Cycles 16-17 — verify current transfer partner lists/ratios via web search.
- **Preserve existing patterns** — follow the established mock, test, and code organization patterns.
- **`revalidateTag(tag, "max")`** — Next.js 16 requires the second argument.
- **Prisma enums need `as EnumType` casts** when passed through `unstable_cache` wrapper functions (params become `string`).
- **Run `npm test` and `npx next lint`** after every cycle. All tests must pass, 0 lint errors.
- **Update `RALPH_LOG.md`** with the same format as prior cycles (hypothesis, changes, outcome, verification, key learnings).
- **Commit message format:** `Cycle N — [Category]: [Brief description]`
