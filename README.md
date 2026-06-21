# Egypt Excursions Online — Tour Booking Platform

Full-stack Next.js tour booking website for Egypt Excursions Online: browse and book tours, pay online, and manage the catalog, bookings, and content through a built-in admin dashboard.

## Tech stack

- Next.js 16 (App Router) + React 19 + TypeScript
- MongoDB with Mongoose
- Tailwind CSS (RTL-aware), next-intl for localization
- JWT auth (jose) + bcryptjs for admins; Firebase Auth for users
- Stripe payments and webhooks
- Algolia instant search with Fuse.js fallback, plus an AI search/assistant (Vercel AI SDK + OpenAI)
- Cloudinary images, Mailgun email, Sentry monitoring, Intercom support
- PDF receipts (pdf-lib / pdfkit / jspdf) and QR-code tickets
- Jest + React Testing Library, Playwright for E2E

## Features

- Tour, destination, and category browsing with detailed tour pages
- Instant Algolia search, AI-powered search and recommendations
- Cart, checkout, and Stripe payments with QR tickets and PDF receipts
- User accounts (Firebase) with bookings, wishlist, and profile
- Admin dashboard: tours, bookings, availability/stop-sales, special offers, discounts, reviews, hero settings, blog, reports, and bulk upload
- Multilingual UI (en, ar, es, fr, de) with RTL support
- Transactional email and newsletter subscriptions
- Cron endpoints for trip reminders and completion emails

## Getting started

### Prerequisites

- Node.js 20
- pnpm
- MongoDB (Atlas or local)
- Accounts for Stripe, Cloudinary, Mailgun, Algolia, Firebase, OpenAI

### Install

```bash
pnpm install
```

### Environment

Copy `.env.local` and provide values for the keys used in code, including:

- `MONGODB_URI`
- `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`
- `STRIPE_SECRET_KEY`, `STRIPE_RESTRICTED_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_ALGOLIA_APP_ID`, `NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY`, `NEXT_PUBLIC_ALGOLIA_INDEX_NAME`, `ALGOLIA_ADMIN_API_KEY`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`
- `OPENAI_API_KEY`
- Firebase: `NEXT_PUBLIC_FIREBASE_*` (client) and `FIREBASE_SERVICE_ACCOUNT_URL` (server)
- Optional Foxes integration: `NEXT_PUBLIC_FOXES_*`

### Run

```bash
pnpm dev             # dev server with auto port detection
pnpm build           # production build (runs unit tests first)
pnpm build:skip-tests
pnpm start           # serve the production build
```

### Test & lint

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:api
pnpm test:e2e
```

### Algolia sync

```bash
pnpm algolia:sync        # sync published tours
pnpm algolia:sync-all    # sync all tours
pnpm algolia:clear-sync  # clear index and resync
```

## Project structure

```
app/             # App Router: routes, [locale]/, admin/, api/
components/       # React components (shared, admin, search, booking, …)
contexts/         # React context providers (auth, cart, settings, …)
hooks/            # custom hooks
lib/              # backend logic: models, db, auth, email, algolia, stripe, jobs
i18n/ messages/   # localization config and translation catalogs
middleware.ts     # routing / locale handling
scripts/          # maintenance and sync utilities
e2e/ __tests__/   # Playwright and Jest tests
```

## Deployment

Deployed on Netlify (see `netlify.toml`). Custom domain `egypt-excursionsonline.com`.
