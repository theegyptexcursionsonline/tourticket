/**
 * Trip page in the visitor's language (17 Nov): the trip-page header (Header2)
 * printed English buttons and menus and its menu links dropped the language;
 * "What's included", the route map, the review note and the internal-link
 * eyebrow were English on every language. Also: a destination with no real
 * coordinates no longer prints "0, 0".
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, fireEvent } from '@testing-library/react';

let mockLocale = 'ar';
const mockMessages: Record<string, unknown> = {
  en: jest.requireActual('../messages/en.json'),
  ar: jest.requireActual('../messages/ar.json'),
  de: jest.requireActual('../messages/de.json'),
  fr: jest.requireActual('../messages/fr.json'),
  es: jest.requireActual('../messages/es.json'),
};
const lookup = (key: string, values?: Record<string, unknown>) => {
  const raw = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], mockMessages[mockLocale]);
  if (typeof raw !== 'string') return key;
  return raw.replace(/\{(\w+)\}/g, (_, name) => String(values?.[name] ?? `{${name}}`));
};

jest.mock('next-intl', () => ({ useLocale: () => mockLocale, useTranslations: () => lookup }));
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}));
const linkHrefs: string[] = [];
jest.mock('@/i18n/routing', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => {
    linkHrefs.push(href);
    return <a data-locale-link="true" href={href} {...rest}>{children}</a>;
  },
}));
jest.mock('@/hooks/useCart', () => ({ useCart: () => ({ openCart: jest.fn(), totalItems: 0 }) }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: null, logout: jest.fn() }) }));
jest.mock('@/contexts/WishlistContext', () => ({ useWishlist: () => ({ openWishlistSidebar: jest.fn(), wishlist: [] }) }));
jest.mock('@/contexts/NavDataContext', () => ({
  useNavData: () => ({
    destinations: [{ _id: 'd1', name: 'Luxor', slug: 'luxor', image: '/l.jpg', urlType: 'direct' }],
    categories: [{ _id: 'c1', name: 'Day trips', slug: 'day-trips', urlType: 'direct' }],
  }),
}));
jest.mock('@/components/shared/CurrencyLanguageSwitcher', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/ThemeToggle', () => ({ __esModule: true, default: () => null }));

/* eslint-disable @typescript-eslint/no-require-imports */
const Header2 = require('@/components/Header2').default as React.ComponentType<{ startSolid?: boolean }>;
const { hasRealCoordinates } = require('@/app/[locale]/destinations/[slug]/DestinationPageClient') as { hasRealCoordinates: (c: unknown) => boolean };
const { DEFAULT_ROUTE_MAP_LABELS } = require('@/components/tours/InteractiveItineraryMap') as { DEFAULT_ROUTE_MAP_LABELS: Record<string, unknown> };
/* eslint-enable @typescript-eslint/no-require-imports */

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const msg = (locale: string, key: string) => {
  mockLocale = locale;
  return lookup(key);
};

afterEach(() => {
  mockLocale = 'ar';
  linkHrefs.length = 0;
});

describe('trip page header (Header2)', () => {
  it.each(['ar', 'de', 'fr', 'es'])('%s: buttons, explore and menus use the page language', (locale) => {
    mockLocale = locale;
    const { container } = render(<Header2 startSolid />);
    expect(screen.getAllByText(lookup('header.login')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(lookup('header.signup')).length).toBeGreaterThan(0);
    expect(screen.getByText(lookup('header.explore'))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: lookup('header.openCart') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: lookup('header.openMenu') })).toBeInTheDocument();
    for (const english of [/Log In/, /Sign Up/, /\bEXPLORE\b/, /Where are you going\?/]) {
      expect(container.textContent).not.toMatch(english);
    }
  });

  it('menus link through the language-aware router and carry no other city search terms', () => {
    mockLocale = 'ar';
    render(<Header2 startSolid />);
    fireEvent.click(screen.getByText(lookup('header.explore')));
    expect(screen.getByText(lookup('header.destinations'))).toBeInTheDocument();
    expect(linkHrefs).toEqual(expect.arrayContaining(['/luxor', '/day-trips', '/login', '/signup']));
    const source = read('components/Header2.tsx');
    expect(source).not.toContain("from 'next/link'");
    // The scrolled header search shows the translated placeholder.
    expect(source).toContain("const currentSuggestion = t('search.placeholder');");
    expect(source).not.toMatch(/CANAL CRUISE|LIGHT FESTIVAL|canal cruises/i);
    expect(source).not.toMatch(/<a key=\{(dest|activity)\._id\} href=\{contentPath/);
  });
});

describe('trip page sections', () => {
  it('included and not included headings come from the messages in every language', () => {
    const page = read('app/[locale]/[slug]/TourDetailClientPage.tsx');
    expect(page).toContain("{t('tourPage.whatsIncluded')}");
    expect(page).toContain("{t('tourPage.whatsNotIncluded')}");
    expect(page).not.toContain('What&apos;s included');
    expect(msg('ar', 'tourPage.whatsIncluded')).toBe('ما يشمله السعر');
    expect(msg('de', 'tourPage.whatsNotIncluded')).toBe('Nicht inklusive');
    expect(msg('en', 'tourPage.whatsIncluded')).toBe('What’s included');
  });

  it('every route map label exists in all five languages and the page passes them in', () => {
    const page = read('app/[locale]/[slug]/TourDetailClientPage.tsx');
    expect(page).toContain('labels={routeMapLabels}');
    for (const key of Object.keys(DEFAULT_ROUTE_MAP_LABELS)) {
      for (const locale of ['en', 'ar', 'de', 'fr', 'es']) {
        const value = msg(locale, `routeMap.${key}`);
        expect(value).not.toBe(`routeMap.${key}`);
        if (locale === 'ar') expect(value).toMatch(/[؀-ۿ]/);
      }
      expect(page).toContain(`t('routeMap.${key}'`);
    }
    mockLocale = 'ar';
    expect(lookup('routeMap.roadMap', { count: 5 })).toBe('خريطة الطريق · 5 محطات');
  });

  it('the review eligibility note and the internal-link eyebrow are translated', () => {
    expect(read('components/reviews/ReviewForm.tsx')).toContain("{t('guest.eligibilityNote')}");
    expect(msg('ar', 'reviewsForm.guest.eligibilityNote')).toMatch(/[؀-ۿ]/);
    const block = read('components/navigation/InternalLinkBlock.tsx');
    expect(block).toContain('{labels.eyebrow}');
    expect(block).toContain("ar: { eyebrow: 'اكتشف المزيد'");
  });
});

describe('destination coordinates', () => {
  it('treats 0,0, missing and out-of-range values as no location', () => {
    expect(hasRealCoordinates({ lat: 0, lng: 0 })).toBe(false);
    expect(hasRealCoordinates(null)).toBe(false);
    expect(hasRealCoordinates({ lat: Number.NaN, lng: 32 })).toBe(false);
    expect(hasRealCoordinates({ lat: 120, lng: 32 })).toBe(false);
    expect(hasRealCoordinates({ lat: 24.0889, lng: 32.8998 })).toBe(true);
  });
});
