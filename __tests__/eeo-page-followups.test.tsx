/**
 * EEO page follow-ups (16 Nov): destination Top 10 at 768 px, destination trips
 * first on phones, Arabic section headings on destination and category pages,
 * and the older attraction/catalogue templates' phone heroes.
 *
 * jsdom has no layout, so the width cases are asserted on the classes that
 * decide the layout at each breakpoint (Tailwind: md = 768 px, lg = 1024 px)
 * on the real rendered page; the live width sweep is the browser proof.
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';

let mockLocale = 'en';

jest.mock('@/components/Header', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/Footer', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/BookingSidebar', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/RelatedInterests', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/HostedAISearchEntry', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/seo/ContextualDiscoveryLinks', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/content/LinkedPageCardsSection', () => ({ __esModule: true, default: () => null }));
jest.mock('instantsearch.css/themes/satellite.css', () => ({}), { virtual: true });
jest.mock('algoliasearch/lite', () => ({ liteClient: () => ({}) }));
jest.mock('react-instantsearch', () => ({
  InstantSearch: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Index: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Configure: () => null,
  useSearchBox: () => ({ refine: jest.fn() }),
  useHits: () => ({ hits: [] }),
}));
jest.mock('@ai-sdk/react', () => ({ useChat: () => ({ messages: [], sendMessage: jest.fn(), status: 'ready', setMessages: jest.fn(), stop: jest.fn() }) }));
jest.mock('ai', () => ({ DefaultChatTransport: function DefaultChatTransport() {} }));
jest.mock('react-markdown', () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
jest.mock('remark-gfm', () => ({ __esModule: true, default: () => null }));
jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({ formatPrice: (value: number) => `$${value.toFixed(2)}` }),
}));
jest.mock('next-intl', () => {
  const messages: Record<string, unknown> = {
    en: jest.requireActual('../messages/en.json'),
    ar: jest.requireActual('../messages/ar.json'),
  };
  const lookup = (key: string) =>
    key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], messages[mockLocale]) ?? key;
  return { useLocale: () => mockLocale, useTranslations: () => lookup };
});
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));
jest.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const DestinationPageClient = require('@/app/[locale]/destinations/[slug]/DestinationPageClient').default as React.ComponentType<Record<string, unknown>>;
const CategoryPageClient = require('@/app/[locale]/categories/[slug]/CategoryPageClient').default as React.ComponentType<Record<string, unknown>>;
/* eslint-enable @typescript-eslint/no-require-imports */

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const ARABIC = /[؀-ۿ]/;
const classesOf = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);

const tour = (n: number) => ({
  _id: `tour-${n}`,
  title: `Luxor trip number ${n} with a long name that has to wrap`,
  slug: `luxor-trip-${n}`,
  urlType: 'direct',
  image: `/trip-${n}.jpg`,
  discountPrice: 60 + n,
  originalPrice: 90 + n,
  duration: '8 hours',
  rating: 4.5,
  bookings: n,
  isFeatured: n <= 2,
  destination: { _id: 'dest-luxor', name: 'Luxor', slug: 'luxor' },
  category: { _id: 'cat-1', name: 'Day trips', slug: 'day-trips' },
});

const destination = {
  _id: 'dest-luxor',
  name: 'Luxor',
  slug: 'luxor',
  description: 'Temples and tombs',
  image: '/luxor.jpg',
  images: ['/luxor.jpg', '/luxor-2.jpg', '/luxor-3.jpg'],
  climate: 'Desert',
  region: 'Upper Egypt',
  averageTemperature: { summer: '40C', winter: '22C' },
  thingsToDo: ['Karnak'],
  localCustoms: ['Dress modestly'],
  weatherWarnings: ['Hot afternoons'],
};

const renderDestination = (locale: string, tours = [1, 2, 3, 4, 5].map(tour), extra: Record<string, unknown> = {}) => {
  mockLocale = locale;
  return render(
    <DestinationPageClient
      destination={{ ...destination, ...extra }}
      destinationTours={tours}
      allCategories={[{ _id: 'cat-1', name: 'Day trips', slug: 'day-trips' }]}
    />,
  );
};

afterEach(() => {
  mockLocale = 'en';
});

