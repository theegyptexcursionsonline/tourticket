# RevenuePilot pricing interface

TourTicket remains the pricing authority. RevenuePilot may call the versioned `/api/v1/revenue/*` machine endpoints only with a dedicated HMAC identity. Customer quotes resolve through `/api/tours/{tourId}/quote`; checkout rejects a stale `priceVersion` with `409 PRICE_CHANGED`.

Required deployment settings:

- `REVENUEPILOT_HMAC_KEYS`: comma-separated `keyId:secret` pairs. Secrets must be at least 32 characters and stored only in Netlify/Railway secret stores.
- `REVENUEPILOT_HMAC_SCOPES`: comma-separated `keyId=read|write` grants. A rotation key can be added before removing the old key.
- `REVENUEPILOT_PRICING_API_ENABLED=false`: global write kill switch. Keep false through migration and shadow qualification.
- `REVENUEPILOT_MAX_WRITE_PERCENT=5`: TourTicket-side defense-in-depth movement cap.

Run `pnpm revenue:backfill-pricing` once before enabling any write. The migration assigns immutable option keys and imports populated legacy slot prices into versioned overrides. Re-running it is safe.

The signed canonical request is `timestamp + newline + nonce + newline + method + newline + path-and-query + newline + SHA-256(body)`. Timestamps have a five-minute window and nonces are single use.
