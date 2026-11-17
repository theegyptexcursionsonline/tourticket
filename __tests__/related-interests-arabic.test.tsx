/**
 * "Similar attractions" cards (RelatedInterests) printed their badge, card
 * labels, counts and link text in English on Arabic pages; they also ask the
 * interests list for the page language.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

let mockLocale = 'en';
jest.mock('next-intl', () => ({ useLocale: () => mockLocale }));
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));
jest.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const RelatedInterests = require('@/components/RelatedInterests').default as React.ComponentType<Record<string, unknown>>;

const interests = [
  { _id: 'c1', type: 'category', name: 'جولات مصر', slug: 'egypt-tours', products: 211, featured: true, image: '/e.jpg', urlType: 'direct' },
  { _id: 'a1', type: 'attraction', name: 'الكرنك', slug: 'karnak-temple', products: 2, featured: false, image: '/k.jpg', urlType: 'direct' },
];

afterEach(() => {
  mockLocale = 'en';
  jest.restoreAllMocks();
});

describe('RelatedInterests in Arabic', () => {
  it('labels cards and the section in Arabic', async () => {
    mockLocale = 'ar';
    const { container } = render(<RelatedInterests initialInterests={interests} title="معالم مشابهة" subtitle="x" />);
    await screen.findByText('جولات مصر');
    expect(screen.getByText('اهتمامات ذات صلة')).toBeInTheDocument();
    expect(screen.getByText('211 تجربة')).toBeInTheDocument();
    expect(screen.getByText('تجربتان')).toBeInTheDocument();
    expect(screen.getByText('مميز')).toBeInTheDocument();
    expect(screen.getByText('فئة')).toBeInTheDocument();
    expect(screen.getByText('معلم')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'افتح الكرنك' })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Related Interests|Featured|Category|Attraction|experiences|View All/);
  });

  it('keeps English labels on English pages', async () => {
    render(<RelatedInterests initialInterests={interests} />);
    await screen.findByText('Related Interests');
    expect(screen.getByText('211 experiences')).toBeInTheDocument();
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('asks the interests list for the page language when it has no initial list', async () => {
    mockLocale = 'ar';
    const fetchMock = jest.fn(async () => ({ ok: true, json: async () => ({ success: true, data: interests }) }));
    (global as unknown as { fetch: unknown }).fetch = fetchMock;
    render(<RelatedInterests />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/interests?locale=ar'));
    await screen.findByText('الكرنك');
  });
});

describe('RelatedInterests in German, French and Spanish', () => {
  it.each([
    ['de', 'Ähnliche Interessen', '211 Erlebnisse', 'Empfohlen', 'Kategorie'],
    ['fr', 'Centres d’intérêt proches', '211 expériences', 'Recommandé', 'Catégorie'],
    ['es', 'Intereses relacionados', '211 experiencias', 'Destacado', 'Categoría'],
  ])('%s labels', async (locale, badge, count, featured, category) => {
    mockLocale = locale as string;
    render(<RelatedInterests initialInterests={interests} />);
    await screen.findByText(badge as string);
    expect(screen.getByText(count as string)).toBeInTheDocument();
    expect(screen.getByText(featured as string)).toBeInTheDocument();
    expect(screen.getByText(category as string)).toBeInTheDocument();
  });
});
