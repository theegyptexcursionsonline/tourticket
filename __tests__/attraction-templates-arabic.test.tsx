/**
 * The older attraction (AttractionLandingPage) and catalogue
 * (AttractionPageTemplate) templates printed their own labels in English on
 * every language. Render both in Arabic and English and check the template's
 * text, breadcrumb and RTL details; record text (titles, tips) stays as given.
 */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { ATTRACTION_TEMPLATE_COPY } from '@/lib/content/attractionTemplateCopy';

let mockLocale = 'en';

jest.mock('@/components/RelatedInterests', () => ({
  __esModule: true,
  default: ({ title, subtitle }: { title: string; subtitle: string }) => <section><h2>{title}</h2><p>{subtitle}</p></section>,
}));
jest.mock('@/components/PopularInterestsGrid', () => ({
  __esModule: true,
  default: ({ title, subtitle }: { title: string; subtitle: string }) => <section><h2>{title}</h2><p>{subtitle}</p></section>,
}));
jest.mock('@/components/shared/TourCard', () => ({ __esModule: true, default: ({ tour }: { tour: { title: string } }) => <article>{tour.title}</article> }));
jest.mock('@/components/content/LinkedPageCardsSection', () => ({
  __esModule: true,
  default: ({ subtitle }: { subtitle?: string }) => <p data-testid="linked-subtitle">{subtitle}</p>,
}));
jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({ formatPrice: (value: number) => `$${value.toFixed(2)}` }),
}));
jest.mock('next-intl', () => {
  const messages: Record<string, unknown> = {
    en: jest.requireActual('../messages/en.json'),
    ar: jest.requireActual('../messages/ar.json'),
    de: jest.requireActual('../messages/de.json'),
    fr: jest.requireActual('../messages/fr.json'),
    es: jest.requireActual('../messages/es.json'),
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
const AttractionLandingPage = require('@/components/AttractionLandingPage').default as React.ComponentType<Record<string, unknown>>;
const AttractionPageTemplate = require('@/components/AttractionPageTemplate').default as React.ComponentType<Record<string, unknown>>;
/* eslint-enable @typescript-eslint/no-require-imports */

const tour = (n: number, extra: Record<string, unknown> = {}) => ({
  _id: `t${n}`, title: `Karnak trip ${n}`, slug: `karnak-trip-${n}`, urlType: 'direct', image: `/t${n}.jpg`,
  description: 'Temple visit', discountPrice: 50 + n, duration: '6 hours', rating: 4.6, reviewCount: 3, isFeatured: n === 1,
  ...extra,
});
const review = (n: number) => ({ _id: `r${n}`, userName: '', rating: 5, comment: 'Great', createdAt: '2026-05-01T10:00:00Z' });

const attraction = {
  _id: 'a1', title: 'معبد الكرنك', slug: 'karnak-temple', description: 'وصف قصير', longDescription: 'وصف قصير وطويل جدًا',
  heroImage: '/hero.jpg', images: ['/g1.jpg'], highlights: ['ممر الكباش'], features: ['قاعة الأعمدة'],
  faqs: [{ question: 'سؤال؟', answer: 'جواب' }], travelTips: [{ title: 'نصيحة', content: 'محتوى' }],
  tours: [tour(1), tour(2)], totalTours: 2, reviews: Array.from({ length: 7 }, (_, i) => review(i)),
  gridTitle: '', showStats: true, isPublished: true, featured: false, pageTemplate: 'immersive',
};
const cataloguePage = {
  _id: 'c1', title: 'رحلات اليوم من الغردقة', slug: 'day-trips-from-hurghada', description: 'وصف', heroImage: '/hero.jpg',
  images: ['/g1.jpg'], highlights: ['ميزة'], features: ['خاصية'], tours: [tour(1), tour(2, { maxGroupSize: 12 })],
  reviews: Array.from({ length: 7 }, (_, i) => review(i)), gridTitle: 'الرحلات', showStats: true, pageTemplate: 'immersive',
};

const ENGLISH_CHROME = [
  'Popular attraction', 'Gallery', 'What to Expect', 'What makes this special', 'Available activities', 'Travel tips',
  'Frequently asked questions', 'Similar attractions', 'Top experiences', 'Ready to explore', 'View all activities',
  'Contact us', 'Reviews from travelers', 'Show all', 'Anonymous', 'activities', 'reviews', 'results', 'Home',
  'Attractions', 'Read more', 'Most popular',
];
const ENGLISH_CATALOGUE = [
  'Why Choose This Experience', 'What Makes This Special', 'Gallery', 'Showing', 'Featured', 'What Our Customers Say',
  'View All', 'Why Thousands Choose Us', 'Tours Available', 'Ready to Start Your Adventure?', 'Browse All Tours',
  'Get Expert Advice', 'Related guides and collections', 'Home', 'Categories', 'Featured First', 'Max ',
];

afterEach(() => { mockLocale = 'en'; });

describe('older attraction template in Arabic', () => {
  it('prints the template text in Arabic, with the Arabic breadcrumb', () => {
    mockLocale = 'ar';
    const { container } = render(<AttractionLandingPage attraction={attraction} />);
    const ar = ATTRACTION_TEMPLATE_COPY.ar;
    for (const heading of [ar.gallery, ar.whatMakesThisSpecial, ar.availableActivities, ar.travelTips, ar.faqTitle,
      ar.reviewsTitle, ar.similarAttractions, ar.topExperiences, ar.readyToExplore('معبد الكرنك')]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText(ar.popularAttraction)).toBeInTheDocument();
    expect(screen.getByText('نشاطان')).toBeInTheDocument();
    expect(screen.getByText('(7 تقييمات)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'الرئيسية' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(ar.searchActivities)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: ar.sortMostPopular })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ar.gridView })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: `${ar.showAllReviews(7)}` })).toBeInTheDocument();
    const text = container.textContent ?? '';
    for (const english of ENGLISH_CHROME) expect(text).not.toContain(english);
    // Record text is untouched.
    expect(screen.getByRole('heading', { level: 1, name: 'معبد الكرنك' })).toBeInTheDocument();
  });

  it('keeps the English page as it was', () => {
    render(<AttractionLandingPage attraction={{ ...attraction, title: 'Karnak Temple Complex' }} />);
    const en = ATTRACTION_TEMPLATE_COPY.en;
    expect(screen.getByText('Popular attraction')).toBeInTheDocument();
    expect(screen.getByText('2 activities')).toBeInTheDocument();
    expect(screen.getByText('(7 reviews)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ready to explore Karnak Temple Complex?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: en.availableActivities })).toBeInTheDocument();
    expect(screen.getByText('2 results')).toBeInTheDocument();
  });
});

describe('older catalogue template in Arabic', () => {
  it('prints the template text in Arabic, with the Arabic breadcrumb', () => {
    mockLocale = 'ar';
    const { container } = render(<AttractionPageTemplate page={cataloguePage} urlType="category" />);
    const ar = ATTRACTION_TEMPLATE_COPY.ar;
    for (const heading of [ar.whyChooseThisExperience, ar.whatMakesThisSpecialTitle, ar.gallery, ar.customersSay, ar.readyToStart]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText(ar.showingOf(2, 2))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'الرئيسية' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'الفئات' })).toBeInTheDocument();
    expect(screen.getByTestId('linked-subtitle')).toHaveTextContent(ar.relatedGuides);
    expect(screen.getByText(ar.whyThousandsChooseUs)).toBeInTheDocument();
    expect(screen.getAllByText(ar.featured).length).toBeGreaterThan(0);
    const text = container.textContent ?? '';
    for (const english of ENGLISH_CATALOGUE) expect(text).not.toContain(english);
  });

  it('shows a group size only when the trip sets one, and has no button that does nothing', () => {
    render(<AttractionPageTemplate page={{ ...cataloguePage, title: 'Day Trips' }} urlType="category" />);
    const cards = screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.startsWith('/karnak-trip-'));
    expect(within(cards[0]).queryByText(/^Max /)).toBeNull();
    expect(within(cards[1]).getByText('Max 12')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /filters/i })).toBeNull();
    // The list view still switches.
    fireEvent.click(screen.getByRole('button', { name: 'List view' }));
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Categories' })).toBeInTheDocument();
  });
});

describe('older templates in German, French and Spanish (17 Nov)', () => {
  it.each(['de', 'fr', 'es'] as const)('%s attraction page prints its own template text and breadcrumb', (locale) => {
    mockLocale = locale;
    const copy = ATTRACTION_TEMPLATE_COPY[locale];
    const { container } = render(<AttractionLandingPage attraction={{ ...attraction, title: 'Karnak' }} />);
    for (const heading of [copy.gallery, copy.whatMakesThisSpecial, copy.availableActivities, copy.travelTips, copy.faqTitle, copy.similarAttractions, copy.topExperiences]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText(copy.popularAttraction)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(copy.searchActivities)).toBeInTheDocument();
    const home = (jest.requireActual(`../messages/${locale}.json`) as { tourPage: { home: string } }).tourPage.home;
    expect(screen.getByRole('link', { name: home })).toBeInTheDocument();
    for (const english of ['Popular attraction', 'What makes this special', 'Available activities', 'Similar attractions', 'Top experiences', 'Most popular']) {
      expect(container.textContent).not.toContain(english);
    }
  });

  it.each(['de', 'fr', 'es'] as const)('%s catalogue page prints its own template text', (locale) => {
    mockLocale = locale;
    const copy = ATTRACTION_TEMPLATE_COPY[locale];
    const { container } = render(<AttractionPageTemplate page={{ ...cataloguePage, title: 'Day Trips' }} urlType="category" />);
    for (const heading of [copy.whyChooseThisExperience, copy.whatMakesThisSpecialTitle, copy.gallery, copy.customersSay, copy.readyToStart]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText(copy.showingOf(2, 2))).toBeInTheDocument();
    for (const english of ['Why Choose This Experience', 'What Our Customers Say', 'Ready to Start Your Adventure?', 'Browse All Tours']) {
      expect(container.textContent).not.toContain(english);
    }
  });

  it('every language table has the same keys and no empty text', () => {
    const keys = Object.keys(ATTRACTION_TEMPLATE_COPY.en).sort();
    for (const locale of ['ar', 'de', 'fr', 'es'] as const) {
      expect(Object.keys(ATTRACTION_TEMPLATE_COPY[locale]).sort()).toEqual(keys);
      for (const [key, value] of Object.entries(ATTRACTION_TEMPLATE_COPY[locale])) {
        const text = typeof value === 'function' ? (value as (...a: unknown[]) => string)(3, 9) : String(value);
        expect(`${key}:${text}`.trim().length).toBeGreaterThan(key.length + 1);
      }
    }
  });
});

describe('Karnak rating (17 Nov): a score only when reviews back it', () => {
  it('no page reviews and trips rated 4.5 with no reviews: the hero shows no score', () => {
    const unreviewed = { ...attraction, title: 'Karnak', reviews: [], tours: [tour(1, { rating: 4.5, reviewCount: 0 }), tour(2, { rating: 4.5, reviewCount: 0 })] };
    const { container } = render(<AttractionLandingPage attraction={unreviewed} />);
    const hero = container.querySelector('[data-attraction-hero]')!;
    expect(hero.textContent).not.toMatch(/4[.,]5/);
    expect(hero.textContent).toContain('2 activities');
  });

  it('trips with real reviews give a hero score from those trips only', () => {
    const mixed = { ...attraction, title: 'Karnak', reviews: [], tours: [tour(1, { rating: 4.5, reviewCount: 0 }), tour(2, { rating: 4.8, reviewCount: 6 })] };
    const { container } = render(<AttractionLandingPage attraction={mixed} />);
    expect(container.querySelector('[data-attraction-hero]')!.textContent).toContain('4.8');
  });

  it('catalogue cards and stats skip unreviewed ratings', () => {
    const page = { ...cataloguePage, title: 'Day Trips', reviews: [], tours: [tour(1, { rating: 4.5, reviewCount: 0 }), tour(2, { rating: 4.5, reviewCount: undefined })] };
    const { container } = render(<AttractionPageTemplate page={page} urlType="category" />);
    expect(container.textContent).not.toMatch(/4\.5/);
    expect(screen.queryByText('Average Rating')).toBeNull();
  });
});
