# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tour Ticket is a full-stack tour booking platform built with Next.js 15, TypeScript, MongoDB, and various third-party integrations. The application supports user authentication, tour browsing with AI-powered search, booking management, payment processing, and a comprehensive admin dashboard.

## Development Commands

```bash
# Development
pnpm dev                    # Start dev server with auto port detection (starts at 3000, increments if busy)
pnpm dev:original           # Start dev server on port 3000 with Turbopack

# Production
pnpm build                  # Build for production (ignores ESLint/TypeScript errors)
pnpm start                  # Start production server

# Quality
pnpm lint                   # Run ESLint

# Testing
pnpm test                   # Run Jest tests
pnpm test:watch             # Run tests in watch mode
pnpm test:coverage          # Run tests with coverage

# Algolia Search Sync
pnpm algolia:sync           # Sync all published tours to Algolia
pnpm algolia:clear-sync     # Clear Algolia index and resync all tours
pnpm algolia:sync-all       # Sync all tours (including unpublished)

# Utility Scripts (via tsx)
npx tsx scripts/sync-algolia.ts                    # Manual Algolia sync
npx tsx scripts/check-algolia-status.ts            # Check Algolia connection
npx tsx scripts/populate-categories-and-reviews.ts # Seed data
npx tsx scripts/cleanup-demo-users.ts              # Clean demo data
npx tsx scripts/test-email.ts                      # Test email templates
```

## Architecture

### Tech Stack Core
- **Framework**: Next.js 15 with App Router (Server Components by default)
- **Language**: TypeScript 5
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens (jose library) stored in HTTP-only cookies
- **Search**: Algolia for instant search with fallback to MongoDB/Fuse.js
- **Payments**: Stripe
- **Email**: Mailgun
- **Storage**: Cloudinary for images
- **Monitoring**: Sentry
- **Support**: Intercom

### Directory Structure

```
app/                      # Next.js App Router - all routes
├── api/                  # API routes (Route Handlers)
│   ├── admin/           # Admin-only APIs (protected)
│   ├── auth/            # Authentication endpoints
│   ├── bookings/        # Booking management
│   ├── checkout/        # Payment processing
│   └── search/          # Search endpoints
├── admin/               # Admin dashboard pages (protected)
├── user/                # User dashboard pages (protected)
├── [slug]/              # Dynamic tour detail pages (catch-all route)
└── (other routes)/      # Static pages (about, contact, etc.)

lib/                     # Backend logic and models
├── models/             # Mongoose schemas
├── auth/               # Auth utilities
├── email/              # Email templates and Mailgun integration
├── utils/              # Helper functions
├── dbConnect.ts        # Database connection with model loading
├── algolia.ts          # Algolia sync functions
├── jwt.ts              # JWT sign/verify with jose
└── stripe.ts           # Stripe initialization

components/             # React components (mix of Server/Client)
contexts/              # React Context providers (Client components)
hooks/                 # Custom React hooks
utils/                 # Frontend utilities
types/                 # TypeScript type definitions
scripts/               # Utility scripts for maintenance
```

### Key Architectural Patterns

#### 1. Database Connection
All database operations must use `dbConnect()` from `lib/dbConnect.ts`. This function:
- Maintains a cached connection across hot reloads
- Automatically loads all Mongoose models on connection
- Provides connection status helpers

```typescript
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

export async function GET() {
  await dbConnect();
  const tours = await Tour.find({ published: true });
  // ...
}
```

#### 2. API Route Pattern
All API routes follow Next.js 15 Route Handler conventions:
- Use named exports: `GET`, `POST`, `PUT`, `DELETE`
- Return `NextResponse` objects
- Call `dbConnect()` before any database operations
- For admin routes, verify authentication first

#### 3. Authentication Flow
- JWT tokens stored in HTTP-only cookies named `authToken`
- Token verification via `lib/jwt.ts` using jose library
- Passwords hashed with bcryptjs
- Middleware in `middleware.ts` handles route protection
- Admin routes require `role: 'admin'` in JWT payload

#### 4. Server vs Client Components
- Default to Server Components (faster, better SEO)
- Use `'use client'` directive only when needed:
  - Interactive UI (forms, buttons with state)
  - React Context consumers
  - Browser APIs (localStorage, window, etc.)
  - Event handlers

#### 5. Dynamic Routing
- Primary tour pages use `app/[slug]/page.tsx` (catch-all dynamic route)
- Middleware in `middleware.ts` excludes reserved paths
- Old routes (`/tour/:slug`, `/tours/:slug`) redirect to `/:slug` via next.config.ts

