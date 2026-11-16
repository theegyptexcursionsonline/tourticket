/**
 * #2591 — /aswan-tours (a category page) shipped 5.7 MB of HTML: every trip
 * went to the browser as the full database record (itinerary, FAQs, booking
 * policy text, every language's translations) with its destination and
 * categories fully populated (travel tips, FAQs, every language again).
 *
 * These tests run the real category renderer against an in-memory model that
 * honours `.select()` / populate `select`, then (1) hold the page data to the
 * visitor's language and the card + booking-sidebar contract under a size
 * budget, and (2) check the projection keeps every query scoped to the site.
 * category-page-cards.test.tsx renders the client page from the same payload.
 */
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { PUBLIC_CONTENT_FILTER } from '@/lib/content/publicContentFilter';

type Doc = Record<string, unknown>;
type QueryCall = { model: string; filter: Doc; select?: string; populate: Array<{ path: string; select?: string; match?: Doc }> };

const LOCALES = ['en', 'ar', 'de', 'fr', 'es'];
const longText = (label: string, words = 400) => Array.from({ length: words }, (_, i) => `${label}${i}`).join(' ');
const translationsFor = (fields: Doc) =>
  Object.fromEntries(
    LOCALES.filter((locale) => locale !== 'en').map((locale) => [
      locale,
      Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, `${locale}:${value}`])),
    ]),
  );

const destinationDoc = {
  _id: 'dest-aswan',
  name: 'Aswan',
  slug: 'aswan',
  image: '/aswan.jpg',
  urlType: 'direct',
  parentPage: null,
  country: 'Egypt',
  description: 'Southern gateway',
  longDescription: longText('destination-long'),
  travelTips: Array.from({ length: 12 }, (_, i) => ({ title: `tip ${i}`, content: longText('tip', 60) })),
  faqs: Array.from({ length: 12 }, (_, i) => ({ question: `q ${i}`, answer: longText('answer', 60) })),
  translations: {
    ...translationsFor({ description: 'Southern gateway', longDescription: longText('dest-tr') }),
    ar: { name: 'أسوان', description: 'بوابة الجنوب', longDescription: longText('dest-ar') },
  },
};

const categoryRefDoc = (id: string, name: string) => ({
  _id: id,
  name,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  icon: 'compass',
  urlType: 'direct',
  parentPage: null,
  description: longText(`${id}-description`),
  faqs: Array.from({ length: 8 }, (_, i) => ({ question: `cq ${i}`, answer: longText('canswer', 40) })),
  translations: { ...translationsFor({ description: longText(`${id}-tr`) }), ar: { name: `ar-${name}` } },
});

const tourDoc = (n: number, overrides: Doc = {}) => ({
  _id: `tour-${n}`,
  tenantId: 'default',
  isPublished: true,
  title: `Aswan trip ${n}`,
  description: `Short card copy ${n}`,
  longDescription: longText(`long-${n}`),
  slug: `aswan-trip-${n}`,
  urlType: 'direct',
  parentPage: null,
  image: `/trip-${n}.jpg`,
  images: Array.from({ length: 15 }, (_, i) => `/gallery-${n}-${i}.jpg`),
  price: 100 + n,
  discountPrice: 80 + n,
  originalPrice: 120 + n,
  discountPercent: 0,
  pricingSummary: { fromPrice: 75 + n, currency: 'USD' },
  duration: `${n + 4} hours`,
  rating: 4.5,
  reviews: 3,
  bookings: 10 * n,
  isFeatured: n === 1,
  location: 'Aswan',
  highlights: [`Highlight ${n}`],
  includes: ['Guide'],
  whatsIncluded: ['Water'],
  whatsNotIncluded: ['Tips'],
  tags: ['nile'],
  bookingOptions: [{ id: `opt-${n}`, label: 'Private', price: 80 + n }],
  addOns: [{ name: 'Lunch', price: 10 }],
  availability: { type: 'daily', availableDays: [0, 1, 2, 3, 4, 5, 6], slots: [{ time: '08:00', capacity: 10 }] },
  bookingCutoffMinutes: 120,
  maxGroupSize: 12,
  languages: ['English'],
  meetingPoint: 'Hotel lobby',
  operatedBy: 'EEO',
  revenueGuestPrices: { adult: 80 + n, child: 40, infant: 0 },
  itinerary: Array.from({ length: 10 }, (_, i) => ({ day: i, title: `stop ${i}`, description: longText('stop', 50) })),
  faq: Array.from({ length: 10 }, (_, i) => ({ question: `tq ${i}`, answer: longText('tanswer', 50) })),
  needToKnow: longText('need'),
  pricingSearchProjection: { anything: longText('projection', 80) },
  metaTitle: `Meta ${n}`,
  metaDescription: `Meta description ${n}`,
  destination: destinationDoc,
  category: [categoryRefDoc('cat-aswan', 'Aswan Tours'), categoryRefDoc('cat-nile', 'Nile Trips'), categoryRefDoc('cat-day', 'Day Trips')],
  translations: {
    ...translationsFor({ description: `card ${n}`, longDescription: longText(`tr-${n}`) }),
    ar: { title: `رحلة أسوان ${n}`, description: `وصف ${n}`, duration: `${n + 4} ساعات` },
  },
  ...overrides,
});

