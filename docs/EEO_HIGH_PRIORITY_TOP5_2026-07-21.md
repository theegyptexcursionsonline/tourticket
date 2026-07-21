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

Production commit hashes, deployment status and Codex-browser screenshots will be recorded here after the Git-linked Netlify releases are live.
