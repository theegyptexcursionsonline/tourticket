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

// Sentry, 20 Nov 2026: GET /api/blog has no API route, so it reaches the blog
// list with "api" as the locale. The metadata check answered 404, but the page
// body built localized links first and threw, so the visitor got a server error.
describe('a page body that builds localized links checks the locale first', () => {
  const pagesRoot = path.join(process.cwd(), 'app/[locale]');
  const collect = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return collect(full);
      return entry.name === 'page.tsx' ? [full] : [];
    });
  const localizedLinkCalls = ['<CollectionSchema', 'localePath(', 'openGraphLocale(', 'localizedAbsoluteUrl('];
  // Only pages reachable with a fake locale matter: a top-level page whose name is also a
  // folder under app/api without its own route (for example /api/blog).
  const exposed = collect(pagesRoot).filter((file) => {
    const relative = path.relative(pagesRoot, file).split(path.sep);
    if (relative.length !== 2) return false;
    const apiDir = path.join(process.cwd(), 'app/api', relative[0]);
    return fs.existsSync(apiDir) && !fs.existsSync(path.join(apiDir, 'route.ts'));
  });

  it('finds the blog list among the pages a fake locale can reach', () => {
    expect(exposed.map((file) => path.relative(process.cwd(), file))).toContain('app/[locale]/blog/page.tsx');
  });

  it.each(exposed.map((file) => path.relative(process.cwd(), file)))('%s', (file) => {
    const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    const body = source.slice(source.indexOf('export default'));
    const calls = localizedLinkCalls.map((call) => body.indexOf(call)).filter((i) => i > -1);
    if (calls.length === 0) return;
    const guard = body.indexOf('requireRouteLocale(locale)');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(Math.min(...calls));
  });
});
