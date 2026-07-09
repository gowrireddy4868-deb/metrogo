# MetroGo — Metro Ticket Booking Website

A metro ticket booking platform with **real Stripe payments (test mode)**, multi-city journey
planning, encrypted QR tickets, a staff gate-scanning simulator, rewards/streaks, an AI support
chatbot, and an admin dashboard with analytics and fraud detection — backed by real MySQL.

## What's implemented

**Booking & travel**
- Multi-city journey planner — pick a city, then station, with multi-line routing, zone-based
  fares, peak-hour pricing
- **Real Stripe payments (test mode)** for Card checkout — actual `PaymentIntent` creation,
  Stripe Elements card form, and webhook-confirmed ticket issuance (see "Payments" below).
  UPI/Wallet remain simulated (no Razorpay/PhonePe business integration — out of scope for now)
- **AES-256-GCM encrypted QR tickets** — not just signed, actually encrypted; tampering is
  auto-detected
- Gate validation simulator (`/staff/scan`) — entry/exit state machine, duplicate-use prevention
- Passes (day/week/month), refunds, email confirmation (SMTP or console fallback)
- Booking streaks & reward points (`/rewards`)
- Live train tracking (`/live`) — simulated, schedule-based (no public GPS feed exists to use)
- Peak-hour crowd prediction — computed from real historical booking data
- AI support chatbot — real Claude API if `ANTHROPIC_API_KEY` set, rule-based fallback otherwise

**Admin dashboard** (`/admin`)
- Revenue/booking trend charts, active users, station-wise bookings
- Fraud detection (`/admin/fraud`) — flags repeated failed gate-validation attempts
- Validation history (`/admin/validations`) — paginated audit log
- CSV export — tickets, validations, users

## Payments — how the real Stripe flow works

1. You add test-mode Stripe keys to `.env` (free Stripe account required — see setup below)
2. Checkout creates a real `PaymentIntent` server-side, returns its `client_secret`
3. The browser collects card details via Stripe's own hosted Elements UI (your server never
   touches raw card numbers)
4. **The ticket is only marked `ISSUED` and given a real QR code when Stripe's webhook confirms
   the charge succeeded** — not when the browser says it succeeded. This is what makes the flow
   safe against someone closing their tab mid-payment or tampering with the client response.
5. Use Stripe's test card `4242 4242 4242 4242`, any future expiry, any CVC — it always succeeds
   in test mode, no real money moves.

**Without Stripe keys configured**, Card/UPI/Wallet all fall back to a simulated "always
succeeds" mock — the app still fully works for demoing, just without real payment processing.

## Setup

### 1. MySQL

```sql
CREATE DATABASE metro_booking;
```

```bash
cp .env.example .env
```
Edit `.env`:
```
DATABASE_URL="mysql://root:yourpassword@localhost:3306/metro_booking"
JWT_ACCESS_SECRET="any-long-random-string"
QR_SIGNING_SECRET="a-different-long-random-string"
```

### 2. Install & set up the database

```bash
npm install
```
> If `npm install` shows a `prisma generate` error at the end — that's a network blip on the
> Prisma binary download, not a real failure. Just run `npx prisma generate` again manually.

```bash
npx prisma db push --force-reset
npm run db:seed
```

### 3. (Optional but recommended) Enable real Stripe payments

1. Go to https://dashboard.stripe.com/register and create a free account (no business
   verification needed for test mode)
2. Go to https://dashboard.stripe.com/test/apikeys and copy your **Publishable key** and
   **Secret key**
3. Add to `.env`:
   ```
   STRIPE_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
   ```
