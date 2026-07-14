import { createHash, randomUUID } from 'node:crypto';

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45) || 'option';
}

export function pricingKeyFor(tourId: string, option: { id?: string; label?: string; type?: string }) {
  // Never use array position: options can be reordered by admins. Prefer a
  // durable source id and otherwise mint a one-time identifier persisted by the migration.
  const identity = option.id?.trim() || randomUUID();
  const fingerprint = createHash('sha256').update(`${tourId}:${identity}`).digest('hex').slice(0, 12);
  return `${slug(option.label || option.type || 'option')}-${fingerprint}`;
}

export function ensureBookingOptionPricingKeys<T extends { id?: string; pricingKey?: string; label?: string; type?: string }>(tourId: string, options: T[] | undefined) {
  if (!Array.isArray(options)) return options;
  const seen = new Set<string>();
  return options.map((option) => {
    let pricingKey = typeof option?.pricingKey === 'string' && /^[a-z0-9][a-z0-9_-]{2,79}$/.test(option.pricingKey)
      ? option.pricingKey
      : pricingKeyFor(tourId, option || {});
    while (seen.has(pricingKey)) pricingKey = pricingKeyFor(tourId, { ...option, id: randomUUID() });
    seen.add(pricingKey);
    return { ...option, pricingKey };
  });
}