describe('destination Top 10 at tablet width (768 px)', () => {
  it('uses one column below lg, so a row card is never squeezed into a half-width track at 768', () => {
    const { container } = renderDestination('en');
    const grid = container.querySelector('[data-top-tours-grid]');
    expect(grid).not.toBeNull();
    const cls = classesOf(grid);
    expect(cls).toContain('grid-cols-1');
    expect(cls).toContain('lg:grid-cols-2');
    // No breakpoint at or below 768 px may split the list into columns.
    expect(cls.filter((c) => /^(sm|md):grid-cols-/.test(c))).toEqual([]);
  });

  it('lets each card, its text and its title shrink and wrap, and keeps the cart button whole', () => {
    const { container } = renderDestination('en');
    const cards = container.querySelectorAll('[data-top-tours-grid] > a');
    expect(cards.length).toBeGreaterThan(0);
    for (const card of Array.from(cards)) {
      expect(classesOf(card)).toContain('min-w-0');
      const text = card.querySelector('h3')?.parentElement ?? null;
      expect(classesOf(text)).toContain('min-w-0');
      expect(classesOf(card.querySelector('h3'))).toContain('[overflow-wrap:anywhere]');
      const actions = card.querySelector('button')?.parentElement ?? null;
      expect(classesOf(actions)).toContain('flex-shrink-0');
      // Logical margin, so the button sits at the row end in Arabic too.
      expect(classesOf(actions)).toContain('ms-auto');
    }
  });
});