4. For **local testing**, install the Stripe CLI (https://docs.stripe.com/stripe-cli) and run:
   ```bash
   stripe listen --forward-to localhost:3000/api/payments/webhook
   ```
   It'll print a webhook signing secret starting `whsec_...` — add that to `.env` as
   `STRIPE_WEBHOOK_SECRET`. Keep this `stripe listen` command running in a separate terminal
   whenever you test card payments locally — without it, the webhook never fires and tickets
   will stay stuck on "Waiting for payment confirmation."

### 4. (Optional) Email confirmations & AI chatbot

See the commented-out blocks in `.env.example` for `SMTP_*` and `ANTHROPIC_API_KEY`.

### 5. Run it

```bash
npm run dev
```
Open http://localhost:3000.

## Demo accounts (password for all: `Test@1234`)

| Email | Role | Lands on login |
|---|---|---|
| rider@metro.test | Rider | Homepage |
| staff@metro.test | Gate staff | `/staff/scan` |
| admin@metro.test | Admin | `/admin` |

## Deploying for real (the part I can't do for you)

I can't create accounts on your behalf — Vercel and a hosted MySQL provider both need you to
sign up. But the project is ready to deploy as-is once you do. Recommended free-tier path:

1. **Push this project to a GitHub repo** (private is fine)
2. **Database — PlanetScale or Railway** (both have MySQL-compatible free tiers):
   - Create a database, copy its connection string into `DATABASE_URL`
   - From your local machine (pointed at the new remote DB), run:
     ```bash
     npx prisma db push
     npm run db:seed
     ```
3. **App — Vercel** (https://vercel.com):
   - Import your GitHub repo
   - Add all your `.env` variables in Vercel's Environment Variables settings (same keys,
     production values)
   - Deploy — Vercel runs `npm install` (which runs `prisma generate` automatically) and
     `npm run build` for you
4. **Stripe webhook in production**: in the Stripe dashboard, go to Developers → Webhooks → Add
   endpoint, point it at `https://your-vercel-url.vercel.app/api/payments/webhook`, select the
   `payment_intent.succeeded` and `payment_intent.payment_failed` events, and copy the new
   signing secret into Vercel's `STRIPE_WEBHOOK_SECRET` (it's different from your local one)
5. **Go live for real**: switch Stripe from test mode to live mode in their dashboard (requires
   their standard business verification) and swap in live API keys — only do this once you're
   actually ready to accept real money.

## Project structure

```
prisma/schema.prisma, seed.ts
app/
  page.tsx, checkout/, tickets/, passes/, rewards/, live/, staff/scan/, admin/, auth/
  api/
    stations, lines, cities, journey         Trip planning
    auth/                                     Signup/login
    tickets/, passes/                         Booking + lifecycle
    payments/webhook/                         Stripe webhook (source of truth for payment status)
    validate/                                 Gate entry/exit logic
    crowd/, chat/, users/me/
    admin/                                    stats, fraud, validations, export
lib/
  prisma.ts, fareEngine.ts, routeFinder.ts, qrSigner.ts (AES-256-GCM),
  rewards.ts, email.ts, faqBot.ts, auth.ts, apiClient.ts, stripe.ts
components/
  Navbar, RoleBanner, TrainIllustration, StationPicker, CitySelector,
  LineSchematic, CrowdBadge, BarChart, ChatWidget, StripeCardForm
```

## What's still not done (being honest)

1. **UPI/Wallet are still mocked** — only Card goes through real Stripe. Real UPI needs a
   Razorpay/PhonePe business account (India-specific, separate integration).
2. **Live tracking is simulated** — schedule math, not GPS (no public feed exists for a demo).
3. **No admin CRUD** — can't add/edit stations/lines/fares from the UI yet.
4. **No discount-verification UI** — fields exist, nothing to request/approve them yet.
5. **No refresh-token rotation** — 12h access tokens only.
6. **Not deployed anywhere** — see "Deploying for real" above; that part needs your own
   accounts, which I can't create for you.
7. **No automated tests, no rate limiting, no secrets rotation** — fine for a personal/learning
   project, not yet hardened for hostile traffic at scale.

Real Stripe payments and the deployment path were the two biggest gaps — both are now actually
done (Stripe) or fully prepped with exact steps (deployment). Want help actually walking through
the PlanetScale + Vercel deploy next, once you're ready?
#   M e t r o G o  
 