const categoryDoc = {
  _id: 'cat-aswan',
  tenantId: 'default',
  name: 'Aswan Tours',
  slug: 'aswan-tours',
  urlType: 'direct',
  parentPage: null,
  pageTemplate: 'immersive',
  description: 'Aswan category',
  longDescription: 'Long Aswan category',
  heroImage: '/hero.jpg',
  images: [],
  highlights: ['Philae'],
  features: ['Families'],
  faqs: [{ question: 'Is it hot?', answer: 'In summer.' }],
  translations: translationsFor({ name: 'Aswan Tours', description: longText('cat-tr') }),
};

const TOURS = [tourDoc(1), tourDoc(2), tourDoc(3)];
const calls: QueryCall[] = [];

const project = (doc: Doc, select?: string): Doc => {
  if (!select) return doc;
  const keep = new Set(['_id', ...select.split(/\s+/).filter(Boolean)]);
  return Object.fromEntries(Object.entries(doc).filter(([key]) => keep.has(key)));
};

const makeQuery = (model: string, filter: Doc, docs: () => Doc[]) => {
  const call: QueryCall = { model, filter, populate: [] };
  calls.push(call);
  const query = {
    select(fields: string) { call.select = fields; return query; },
    populate(options: { path: string; select?: string; match?: Doc }) { call.populate.push(options); return query; },
    sort() { return query; },
    limit() { return query; },
    lean() {
      return Promise.resolve(
        docs().map((doc) => {
          const projected = { ...project(doc, call.select) };
          for (const { path: field, select } of call.populate) {
            const value = projected[field];
            if (Array.isArray(value)) projected[field] = value.map((item) => project(item as Doc, select));
            else if (value && typeof value === 'object') projected[field] = project(value as Doc, select);
          }
          return projected;
        }),
      );
    },
  };
  return query;
};

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn(() => Promise.resolve()) }));
jest.mock('@/lib/models/Tour', () => ({
  __esModule: true,
  default: {
    find: jest.fn((filter: Doc) => makeQuery('Tour', filter, () => TOURS)),
    aggregate: jest.fn(() => Promise.resolve([])),
  },
}));
jest.mock('@/lib/models/Category', () => ({
  __esModule: true,
  default: {
    find: jest.fn((filter: Doc) =>
      makeQuery('Category', filter, () => (filter.slug === 'aswan-tours' ? [categoryDoc] : []))),
  },
}));
jest.mock('@/lib/models/Destination', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/attractionPages/pageContent', () => ({
  resolveLinkedPageCards: jest.fn(() => Promise.resolve([])),
}));
jest.mock('@/app/[locale]/categories/[slug]/CategoryPageClient', () => ({
  __esModule: true,
  default: function CategoryPageClientStub() { return null; },
}));
jest.mock('@/components/schema/CollectionSchema', () => ({
  __esModule: true,
  default: function CollectionSchemaStub() { return null; },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { renderCategoryDetail } = require('@/app/[locale]/categories/[slug]/CategoryDetailContent') as typeof import('@/app/[locale]/categories/[slug]/CategoryDetailContent');

type ClientProps = { category: Doc; categoryTours: Doc[]; contextualLinks: Array<{ label: string; href: string }> };
type SchemaProps = { items: Array<{ name: string; url: string; image?: string }> };

async function renderedProps(locale: string) {
  calls.length = 0;
  const element = await renderCategoryDetail('aswan-tours', locale);
  if (!element) throw new Error('category did not render');
  const [schema, client] = React.Children.toArray((element.props as { children: React.ReactNode }).children) as React.ReactElement[];
  return { client: client.props as ClientProps, schema: schema.props as SchemaProps };
}

const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value), 'utf8');

describe('category page data stays lean (#2591)', () => {
  it('sends only the card and booking fields, in the visitor language, under a size budget', async () => {
    const { client, schema } = await renderedProps('ar');
    const serialized = JSON.stringify(client);

    // The fixture's full records weigh ~0.5 MB; the page needs a few KB of them.
    expect(bytes(TOURS)).toBeGreaterThan(300_000);
    expect(bytes(client.categoryTours)).toBeLessThan(8_000);
    // The category keeps its own Arabic copy (~3.5 KB in the fixture), not four more languages.
    expect(bytes(client.category)).toBeLessThan(6_000);

    for (const leaked of ['"translations"', '"itinerary"', '"faq"', '"travelTips"', '"longDescription":"long-', '"needToKnow"', '"pricingSearchProjection"', '"images":["/gallery']) {
      expect(serialized).not.toContain(leaked);
    }
    // No other language rides along with the Arabic page.
    expect(serialized).not.toMatch(/"(de|fr|es):/);

    // Same trips, same order, Arabic copy, schema items unchanged in shape.
    expect(client.categoryTours.map((tour) => tour.slug)).toEqual(['aswan-trip-1', 'aswan-trip-2', 'aswan-trip-3']);
    expect(client.categoryTours[0]).toMatchObject({ title: 'رحلة أسوان 1', description: 'وصف 1', duration: '5 ساعات' });
    expect(schema.items).toEqual([
      { name: 'رحلة أسوان 1', url: '/aswan-trip-1', image: '/trip-1.jpg' },
      { name: 'رحلة أسوان 2', url: '/aswan-trip-2', image: '/trip-2.jpg' },
      { name: 'رحلة أسوان 3', url: '/aswan-trip-3', image: '/trip-3.jpg' },
    ]);
    expect(client.contextualLinks[0]).toEqual({ label: 'أسوان', href: '/ar/aswan' });
  });

  it('keeps everything the cards, popular destinations and booking sidebar read', async () => {
    const { client } = await renderedProps('en');
    const tour = client.categoryTours[1];

    expect(tour).toMatchObject({
      _id: 'tour-2',
      title: 'Aswan trip 2',
      description: 'Short card copy 2',
      slug: 'aswan-trip-2',
      urlType: 'direct',
      image: '/trip-2.jpg',
      price: 102,
      discountPrice: 82,
      originalPrice: 122,
      discountPercent: 0,
      pricingSummary: { fromPrice: 77, currency: 'USD' },
      duration: '6 hours',
      rating: 4.5,
      reviews: 3,
      bookings: 20,
      highlights: ['Highlight 2'],
      includes: ['Guide'],
      whatsIncluded: ['Water'],
      tags: ['nile'],
      bookingOptions: [{ id: 'opt-2', label: 'Private', price: 82 }],
      addOns: [{ name: 'Lunch', price: 10 }],
      availability: TOURS[1].availability,
      bookingCutoffMinutes: 120,
      maxGroupSize: 12,
      languages: ['English'],
      meetingPoint: 'Hotel lobby',
      operatedBy: 'EEO',
      revenueGuestPrices: { adult: 82, child: 40, infant: 0 },
      destination: { _id: 'dest-aswan', name: 'Aswan', slug: 'aswan', image: '/aswan.jpg', urlType: 'direct', parentPage: null },
    });
    expect(tour.category).toEqual([
      { _id: 'cat-aswan', name: 'Aswan Tours', slug: 'aswan-tours', icon: 'compass', urlType: 'direct', parentPage: null },
      { _id: 'cat-nile', name: 'Nile Trips', slug: 'nile-trips', icon: 'compass', urlType: 'direct', parentPage: null },
      { _id: 'cat-day', name: 'Day Trips', slug: 'day-trips', icon: 'compass', urlType: 'direct', parentPage: null },
    ]);
    // The category itself keeps what the page renders.
    expect(client.category).toMatchObject({ name: 'Aswan Tours', heroImage: '/hero.jpg', pageTemplate: 'immersive', faqs: categoryDoc.faqs });
  });

  it('projects in the database and keeps every query scoped to the site', async () => {
    await renderedProps('en');
    const tourQuery = calls.find((call) => call.model === 'Tour');
    expect(tourQuery?.filter).toMatchObject({ category: { $in: ['cat-aswan'] }, ...DEFAULT_TENANT_FILTER, ...PUBLIC_CONTENT_FILTER });
    expect(tourQuery?.select).toBeDefined();
    expect(tourQuery?.select).not.toMatch(/\b(itinerary|faq|images|needToKnow|pricingSearchProjection)\b/);
    for (const populate of tourQuery?.populate || []) {
      expect(populate.select).toBeDefined();
      expect(populate.select).not.toMatch(/\b(travelTips|faqs|longDescription)\b/);
      expect(populate.match).toEqual({ ...DEFAULT_TENANT_FILTER, ...PUBLIC_CONTENT_FILTER });
    }
  });
});

describe('site menu data ships without every-language translations (#2591)', () => {
  it('strips translations from the localized nav records in the locale layout', () => {
    const layout = fs.readFileSync(path.join(process.cwd(), 'app/[locale]/layout.tsx'), 'utf8');
    const navBlock = layout.slice(layout.indexOf('const result: NavCache'), layout.indexOf('_navDataCache = {'));
    expect(navBlock.match(/withoutTranslations\(/g)).toHaveLength(2);
  });

  it('withoutTranslations drops only the translations map', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { withoutTranslations } = require('@/lib/content/storefrontTourPayload') as typeof import('@/lib/content/storefrontTourPayload');
    expect(withoutTranslations({ name: 'أسوان', slug: 'aswan', translations: { de: { name: 'Assuan' } } })).toEqual({ name: 'أسوان', slug: 'aswan' });
  });
});
