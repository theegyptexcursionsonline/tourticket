import type { Metadata } from "next";
import { Inter, Almarai } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { isRTL } from '@/i18n/config';
import { SettingsProvider } from "@/contexts/SettingsContext";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { NavDataProvider } from "@/contexts/NavDataContext";
import CartSidebar from "@/components/CartSidebar";
import WishlistSidebar from "@/components/WishlistSidebar";
import AppToaster from '@/components/ui/AppToaster';
import dbConnect from "@/lib/dbConnect";
import Destination from "@/lib/models/Destination";
import Category from "@/lib/models/Category";
import Tour from "@/lib/models/Tour";
import { localizeEntityFields } from "@/lib/i18n/contentLocalization";
import { selectLocalizedTaxonomyEntries } from "@/lib/i18n/localizedCollections";
import { DEFAULT_TENANT_FILTER } from "@/lib/tenant/defaultTenantFilter";
import type { Category as CategoryData, Destination as DestinationData } from '@/types';
import GoogleTagManager from './GoogleTagManager';
import EEOSearchConcierge from '@/components/EEOSearchConcierge';
import { StorefrontThemeProvider } from '@/contexts/StorefrontThemeContext';
import { STOREFRONT_THEME_BOOTSTRAP } from '@/lib/storefrontTheme';
import { filterVisibleTaxonomyEntries } from '@/lib/utils/taxonomy';

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const almarai = Almarai({
  subsets: ["arabic"],
  weight: ['400', '700', '800'],
  variable: '--font-almarai'
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://egypt-excursionsonline.com';

export const metadata: Metadata = {
  title: "Egypt Excursions Online - Unforgettable Experiences",
  description:
    "Discover and book unforgettable tours, day trips, and excursions across Egypt. Explore Hurghada, Cairo, Luxor, Sharm El Sheikh and more with Egypt Excursions Online.",
  openGraph: {
    type: 'website',
    siteName: 'Egypt Excursions Online',
    title: 'Egypt Excursions Online - Tours & Day Trips in Egypt',
    description: 'Book the best tours, day trips, and excursions across Egypt. Explore Hurghada, Cairo, Luxor, Sharm El Sheikh and more.',
    images: [`${BASE_URL}/og-image.jpg`],
    locale: 'en',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Egypt Excursions Online - Tours & Day Trips in Egypt',
    description: 'Book the best tours, day trips, and excursions across Egypt.',
    images: [`${BASE_URL}/og-image.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
    languages: {
      'en': `${BASE_URL}/`,
      'ar': `${BASE_URL}/ar`,
      'es': `${BASE_URL}/es`,
      'fr': `${BASE_URL}/fr`,
      'de': `${BASE_URL}/de`,
      'x-default': `${BASE_URL}/`,
    },
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Module-level nav-data cache. During `next build` the LocaleLayout runs for
// every single static page (272× on tourticket) — without a cache, every page
// re-hits MongoDB twice, which cumulatively pushed individual page renders
// past Next.js's 60s SSG budget and timed out the Netlify build. The cache
// below drops each worker process from 272 DB round-trips to 1 per locale/TTL
// window, which is all we need during a build and still safe at runtime.
type NavCache = { destinations: DestinationData[]; categories: CategoryData[] };
type LocaleNavCache = Record<string, NavCache | undefined>;
let _navDataCache: LocaleNavCache = {};
let _navDataCacheExpiry = 0;
const NAV_DATA_TTL_MS = 60_000;

async function getNavData(locale: string): Promise<NavCache> {
  const now = Date.now();
  const cached = _navDataCache[locale];
  if (cached && now < _navDataCacheExpiry) {
    return cached;
  }

  try {
    await dbConnect();
    // Plain `.find().lean()` (cheap and index-friendly) followed by a JS-side
    // locale-aware dedupe. The old code used a `$group` aggregation to collapse
    // duplicate category clusters live in the DB, but that pipeline was orders
    // of magnitude slower than doing the selection in Node and had to run once
    // per SSG page. We still keep the "menu never shows duplicate or wrong-
    // language items" guarantee while staying cheap during build/runtime.
    const [destinations, categories, destinationCounts, categoryCounts] = await Promise.all([
      Destination.find({ isPublished: true, featured: true, archivedAt: null, ...DEFAULT_TENANT_FILTER })
        .select('_id name slug image description country featured urlType parentPage archivedAt translations')
        .sort({ tourCount: -1, name: 1 })
        .lean(),
      Category.find({ isPublished: true, featured: true, archivedAt: null, ...DEFAULT_TENANT_FILTER })
        .select('_id name slug icon heroImage description order urlType parentPage archivedAt translations')
        .sort({ order: 1, name: 1 })
        .lean(),
      Tour.aggregate<{ _id: unknown; tourCount: number }>([
        { $match: { isPublished: true, archivedAt: null, ...DEFAULT_TENANT_FILTER } },
        { $group: { _id: '$destination', tourCount: { $sum: 1 } } },
      ]),
      Tour.aggregate<{ _id: unknown; tourCount: number }>([
        { $match: { isPublished: true, archivedAt: null, ...DEFAULT_TENANT_FILTER } },
        { $unwind: '$category' },
        { $group: { _id: '$category', tourCount: { $sum: 1 } } },
      ]),
    ]);

    const destinationCountById = new Map(destinationCounts.map((row) => [String(row._id), row.tourCount]));
    const categoryCountById = new Map(categoryCounts.map((row) => [String(row._id), row.tourCount]));
    const visibleDestinations = filterVisibleTaxonomyEntries(
      destinations.map((destination) => ({
        ...destination,
        tourCount: destinationCountById.get(String(destination._id)) || 0,
      })),
      { requireTours: true },
    );
    const visibleCategories = filterVisibleTaxonomyEntries(
      categories.map((category) => ({
        ...category,
        tourCount: categoryCountById.get(String(category._id)) || 0,
      })),
      { requireTours: true },
    );

    const result: NavCache = {
      destinations: selectLocalizedTaxonomyEntries(
        JSON.parse(JSON.stringify(visibleDestinations)) as Record<string, unknown>[],
        locale,
        ['name', 'description', 'country', 'metaTitle', 'metaDescription']
      ).map((destination: Record<string, unknown>) =>
        localizeEntityFields(destination, locale, ['name', 'description', 'country', 'metaTitle', 'metaDescription'])
      ) as unknown as DestinationData[],
      categories: selectLocalizedTaxonomyEntries(
        JSON.parse(JSON.stringify(visibleCategories)) as Record<string, unknown>[],
        locale,
        ['name', 'description', 'longDescription', 'metaTitle', 'metaDescription', 'highlights', 'features']
      ).map((category: Record<string, unknown>) =>
        localizeEntityFields(category, locale, [
          'name',
          'description',
          'longDescription',
          'metaTitle',
          'metaDescription',
          'highlights',
          'features',
        ])
      ) as unknown as CategoryData[],
    };

    _navDataCache = { [locale]: result };
    _navDataCacheExpiry = now + NAV_DATA_TTL_MS;
    return result;
  } catch (error) {
    console.error('Failed to fetch nav data in layout:', error);
    return { destinations: [], categories: [] };
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // Enable static rendering for this locale (required for ISR/revalidate)
  setRequestLocale(locale);

  const messages = await getMessages();
  const { destinations, categories } = await getNavData(locale);

  const dir = isRTL(locale) ? 'rtl' : 'ltr';
  const fontClass = isRTL(locale) ? 'font-arabic' : 'font-sans';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <script
          id="storefront-theme-bootstrap"
          dangerouslySetInnerHTML={{ __html: STOREFRONT_THEME_BOOTSTRAP }}
        />
      </head>
      <body className={`${inter.variable} ${almarai.variable} ${fontClass} storefront-theme`} suppressHydrationWarning>
        <StorefrontThemeProvider>
        <GoogleTagManager containerId="GTM-W9WCZFKM" />
        {/* Google Tag Manager (noscript) */}
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-W9WCZFKM" height="0" width="0" style={{display:'none',visibility:'hidden'}}></iframe></noscript>
        {/* FoxesConnect support widget — the PLAIN support entry (separate from AI
            Search, per the client's 19-20/08 request). Hidden launcher: it opens only
            from the footer "Chat with us" link via the open-chatbot event, so the AI
            Search capsule stays the single floating assistant. Host check runs
            CLIENT-side so pages stay statically rendered. */}
        <script
          dangerouslySetInnerHTML={{ __html: `(function(){try{var h=location.hostname.toLowerCase().replace(/^www\\./,'');if(h!=='egypt-excursionsonline.com')return;var s=document.createElement('script');s.src='https://connect.foxestechnology.com/embed.js?v=20260821-support-entry';s.async=true;s.setAttribute('data-org','eeo');s.setAttribute('data-color','#2563EB');s.setAttribute('data-position','right');s.setAttribute('data-launcher','none');s.setAttribute('data-open-event','open-chatbot');document.body.appendChild(s);}catch(e){}})();` }}
        />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <SettingsProvider initialLocale={locale}>
              <CartProvider>
                <WishlistProvider>
                  <NavDataProvider destinations={destinations} categories={categories}>
                    {children}
                    <CartSidebar />
                    <WishlistSidebar />
                    <AppToaster direction={dir} />
                    <EEOSearchConcierge />
                  </NavDataProvider>
                </WishlistProvider>
              </CartProvider>
            </SettingsProvider>
          </AuthProvider>
        </NextIntlClientProvider>
        </StorefrontThemeProvider>
      </body>
    </html>
  );
}