#### 6. Algolia Integration
When modifying Tour data:
1. Save to MongoDB first
2. Then sync to Algolia using `syncTourToAlgolia()` from `lib/algolia.ts`
3. Handle sync failures gracefully (Algolia is supplementary)

Example:
```typescript
import { syncTourToAlgolia } from '@/lib/algolia';

// After creating/updating tour
await tour.save();
await syncTourToAlgolia(tour); // Non-blocking, logs errors
```

## Important Conventions

### Port Management
Development server auto-detects available ports starting from 3000 via `scripts/dev-with-port.ts`. This prevents port conflicts in multi-project environments.

### Environment Variables
All required environment variables are documented in README.md. Key ones:
- `MONGODB_URI` - MongoDB connection string (required)
- `JWT_SECRET` - Must be 32+ characters (required)
- `STRIPE_SECRET_KEY` - Stripe API key (required for payments)
- `NEXT_PUBLIC_ALGOLIA_*` - Algolia credentials (optional but recommended)
- `MAILGUN_API_KEY` - Mailgun API (required for emails)
- `CLOUDINARY_*` - Cloudinary credentials (required for uploads)

### Path Aliases
TypeScript path alias `@/*` maps to root directory:
```typescript
import Tour from '@/lib/models/Tour';
import { Header } from '@/components/Header';
```

### Error Handling
- Build ignores ESLint and TypeScript errors (see next.config.ts)
- Runtime errors monitored via Sentry
- API routes should return proper HTTP status codes
- User-facing errors shown via react-hot-toast

### Image Handling
- Images served via Cloudinary CDN
- Next.js Image optimization disabled (`unoptimized: true`) for Netlify compatibility
- Remote patterns configured for Cloudinary, Unsplash, AWS S3

### Caching Strategy
- Homepage: No caching (`max-age=0`) for real-time admin updates
- API routes: No caching
- Static assets: Long-term caching (1 year immutable)
- Tour pages: Can use ISR/SSR as needed

## Model Relationships

Key Mongoose models and their relationships:
- **User** - Stores user accounts, roles (user/admin), team memberships
- **Tour** - Main tour entity with embedded booking options, pricing, itinerary
- **Destination** - Locations; tours reference via `destinationId`
- **Category** - Tour categories; tours have `categories` array
- **Booking** - Stores reservations, links to User and Tour(s)
- **Review** - User reviews for tours
- **Blog** - Blog posts for content marketing
- **AttractionPage** - Landing pages for attractions
- **HeroSettings** - Homepage hero configuration
- **Discount** - Promotional codes
- **Comment** - Blog post comments

## Admin Dashboard

Admin routes (`/admin/*`) require authentication with `role: 'admin'`. Layout uses separate auth context (`AdminAuthContext`).

Key admin features:
- Tour CRUD with rich form (TourForm.tsx - 144KB, complex component)
- Booking management and status updates
- User management
- Analytics dashboard with Chart.js/Recharts
- Bulk operations (uploads, data import)
- Hero settings configuration
- Discount/promo code management

## Testing

Jest configured with React Testing Library. Tests in `__tests__` directories.

## Common Gotchas

1. **Mongoose Models**: Always import models after `dbConnect()` is called, or models may not be registered
2. **Client Components**: Contexts like `AuthContext`, `CartContext` require `'use client'` and providers in layout
3. **Algolia Sync**: Failed syncs don't break the app; check logs and use sync scripts
4. **Port Detection**: Don't hardcode `localhost:3000`; use `NEXT_PUBLIC_APP_URL` env var
5. **Build Errors**: Build ignores TypeScript/ESLint errors; fix them for code quality, but won't block deployment
6. **Image Paths**: Always use absolute URLs or Cloudinary for production images
7. **Dynamic Routes**: New top-level routes must be added to `reservedPaths` in `middleware.ts` to avoid conflict with tour slugs

## Performance Considerations

- Server Components for data fetching (no client-side hydration cost)
- Algolia provides instant search; fallback to DB search adds latency
- Images served via Cloudinary CDN
- Database connection pooling (maxPoolSize: 10)
- Turbopack enabled for faster dev builds
- Static assets cached at CDN level

## AI Features

The application includes AI-powered search widgets:
- `AISearchWidget.tsx` - Main search interface
- `AIAgentWidget.tsx` - AI assistant for tour recommendations
- Uses Vercel AI SDK with streaming responses

When modifying these, be aware of client-side state management and streaming requirements.
