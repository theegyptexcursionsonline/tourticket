import { defaultLocale, locales } from '@/i18n/config';

interface LegacyTenantTourTarget {
  origin: string;
  slug: string;
}

// These are tenant-owned tours that were previously published in the flagship
// sitemap. Keep the old EEO URLs useful while search indexes and shared client
// documents age out, without duplicating tenant inventory into the default site.
const LEGACY_TENANT_TOUR_TARGETS: Readonly<Record<string, LegacyTenantTourTarget>> = {
  'snorkeling-boat-trip-el-gouna': {
    origin: 'https://elgounaexcursions.com',
    slug: 'snorkeling-boat-trip-el-gouna',
  },
};

export function legacyTenantTourUrl(slug: string, locale: string): string | null {
  const target = LEGACY_TENANT_TOUR_TARGETS[slug];
  if (!target || !locales.includes(locale as (typeof locales)[number])) return null;

  const localePrefix = locale === defaultLocale ? '' : `/${locale}`;
  return `${target.origin}${localePrefix}/${target.slug}`;
}
