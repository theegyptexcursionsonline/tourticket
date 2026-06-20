import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'ar', 'es', 'fr', 'de'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  // Don't auto-redirect locale-less URLs to the visitor's cookie/Accept-Language
  // locale. A shared or crawled link like /tour/x should resolve to the default
  // locale, not bounce to /es/... based on a stale cookie. Language is chosen
  // explicitly via the switcher (and discoverable via hreflang).
  localeDetection: false,
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
