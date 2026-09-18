// lib/email/templates/shared.ts
//
// Helpers every content template shares. A template file below this one holds
// only its content — the chrome lives in `lib/email/layout.ts`.

import { normalizeOrigin, type EmailBrand, type EmailRow, type EmailSection } from '../layout';

/**
 * What `EmailService.getDefaultTemplateData` merges under every template's own
 * data. Kept as its own type so a template cannot read a field the service does
 * not actually provide.
 */
export interface BrandDefaults {
  companyName: string;
  companyLogo?: string;
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  contactEmail: string;
  contactPhone?: string;
  supportEmail: string;
  website: string;
  postalAddress?: string;
  year: number;
}

/** A template receives its own data with the brand defaults merged underneath. */
export type WithBrand<T> = T & BrandDefaults;

export function brandOf(data: BrandDefaults): EmailBrand {
  return {
    companyName: data.companyName,
    companyLogo: data.companyLogo,
    primaryColor: data.primaryColor,
    // A brand may configure only one of the two; either is a monitored inbox.
    supportEmail: data.supportEmail || data.contactEmail,
    contactPhone: data.contactPhone,
    website: normalizeOrigin(data.website),
    postalAddress: data.postalAddress,
  };
}

/** Absolute URL on the brand's own origin. Templates never hand-build one. */
export function siteUrl(data: BrandDefaults, path: string): string {
  const origin = normalizeOrigin(data.website);
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * A money value, or `null` when the record does not actually carry one.
 *
 * A receipt that prints "Total paid" with nothing beside it is worse than a
 * receipt without the row: the reader cannot tell whether they were charged
 * nothing or whether the email is broken. Callers use this to decide whether a
 * money row — or the whole block — is rendered at all.
 */
export function money(value: unknown): string | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  // "$", "USD" or a stray "-" alone is a formatting artefact, not an amount.
  if (!/\d/.test(text)) return null;
  return text;
}

/** Drop rows whose value is empty so a template never shows "Date: —". */
export function rows(...candidates: Array<EmailRow | false | null | undefined>): EmailRow[] {
  return candidates.filter((row): row is EmailRow => Boolean(row) && String((row as EmailRow).value).trim() !== '');
}

export function sections(...candidates: Array<EmailSection | false | null | undefined>): EmailSection[] {
  return candidates.filter((section): section is EmailSection => Boolean(section));
}

/** "2 days, 3 hours" — never "177:57:47", and never a bare "0". */
export function humanizeCountdown(timeUntil?: { days: number; hours: number; minutes: number }): string {
  if (!timeUntil) return '';
  const days = Number(timeUntil.days) || 0;
  const hours = Number(timeUntil.hours) || 0;
  const minutes = Number(timeUntil.minutes) || 0;
  if (days <= 0 && hours <= 0 && minutes <= 0) return 'Starting now';
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (days === 0 && minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
  return parts.join(', ');
}

/** "2 adults · 1 child · Private tour", skipping the counts that are zero. */
export function guestSummary(input: {
  adults?: number | string;
  children?: number | string;
  infants?: number | string;
  option?: string;
}): string {
  const parts: string[] = [];
  const adults = Number(input.adults) || 0;
  const children = Number(input.children) || 0;
  const infants = Number(input.infants) || 0;
  if (adults > 0) parts.push(`${adults} adult${adults === 1 ? '' : 's'}`);
  if (children > 0) parts.push(`${children} child${children === 1 ? '' : 'ren'}`);
  if (infants > 0) parts.push(`${infants} infant${infants === 1 ? '' : 's'}`);
  if (input.option) parts.push(input.option);
  return parts.join(' · ');
}

/**
 * The hotel-pickup block, identical everywhere it appears.
 *
 * The map is decoration: the place name, address and instructions are printed
 * as text so a reader with images blocked still knows where to stand.
 */
export function pickupSection(input: {
  hotelPickupDetails?: string;
  hotelPickupLocation?: { name?: string; address?: string };
  hotelPickupMapImage?: string;
  hotelPickupMapLink?: string;
}): EmailSection | null {
  if (!input.hotelPickupDetails && !input.hotelPickupLocation?.address) return null;
  const lines = [
    input.hotelPickupLocation?.name,
    input.hotelPickupLocation?.address,
    input.hotelPickupDetails,
  ].filter((line): line is string => Boolean(line && String(line).trim()));

  if (input.hotelPickupMapImage) {
    return {
      kind: 'image',
      title: 'Hotel pickup',
      src: input.hotelPickupMapImage,
      alt: `Map of the pickup point${input.hotelPickupLocation?.name ? ` at ${input.hotelPickupLocation.name}` : ''}`,
      caption: lines.join(' — '),
      href: input.hotelPickupMapLink,
      width: 480,
    };
  }
  return { kind: 'note', title: 'Hotel pickup', body: lines };
}

/** A phone number the reader can dial, written the way people read it. */
export function whatsappLine(contactNumber?: string): string {
  if (!contactNumber) return '';
  return `WhatsApp us on ${contactNumber}`;
}
