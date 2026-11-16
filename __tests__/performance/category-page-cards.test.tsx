/**
 * #2591 — the category page now receives lean trip records. Render the real
 * client page from records that went through the same database projection
 * (CATEGORY_TOUR_SELECT / populate selects) and payload mapper the server uses,
 * and check every trip card still shows its title, duration, rating, prices,
 * links and destination, and that the quick-book button gets the trip it
 * books.
 */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import {
  CATEGORY_TOUR_CATEGORY_SELECT,
  CATEGORY_TOUR_DESTINATION_SELECT,
  CATEGORY_TOUR_SELECT,
  toCategoryTourPayload,
} from '@/lib/content/storefrontTourPayload';

type Doc = Record<string, unknown>;
const sidebarTours: Doc[] = [];

jest.mock('@/components/Header', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/Footer', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/BookingSidebar', () => ({
  __esModule: true,
  default: ({ tour }: { tour: Doc }) => {
    sidebarTours.push(tour);
    return null;
  },
}));
jest.mock('@/components/RelatedInterests', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/seo/ContextualDiscoveryLinks', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/content/LinkedPageCardsSection', () => ({ __esModule: true, default: () => null }));
jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({ formatPrice: (value: number) => `$${value.toFixed(2)}` }),
}));
jest.mock('next-intl', () => ({ useLocale: () => 'en' }));
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CategoryPageClient = require('@/app/[locale]/categories/[slug]/CategoryPageClient').default as React.ComponentType<Record<string, unknown>>;

const project = (doc: Doc, select: string): Doc => {
  const keep = new Set(['_id', ...select.split(/\s+/).filter(Boolean)]);
  return Object.fromEntries(Object.entries(doc).filter(([key]) => keep.has(key)));
};

const destination = {
  _id: 'dest-aswan', name: 'Aswan', slug: 'aswan', image: '/aswan.jpg', urlType: 'direct', parentPage: null,
  travelTips: [{ title: 'tip' }], faqs: [{ question: 'q' }], translations: { de: { name: 'Assuan' } },
};
const category = { _id: 'cat-aswan', name: 'Aswan Tours', slug: 'aswan-tours', icon: 'compass', translations: { de: { name: 'Assuan' } } };

const fullTour = (n: number, extra: Doc = {}): Doc => ({
  _id: `tour-${n}`,
  title: `Aswan trip ${n}`,
  description: `Card copy ${n}`,
  slug: `aswan-trip-${n}`,
  urlType: n === 4 ? 'city' : 'direct',
  image: `/trip-${n}.jpg`,
  discountPrice: 80 + n,
  originalPrice: 120 + n,
  pricingSummary: { fromPrice: 75 + n },
  duration: `${n + 4} hours`,
  rating: 4 + n / 10,
  bookings: 10 * n,
  highlights: [`Highlight ${n}`],
  bookingOptions: [{ id: `opt-${n}`, price: 80 + n }],
  availability: { type: 'daily', availableDays: [1], slots: [{ time: '08:00', capacity: 5 }] },
  bookingCutoffMinutes: 90,
  itinerary: [{ title: 'not shipped' }],
  translations: { de: { title: 'nicht' } },
  destination: project(destination, CATEGORY_TOUR_DESTINATION_SELECT),
  category: [project(category, CATEGORY_TOUR_CATEGORY_SELECT)],
  ...extra,
});

const tours = [1, 2, 3, 4, 5].map((n) => toCategoryTourPayload(project(fullTour(n), CATEGORY_TOUR_SELECT)));
const pageCategory = { _id: 'cat-aswan', name: 'Aswan Tours', slug: 'aswan-tours', description: 'Aswan', heroImage: '/hero.jpg', images: [] };

describe('category trip cards render from the lean payload (#2591)', () => {
  beforeEach(() => {
    sidebarTours.length = 0;
  });

  it('every trip shows its title and links to its own page, and its destination stays listed', () => {
    render(<CategoryPageClient category={pageCategory} categoryTours={tours} />);

    for (const tour of tours) {
      const expectedHref = tour.urlType === 'city' ? `/aswan/${tour.slug}` : `/${tour.slug}`;
      expect(screen.getAllByText(String(tour.title)).length).toBeGreaterThan(0);
      const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
      expect(hrefs).toContain(expectedHref);
    }
    // The popular-destinations block still gets the destination name and image.
    expect(screen.getAllByAltText('Aswan').some((img) => img.getAttribute('src') === '/aswan.jpg')).toBe(true);
  });

  it('grid cards keep duration, rating, the from price and the struck-through price', () => {
    render(<CategoryPageClient category={pageCategory} categoryTours={tours} />);

    // With five trips the top three by rating become Top Picks; trips 1 and 2 sit in the grid.
    for (const n of [1, 2]) {
      const card = screen.getAllByRole('link', { name: `Aswan trip ${n}` })
        .map((link) => link.closest('div.bg-white'))
        .find(Boolean) as HTMLElement;
      expect(card).toBeTruthy();
      expect(within(card).getByText(`${n + 4} hours`)).toBeInTheDocument();
      expect(within(card).getByText(String(4 + n / 10))).toBeInTheDocument();
      expect(within(card).getByText(`$${75 + n}.00`)).toBeInTheDocument();
      expect(within(card).getByText(`$${120 + n}.00`)).toBeInTheDocument();
      expect(within(card).getByRole('img', { name: `Aswan trip ${n}` })).toHaveAttribute('src', `/trip-${n}.jpg`);
    }
  });

  it('quick book opens the sidebar with the booking fields of that trip', () => {
    render(<CategoryPageClient category={pageCategory} categoryTours={tours} />);
    const card = screen.getAllByRole('link', { name: 'Aswan trip 2' })
      .map((link) => link.closest('div.bg-white'))
      .find(Boolean) as HTMLElement;
    fireEvent.click(within(card).getByRole('button'));

    const opened = sidebarTours[sidebarTours.length - 1];
    expect(opened).toMatchObject({
      _id: 'tour-2',
      title: 'Aswan trip 2',
      discountPrice: 82,
      bookingOptions: [{ id: 'opt-2', price: 82 }],
      availability: { type: 'daily', availableDays: [1], slots: [{ time: '08:00', capacity: 5 }] },
      bookingCutoffMinutes: 90,
      destination: { _id: 'dest-aswan', name: 'Aswan', slug: 'aswan' },
    });
    expect(opened).not.toHaveProperty('itinerary');
    expect(opened).not.toHaveProperty('translations');
  });
});
