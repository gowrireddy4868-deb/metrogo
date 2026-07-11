# MetroGo 🚇

A full-stack metro ticket booking platform for Indian cities — built with Next.js, MySQL, Prisma, Stripe, and Claude AI.

**Live Demo:** https://metrogo-production.up.railway.app

---

## What it does

- Plan journeys across 6 Indian cities (Bengaluru, Chennai, Delhi, Mumbai, Hyderabad, Kolkata)
- Book single or return tickets with zone-based fare calculation and peak-hour pricing
- Pay with Card (real Stripe test-mode), UPI, or Wallet
- Get an AES-256-GCM encrypted QR code ticket via email and on-screen
- Scan QR at gate (entry/exit state machine with fraud detection)
- Buy Day/Week/Month unlimited passes
- Earn reward points and daily booking streaks
- AI support chatbot powered by Claude API
- Full admin dashboard with revenue charts, fraud detection, CSV export

---

## Tech Stack

| | |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | MySQL 8.0 + Prisma ORM |
| Auth | JWT access tokens (12h) + refresh tokens (30d) with rotation |
| Payments | Stripe (test mode) |
| Email | Brevo API |
| AI | Anthropic Claude API |
| QR | AES-256-GCM encrypted |
| Hosting | Railway |

---

## Features

**Riders**
- Multi-city journey planner with BFS multi-line routing
- Peak-hour fare surcharge + crowd level prediction
- Single & return tickets, guest checkout (no login needed)
- Download / Share / Print QR ticket
- Ticket history with search and date filter
- Day/Week/Month passes
- Reward points, streaks, Bronze/Silver/Gold/Platinum tiers
- Email confirmations, verification, password reset
- Dark mode, profile page

**Staff**
- Gate scanner with camera QR scanning
- Entry → Exit state machine, duplicate-use prevention
- Fare shortfall detection on exit

**Admin**
- Revenue & booking trend charts (14 days)
- Active users, station-wise bookings, ticket status breakdown
- Fraud detection (repeated failed gate scans)
- Full validation audit log with pagination
- CSV export (tickets, validations, users)

---

## Cities & Network

| City | Lines | Stations |
|---|---|---|
| Bengaluru | Blue, Green, Purple | 38 |
| Chennai | Blue, Green | 31 |
| Delhi | Yellow, Blue | 74 |
| Mumbai | Aqua, Orange | 29 |
| Hyderabad | Red, Blue | 52 |
| Kolkata | Blue | 25 |

---

## Local Setup

```bash
# 1. Clone the repo
git clone https://github.com/gowrireddy4868-deb/metrogo.git
cd metrogo

# 2. Install dependencies
npm install

# 3. Set up environment variables
copy .env.example .env
# Fill in your values (see .env.example)

# 4. Set up database
npx prisma generate
npx prisma db push --force-reset
npm run db:seed

# 5. Run
npm run dev
```

Open http://localhost:3000

---

## Environment Variables

```env
DATABASE_URL="mysql://root:password@localhost:3306/metro_booking"
JWT_ACCESS_SECRET="..."
JWT_REFRESH_SECRET="..."
QR_SIGNING_SECRET="..."
APP_URL="http://localhost:3000"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
BREVO_API_KEY="..."          # Email delivery
ANTHROPIC_API_KEY="..."      # AI chatbot (optional)
STRIPE_SECRET_KEY="..."      # Real card payments (optional)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="..."
STRIPE_WEBHOOK_SECRET="..."
ADMIN_EMAIL="your@email.com"
CRON_SECRET="..."
```

---

## Security

- Passwords hashed with bcrypt
- JWT with refresh token rotation and reuse detection
- AES-256-GCM QR encryption (not just signed — contents unreadable)
- Rate limiting on login, signup, and gate validation
- Stripe webhook signature verification
- Admin access locked to a specific email

---

## What's simulated

Being transparent about what's not fully real yet:

- **UPI/Wallet** — UI exists, always succeeds (no Razorpay integration)
- **Live train tracking** — schedule-based math, not real GPS
- **Admin CRUD** — dashboard is read-only (can't add stations/fares from UI)

---

## Screenshots

> Coming soon

---

## License

MIT
