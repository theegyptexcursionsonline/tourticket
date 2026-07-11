import { createHash } from 'node:crypto';

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45) || 'option';
}

export function pricingKeyFor(tourId: string, option: { label?: string; type?: string }, index: number) {
  const fingerprint = createHash('sha256').update(`${tourId}:${index}:${option.label || ''}:${option.type || ''}`).digest('hex').slice(0, 10);
  return `${slug(option.label || option.type || 'option')}-${fingerprint}`;
}

export function ensureBookingOptionPricingKeys(tourId: string, options: any[] | undefined) {
  if (!Array.isArray(options)) return options;
  const seen = new Set<string>();
  return options.map((option, index) => {
    let pricingKey = typeof option?.pricingKey === 'string' && /^[a-z0-9][a-z0-9_-]{2,79}$/.test(option.pricingKey)
      ? option.pricingKey
      : pricingKeyFor(tourId, option || {}, index);
    while (seen.has(pricingKey)) pricingKey = `${pricingKey}-${index}`.slice(0, 80);
    seen.add(pricingKey);
    return { ...option, pricingKey };
  });
}
