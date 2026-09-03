// Deterministic, read-only catalogue projection for assistant knowledge sync.
//
// A support assistant answers from the SAME published facts a customer reads on
// the site. This module turns one published tour into a stable text document
// plus a content hash, so a consumer can skip unchanged tours instead of
// re-embedding the whole catalogue on every run.
//
// Rules that must not drift:
// - published, non-archived, default-tenant tours only (a draft or another
//   tenant's tour must never reach an assistant);
// - no operational or personal data (no createdBy/updatedBy, no availability
//   slots, no revenue pricing) — public page content only;
// - field order is FIXED, so an unchanged tour always hashes to the same value.

import { createHash } from 'crypto';

export const CATALOGUE_EXPORT_CONTRACT = '2026-09-03.catalogue-export-v1';
export const CATALOGUE_EXPORT_MAX_LIMIT = 100;
export const CATALOGUE_EXPORT_DEFAULT_LIMIT = 50;

type Taxonomy = { name?: string; slug?: string } | null | undefined;

export type CatalogueTourInput = {
  _id: { toString(): string };
  title?: string;
  slug?: string;
  description?: string;
  longDescription?: string;
  duration?: string;
  location?: string;
  meetingPoint?: string;
  languages?: string[];
  ageRestriction?: string;
  cancellationPolicy?: string;
  highlights?: string[];
  whatsIncluded?: string[];
  whatsNotIncluded?: string[];
  includes?: string[];
  whatToBring?: string[];
  needToKnow?: string[];
  notSuitableFor?: string[];
  transportationDetails?: string;
  mealInfo?: string;
  price?: number;
  discountPrice?: number;
  currency?: string;
  destination?: Taxonomy;
  category?: Taxonomy | Taxonomy[];
  faq?: Array<{ question?: string; answer?: string }>;
  itinerary?: Array<{ title?: string; description?: string; duration?: string }>;
  updatedAt?: Date | string;
};

export type CatalogueDoc = {
  id: string;
  slug: string;
  url: string;
  title: string;
  updatedAt: string | null;
  contentHash: string;
  text: string;
};

/** Public fields only. Keep this list in sync with the projection below. */
export const CATALOGUE_TOUR_PROJECTION = [
  'title', 'slug', 'description', 'longDescription', 'duration', 'location', 'meetingPoint',
  'languages', 'ageRestriction', 'cancellationPolicy', 'highlights', 'whatsIncluded',
  'whatsNotIncluded', 'includes', 'whatToBring', 'needToKnow', 'notSuitableFor',
  'transportationDetails', 'mealInfo', 'price', 'discountPrice', 'currency', 'destination',
  'category', 'faq', 'itinerary', 'updatedAt',
].join(' ');

function clean(value: unknown, max = 4000): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function list(values: unknown, max = 20): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((v) => clean(v, 300)).filter(Boolean).slice(0, max);
}

function section(title: string, body: string | string[]): string[] {
  if (Array.isArray(body)) return body.length ? [`## ${title}`, ...body.map((b) => `- ${b}`), ''] : [];
  return body ? [`## ${title}`, body, ''] : [];
}

function taxonomyName(value: Taxonomy | Taxonomy[]): string {
  const first = Array.isArray(value) ? value[0] : value;
  return clean(first?.name, 120);
}

/**
 * One tour → one stable knowledge document. `baseUrl` is the public site the
 * citation points at; tours use the site's catch-all slug route.
 */
export function buildCatalogueDoc(tour: CatalogueTourInput, baseUrl: string): CatalogueDoc | null {
  const slug = clean(tour.slug, 200);
  const title = clean(tour.title, 200);
  if (!slug || !title) return null;
  const base = baseUrl.replace(/\/+$/, '');
  const url = `${base}/${slug}`;
  const destination = taxonomyName(tour.destination);
  const category = taxonomyName(tour.category);
  const price = typeof tour.discountPrice === 'number' && tour.discountPrice > 0
    ? tour.discountPrice
    : typeof tour.price === 'number' ? tour.price : null;

  const lines: string[] = [
    `# ${title}`,
    '',
    `Page: ${url}`,
    destination ? `Destination: ${destination}` : '',
    category ? `Category: ${category}` : '',
    clean(tour.duration, 120) ? `Duration: ${clean(tour.duration, 120)}` : '',
    price != null ? `Price from: ${price} ${clean(tour.currency, 10) || 'USD'} per adult` : '',
    clean(tour.location, 200) ? `Location: ${clean(tour.location, 200)}` : '',
    clean(tour.meetingPoint, 400) ? `Meeting point: ${clean(tour.meetingPoint, 400)}` : '',
    list(tour.languages, 12).length ? `Languages: ${list(tour.languages, 12).join(', ')}` : '',
    clean(tour.ageRestriction, 200) ? `Age restriction: ${clean(tour.ageRestriction, 200)}` : '',
    '',
    ...section('Overview', clean(tour.description, 2000)),
    ...section('Details', clean(tour.longDescription, 6000)),
    ...section('Highlights', list(tour.highlights)),
    ...section('Included', list(tour.whatsIncluded).length ? list(tour.whatsIncluded) : list(tour.includes)),
    ...section('Not included', list(tour.whatsNotIncluded)),
    ...section('What to bring', list(tour.whatToBring)),
    ...section('Good to know', list(tour.needToKnow)),
    ...section('Not suitable for', list(tour.notSuitableFor)),
    ...section('Transport', clean(tour.transportationDetails, 1000)),
    ...section('Meals', clean(tour.mealInfo, 1000)),
    ...section('Cancellation policy', clean(tour.cancellationPolicy, 2000)),
  ];

  const itinerary = (Array.isArray(tour.itinerary) ? tour.itinerary : [])
    .slice(0, 30)
    .map((step, index) => `${index + 1}. ${clean(step?.title, 200)}${clean(step?.description, 600) ? ` — ${clean(step.description, 600)}` : ''}`)
    .filter((line) => line.replace(/^\d+\.\s*/, '').trim().length > 0);
  lines.push(...section('Itinerary', itinerary));

  const faq = (Array.isArray(tour.faq) ? tour.faq : [])
    .slice(0, 30)
    .map((entry) => ({ q: clean(entry?.question, 300), a: clean(entry?.answer, 1200) }))
    .filter((entry) => entry.q && entry.a)
    .flatMap((entry) => [`Q: ${entry.q}`, `A: ${entry.a}`]);
  lines.push(...section('Questions and answers', faq));

  const text = lines.filter((line, index, all) => !(line === '' && all[index - 1] === '')).join('\n').trim();
  return {
    id: tour._id.toString(),
    slug,
    url,
    title,
    updatedAt: tour.updatedAt ? new Date(tour.updatedAt).toISOString() : null,
    contentHash: createHash('sha256').update(text).digest('hex'),
    text,
  };
}

/** Clamp a caller-supplied page size into the supported range. */
export function catalogueLimit(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return CATALOGUE_EXPORT_DEFAULT_LIMIT;
  return Math.min(CATALOGUE_EXPORT_MAX_LIMIT, Math.max(1, Math.trunc(parsed)));
}

/** Cursors are opaque to callers but are just the last document id. */
export function catalogueCursorFilter(cursor: string | null): Record<string, unknown> {
  if (!cursor || !/^[a-f0-9]{24}$/i.test(cursor)) return {};
  return { _id: { $gt: cursor } };
}