describe('destination trips follow the hero on phones', () => {
  it('orders hero then Best deals first below lg and keeps the authored order from lg', () => {
    const { container } = renderDestination('en');
    const main = container.querySelector('main');
    expect(classesOf(main)).toEqual(expect.arrayContaining(['flex', 'flex-col', 'lg:block']));
    const hero = container.querySelector('[data-destination-hero]')!.parentElement;
    const deals = container.querySelector('[data-destination-best-deals]');
    const top = container.querySelector('[data-destination-top-tours]');
    for (const el of [hero, deals]) expect(classesOf(el)).toEqual(expect.arrayContaining(['order-first', 'lg:order-none']));
    // Only one trip list moves up; Top 10 stays in place when there are deals.
    expect(classesOf(top)).not.toContain('order-first');
    // Source order breaks the order tie: the hero is still first.
    expect(hero!.compareDocumentPosition(deals!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('moves the Top 10 up instead when a destination has no deals', () => {
    // No featured trip and no curated ids: curation returns no Best deals.
    const noDeals = [1, 2, 3].map((n) => ({ ...tour(n), isFeatured: false }));
    const { container } = renderDestination('en', noDeals);
    expect(container.querySelector('[data-destination-best-deals]')).toBeNull();
    expect(classesOf(container.querySelector('[data-destination-top-tours]'))).toEqual(expect.arrayContaining(['order-first', 'lg:order-none']));
  });
});

describe('Arabic section headings', () => {
  it('destination gallery and practical information read in Arabic, with no English chrome left', () => {
    const { container } = renderDestination('ar');
    expect(screen.getByText('معرض صور الوجهة')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'شاهد Luxor' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'معلومات عملية' })).toBeInTheDocument();
    for (const label of ['المنطقة', 'المناخ', 'متوسط درجات الحرارة', 'أنشطة يمكنك القيام بها', 'العادات المحلية', 'ملاحظات عن الطقس']) {
      expect(screen.getByRole('heading', { level: 3, name: label })).toBeInTheDocument();
    }
    expect(screen.getByText('الصيف: 40C · الشتاء: 22C')).toBeInTheDocument();
    const text = container.textContent ?? '';
    for (const english of ['Destination gallery', 'See Luxor', 'Plan with confidence', 'Practical information', 'Average temperature', 'Things to do', 'Local customs', 'Weather notes', 'Summer:']) {
      expect(text).not.toContain(english);
    }
  });

  it('English destination page keeps its English headings', () => {
    renderDestination('en');
    expect(screen.getByText('Destination gallery')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'See Luxor' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Practical information' })).toBeInTheDocument();
  });

  it('category gallery and travel tips headings read in Arabic', () => {
    mockLocale = 'ar';
    const category = {
      _id: 'cat-aswan', name: 'جولات أسوان', slug: 'aswan-tours', description: 'أسوان', heroImage: '/hero.jpg',
      images: ['/a.jpg', '/b.jpg'], travelTips: [{ title: 'نصيحة', content: 'محتوى' }],
    };
    const { container } = render(<CategoryPageClient category={category} categoryTours={[]} />);
    expect(screen.getByRole('heading', { level: 2, name: 'معرض صور التجربة' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'نصائح السفر' })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Experience gallery|Travel tips/);
  });

  it('every new Arabic label is Arabic text and differs from the English one', () => {
    const source = read('app/[locale]/destinations/[slug]/DestinationPageClient.tsx');
    const block = (lang: 'en' | 'ar') => {
      const start = source.indexOf(`  ${lang}: {`, source.indexOf('const destinationPageCopy'));
      return source.slice(start, source.indexOf('\n  },', start));
    };
    const keys = ['galleryEyebrow', 'galleryTitle', 'practicalEyebrow', 'practicalTitle', 'practicalRegion', 'practicalClimate',
      'practicalAverageTemperature', 'practicalSummer', 'practicalWinter', 'practicalLanguages', 'practicalGettingThere',
      'practicalGettingAround', 'practicalVisa', 'practicalEmergency', 'practicalLocation', 'practicalThingsToDo',
      'practicalLocalCustoms', 'practicalWeatherNotes'];
    for (const key of keys) {
      const line = (lang: 'en' | 'ar') => block(lang).split('\n').find((row) => row.trim().startsWith(`${key}:`)) ?? '';
      expect(line('ar')).toMatch(ARABIC);
      expect(line('en')).not.toMatch(ARABIC);
      expect(line('en')).not.toEqual('');
    }
  });
});

describe('older attraction and catalogue templates on phones', () => {
  const landing = read('components/AttractionLandingPage.tsx');
  const catalogue = read('components/AttractionPageTemplate.tsx');
  const mapBody = (source: string, name: string) => source.slice(source.indexOf(`const ${name}`), source.indexOf('};', source.indexOf(`const ${name}`)));
  const classesFor = (body: string, template: string) => {
    const line = body.split('\n').find((row) => row.trim().startsWith(`${template}:`)) ?? '';
    return line.slice(line.indexOf("'") + 1, line.lastIndexOf("'")).split(/\s+/).filter(Boolean);
  };
  const FULL_HEIGHT = /^(min-h-\[|h-\[|h-screen)/;

  it('the catalogue hero has a screen-height picture only from lg, and clears the header on phones', () => {
    const heights = mapBody(catalogue, 'CATALOGUE_HERO_HEIGHT');
    for (const template of ['immersive', 'editorial', 'classic']) {
      const cls = classesFor(heights, template);
      expect(cls.length).toBeGreaterThan(0);
      for (const c of cls) expect(c.startsWith('lg:')).toBe(true);
    }
    // Large screens are unchanged.
    expect(heights).toContain("immersive: 'lg:h-[84vh]'");
    expect(heights).toContain("editorial: 'lg:h-[58vh] lg:min-h-[520px]'");
    expect(heights).toContain("classic: 'lg:h-[70vh]'");
    expect(catalogue).toContain("const CATALOGUE_HERO_CONTENT_SPACING = 'pt-24 pb-10 sm:pt-28 sm:pb-12 lg:py-0';");
    expect(catalogue).toContain('<section data-catalogue-hero className={`relative overflow-hidden ${CATALOGUE_HERO_HEIGHT[pageTemplate]}`}>');
    expect(catalogue).toContain("'items-center lg:items-end'");
    expect(catalogue).not.toMatch(/'h-\[84vh\]'|'h-\[70vh\]'|'h-\[58vh\] min-h-\[520px\]'/);
  });

  it('the attraction hero has its tall picture only from lg and no bottom-pinned copy on phones', () => {
    const heights = mapBody(landing, 'ATTRACTION_HERO_HEIGHT');
    const content = mapBody(landing, 'ATTRACTION_HERO_CONTENT');
    for (const template of ['immersive', 'editorial', 'classic']) {
      for (const c of classesFor(heights, template)) expect(c.startsWith('lg:')).toBe(true);
      const phone = classesFor(content, template).filter((c) => !/^(sm|md|lg|xl):/.test(c));
      expect(phone.filter((c) => FULL_HEIGHT.test(c) || c === 'items-end')).toEqual([]);
    }
    // The fixed header (64 px on a phone) covers the top of the hero: the copy
    // must start below it on every template, or the breadcrumb hides under it.
    for (const template of ['immersive', 'editorial', 'classic']) {
      expect(classesFor(content, template)).toEqual(expect.arrayContaining(['pt-24', 'sm:pt-28']));
    }
    expect(classesFor(content, 'immersive')).toEqual(expect.arrayContaining(['lg:min-h-[76vh]', 'lg:items-end', 'lg:py-24']));
    expect(classesFor(content, 'editorial')).toEqual(expect.arrayContaining(['lg:min-h-[560px]', 'lg:py-20']));
    expect(landing).toContain('<section data-attraction-hero className={`relative overflow-hidden bg-slate-900 ${ATTRACTION_HERO_HEIGHT[pageTemplate]}`}>');
  });

  it('interest loading bars fit a 390 px phone (they pushed the attraction page 18 px wide)', () => {
    for (const file of ['components/PopularInterestsGrid.tsx', 'components/RelatedInterests.tsx']) {
      const source = read(file);
      expect(source).toContain('h-6 w-full max-w-96 bg-slate-200');
      expect(source).not.toMatch(/h-6 w-96 bg-slate-200/);
    }
  });
});
