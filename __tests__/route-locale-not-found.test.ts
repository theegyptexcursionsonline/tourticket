import fs from 'node:fs';
import path from 'node:path';

jest.mock('next/navigation', () => ({
  notFound: () => {
    const error = new Error('NEXT_HTTP_ERROR_FALLBACK;404');
    (error as Error & { digest?: string }).digest = 'NEXT_HTTP_ERROR_FALLBACK;404';
    throw error;
  },
}));

import { requireRouteLocale } from '@/lib/i18n/routeLocale';

// Sentry, Nov 2026: bot probes (/wp-good.php, /dashboard/.env) reached page
// metadata with a fake locale; the SEO helpers threw, each probe became a 500
// and those errors used up the monitoring allowance for every project.
describe('requireRouteLocale', () => {
  it.each(['en', 'ar', 'es', 'fr', 'de'])('lets the served locale %s through', (locale) => {
    expect(() => requireRouteLocale(locale)).not.toThrow();
  });

  it.each(['wp-good.php', 'dashboard', 'dashboard/.env', 'it', 'EN', ''])('answers %p with a 404', (locale) => {
    expect(() => requireRouteLocale(locale)).toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
  });
});

describe('page metadata checks the locale before building SEO data', () => {
  const pages = [
    'app/[locale]/page.tsx',
    'app/[locale]/mobile-app/page.tsx',
    'app/[locale]/ai-voice/page.tsx',
    'app/[locale]/tours/page.tsx',
    'app/[locale]/technology/page.tsx',
    'app/[locale]/destinations/page.tsx',
    'app/[locale]/blog/page.tsx',
    'app/[locale]/interests/page.tsx',
  ];
  it.each(pages)('%s', (file) => {
    const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    const metadata = source.slice(source.indexOf('export async function generateMetadata'));
    const guard = metadata.indexOf('requireRouteLocale(locale)');
    expect(guard).toBeGreaterThan(-1);
    const firstSeoCall = Math.min(
      ...['metadataAlternates(', 'openGraphLocale(', 'getPageMeta('].map((call) => metadata.indexOf(call)).filter((i) => i > -1),
    );
    expect(guard).toBeLessThan(firstSeoCall);
  });
});
