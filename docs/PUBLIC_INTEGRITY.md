# Public action integrity

## Durable controls

- Login, signup, password-reset, contact, newsletter, and blog-like writes use MongoDB fixed-window counters. The current Firebase email/password UI performs a same-origin durable login check before invoking Firebase, whose provider-side protections remain active. Counters are atomically incremented, automatically expire through a TTL index, and retain only purpose-bound HMAC identities.
- Only Netlify's `x-nf-client-connection-ip` edge header is accepted as a network address. Client-controlled `x-forwarded-for` and `x-real-ip` values are ignored.
- `ABUSE_LIMIT_HASH_SECRET` must be at least 32 characters. `JWT_SECRET` is a compatibility fallback, but production should provision the dedicated secret so identity hashing and token signing have separate keys.
- Public request bodies are byte-bounded before JSON parsing and their fields have explicit length limits.

## Newsletter consent

`POST /api/subscribe` never reports an email as subscribed immediately. It stores a tenant/source/email-scoped consent in `pending`, creates an idempotent durable provider job only when `NEWSLETTER_PROVIDER_MODE=durable_outbox`, and returns `202` with instructions to confirm. Without the outbox configuration it saves the pending request but returns `503` and explicitly says that the visitor is not subscribed.

`DELETE /api/subscribe` stores a durable suppression record, increments its generation, and cancels all older queued or processing double-opt-in jobs. Workers must re-check `newsletterProviderJobIsCurrent` immediately before provider submission, so a stale retry cannot reverse an unsubscribe. Consent states are `pending`, `confirmed`, and `unsubscribed`; provider states are recorded separately. Raw IP addresses and user-agent strings are never stored. Provider jobs expire after 30 days (cancelled jobs after seven days), bounding retention of their delivery address. A reviewed worker must lease provider jobs and call the server-side `confirmNewsletterConsent` transition only after a signed provider confirmation. This repository does not make a live newsletter-provider request.

## Blog likes

The like endpoint sets a signed, HttpOnly, SameSite visitor cookie only after a visitor interacts. `BlogLike` has a unique tenant/post/visitor index, so retries and concurrent clicks replay instead of incrementing again. Existing like counts become a one-time baseline; each request reconciles the materialized count from durable records with `$max`, which is crash-safe without a multi-document transaction. Clearing cookies creates a new browser identity, so a second network/visitor abuse limit remains in force.

## Guest profile claims

Checkout-created customer profiles are explicitly marked `isGuestProfile=true` and contain neither a password nor Firebase UID. Only an authoritative Firebase identity with `emailVerified=true` may claim that same record—and retain its bookings, phone, country and customer ID—when an atomic database filter re-checks all invariants. A direct password signup proves only knowledge of the address, so an existing guest returns `EMAIL_VERIFICATION_REQUIRED` without mutation. Ordinary accounts, inactive users, privileged roles and already-linked profiles fail closed with `409`; email equality alone never links an identity. Same-Firebase-UID retries replay safely, while competing UIDs cannot both claim one guest.

## Public booking verification

The QR verification route treats the booking reference as a high-entropy capability, default-tenant scopes the lookup, and returns only tour, date/time, guest count, option title, reference and status. Customer identity, contact data, special requests, emergency contacts, price and payment data are never returned. New manual/non-card references use cryptographic randomness instead of `Math.random`; existing paid-cart references remain deterministic for checkout/webhook idempotency.

Every verification response is `private, no-store`. Fixed-window distributed limits apply both to the trusted Netlify network identity and to a purpose-HMAC of the reference, with a bounded format check before database work. This preserves the customer QR flow while making automated reference enumeration materially harder.

## Rich content

Every live `ReactMarkdown` surface that accepts CMS, database or AI content parses legacy raw HTML only before applying the shared `rehype-sanitize` allow-list. Scripts, iframes, embedded objects, forms, styles and event attributes are removed; a second URL transform rejects `javascript:`, `data:`, `vbscript:`, `file:` and other non-HTTP schemes. `pnpm tsx scripts/verify-markdown-security.ts` server-renders malicious fixtures to prove the executable forms are removed while safe HTTPS content remains.

## Content Security Policy

Production no longer permits `unsafe-eval`, script attributes are disabled, frames are denied by default, object embedding is disabled, and browser connections are restricted to the explicit Firebase, Algolia, Stripe, Google, Intercom, Sentry, Cloudflare, Elfsight, AdRoll, Facebook, exchange-rate, Cloudinary, and Foxes service allowlists. Shared client surfaces also hydrate from deterministic server-safe state before applying viewport or locale-specific updates, preventing recovery renders from weakening browser evidence.

`unsafe-inline` remains for scripts and styles because Next.js hydration, JSON-LD, and current third-party widgets do not yet share a per-response nonce. Removing it safely requires nonce propagation through the Next.js render pipeline and browser regression testing of Stripe, Maps/reCAPTCHA, Algolia, and Intercom. Do not replace it with hashes generated at build time: several scripts are dynamic.

## Required launch checks

1. Provision `ABUSE_LIMIT_HASH_SECRET` and confirm it is available to Netlify functions, including the public booking-verification route.
2. Keep `NEWSLETTER_PROVIDER_MODE` unset until a provider worker is implemented, reviewed, and tested. The UI will truthfully fail closed while requests remain pending.
3. Verify Mongo indexes for `AbuseRateLimit`, `NewsletterConsent`, `NewsletterProviderJob`, `BlogLike`, and the existing unique user identities during a maintenance-safe release step.
4. Configure Firebase Admin, Mailgun, `NEXT_PUBLIC_BASE_URL`, and reCAPTCHA before enabling password reset/contact in production.
5. Run the focused integrity tests, full typecheck/lint/unit/build gates, and desktop/mobile browser smoke tests before release.
