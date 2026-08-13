/**
 * Campaign offer links on EEO main: /offer/<CODE>?name=<Name>&city=<city>&ends=<date>.
 *
 * The link IS the offer — the code identifies the team member (they earn a %
 * on upsells), the name personalizes the greeting, the city scopes the
 * catalogue, and the date may only TIGHTEN the window. Nothing here sets a
 * price: the Discount record is the sole authority and checkout re-verifies it.
 */

export function looksLikeCampaignCode(value: string): boolean {
  return /^[A-Za-z0-9]{3,24}$/.test(value);
}

/** Display-only personalization: letters, spaces and hyphens survive. */
export function sanitizeOfferName(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/[^\p{L} '-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24)
    .trim();
  if (cleaned.length < 2) return null;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * A URL-supplied end date may only tighten the offer window, never extend it
 * past the code's own expiry; a past or unparseable date is ignored.
 */
export function clampOfferEnd(
  requested: string | undefined | null,
  codeExpiresAt: Date | null,
  now: Date = new Date(),
): Date | null {
  let candidate: Date | null = null;
  if (requested && /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(requested.trim())) {
    const value = requested.trim();
    candidate = value.includes('T') ? new Date(value) : new Date(`${value}T23:59:59.000Z`);
    if (Number.isNaN(candidate.getTime()) || candidate.getTime() <= now.getTime()) candidate = null;
  }
  if (candidate && codeExpiresAt) return candidate < codeExpiresAt ? candidate : codeExpiresAt;
  return candidate ?? codeExpiresAt;
}

export type CampaignDiscount = { discountType: 'percentage' | 'fixed'; value: number };

/**
 * Per-tour display pricing that can never promise what checkout will not
 * charge. EEO main applies a percentage code to the cart subtotal — which
 * distributes exactly over each tour — so per-tour discounted prices are
 * honest. A FIXED code applies once per cart, so per-tour "discounted" prices
 * would lie; those tours keep their list price and the page says
 * "−$V at checkout" instead.
 */
export function tourDisplayPricing(listPrice: number, discount: CampaignDiscount): {
  offerPrice: number;
  saving: number;
  perTourDiscount: boolean;
} {
  if (discount.discountType === 'percentage') {
    const pct = Math.min(Number(discount.value), 100);
    const offerPrice = Math.round(listPrice * (1 - pct / 100) * 100) / 100;
    return { offerPrice, saving: Math.round((listPrice - offerPrice) * 100) / 100, perTourDiscount: true };
  }
  return { offerPrice: listPrice, saving: 0, perTourDiscount: false };
}

/**
 * EEO main's destinations are mid-migration: the "-old" records still hold
 * most published tours. Each city therefore maps to every slug that belongs
 * to it, old and new, so the page sees the full catalogue.
 */
export const CITY_CATALOG: Record<string, { label: string; slugs: string[] }> = {
  'sharm-el-sheikh': { label: 'Sharm el-Sheikh', slugs: ['sharm-el-sheikh', 'sharm-el-sheikh-old'] },
  'hurghada': { label: 'Hurghada', slugs: ['hurghada', 'hurghada-old', 'hurghada-egypt'] },
  'cairo': { label: 'Cairo & Giza', slugs: ['cairo-old', 'giza', 'giza-old'] },
  'luxor': { label: 'Luxor', slugs: ['luxor', 'luxor-old'] },
  'el-gouna': { label: 'El Gouna', slugs: ['el-gouna', 'el-gouna-old'] },
};

export function cityFromParam(raw: string | undefined | null): { key: string; label: string; slugs: string[] } | null {
  const key = (raw || '').trim().toLowerCase();
  const entry = CITY_CATALOG[key];
  return entry ? { key, ...entry } : null;
}
