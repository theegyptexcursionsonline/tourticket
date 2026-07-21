# EEO high-priority feedback — top five

Date: 21 July 2026  
Scope: EEO main, English multi-tenant network, German multi-tenant network

## Completed items

1. **Booking option and time-slot isolation**
   - Every time slot is now bound to its owning booking option.
   - Identical time labels/IDs in different options no longer select multiple cards.
   - Cart and checkout resolve the selected option by `optionId`, so the displayed and charged price stay aligned.

2. **Tour add-ons can be selected**
   - An unselected add-on now stores one selected unit on click.
   - Per-person multiplication remains in the total calculation and no longer prevents the initial selection.

3. **New tours appear on assigned category/catalogue pages**
   - Confirmed the current create/update flow invalidates the full localized storefront immediately.
   - Confirmed tenant category queries match both the primary `tenantId` and multi-brand `tenantIds` without cross-brand fallback.

4. **Pages search reliability and isolation**
   - Rapid searches cancel stale requests and a transient read failure is retried once.
   - Tenant, cursor and search `$or` clauses are combined with `$and`; pagination can no longer replace tenant scope.
   - Search input is bounded to protect the admin endpoint from oversized queries.

5. **Public preview links**
   - Pages/categories and tours now open their public storefront URL, never the dashboard hostname.
   - Multi-tenant previews use the row's tenant domain; main EEO removes the `dashboard2` subdomain.

## Regression coverage

- Booking selection collision and correct option resolution
- Add-on on/off selection state
- Pages tenant/cursor/search filter composition
- Pages transient-failure retry
- Main, English-tenant and German-tenant preview URL resolution
- Existing storefront invalidation and multi-brand tenant-query suites

## Local quality gate

- TypeScript: passed in all three repositories
- ESLint: passed in all three repositories
- Jest: 1,416 tests passed (637 main, 418 English network, 361 German network)
- Production build: passed in all three repositories

## Deployment and visual proof

- Main EEO: commit `1442937a691896ea96a774d0fd59d2834bea9e2f`, Netlify deploy `6a5fac3da4e1630008e4a049`, ready.
- English network: commit `878ad13ef92d1f591d1e094a61a5681207fbe6b4`, Netlify deploy `6a5fac3dd2cc88000846ca7d`, ready.
- German network: commit `17e7ea5bf17aa2a5990813a823f548a20fba4785`, Netlify deploy `6a5fac3bdb60fd0007f5693b`, ready.

Live Codex-browser verification:

- Selected tour option completed without the former pricing error and changed the two-adult total from `$160.00` to the selected option's `$240.00`.
- Selecting the `$20.00` Tutankhamun add-on changed the live total to `$260.00`.
- Main Pages search for `Luxor` returned three matching records with no alert; preview URLs use `egypt-excursionsonline.com`.
- Network Pages search under `Ägypten Ausflüge` returned the isolated matching record with no alert; its preview uses `aegyptenausfluege.de` and opens successfully.
- Main and network Tours lists expose `View public tour` links on their storefront domains.
- A live attraction page displayed its selected tour links, confirming page-to-tour rendering.
- English and German network storefront/search pages returned `200`; unauthenticated admin Pages requests remained blocked with `401`.

Proof files are stored in `eeo/feedback-proof-2026-07-21/`:

- `before-pricing-option-unavailable.png`
- `before-pages-preview-links.png`
- `after-booking-option-price-bound.png`
- `after-live-addon-selected.png`
- `after-pages-search-and-public-links.png`
- `after-network-pages-tenant-search.png`
