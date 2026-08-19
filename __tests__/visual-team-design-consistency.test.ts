import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('visual-team storefront consistency', () => {
  it('removes duplicate homepage discovery blocks while preserving the primary journeys', () => {
    const source = read('components/HomeDeferredSections.tsx');

    expect(source).toContain("import('@/components/FeaturedToursServer')");
    expect(source).toContain("import('@/components/PopularInterestServer')");
    expect(source).toContain("import('@/components/DayTripsServer')");
    expect(source).not.toContain('IcebarPromo');
    expect(source).not.toContain('InterestGridServer');
  });

  it('provides a translated all-destinations action in every storefront locale', () => {
    const component = read('components/DestinationsServer.tsx');
    expect(component).toContain('href="/destinations"');
    expect(component).toContain("t('viewAll')");

    for (const locale of ['en', 'ar', 'de', 'fr', 'es']) {
      const messages = JSON.parse(read(`messages/${locale}.json`));
      expect(messages.destinations.viewAll).toEqual(expect.any(String));
      expect(messages.destinations.viewAll.trim().length).toBeGreaterThan(3);
    }
  });

  it('uses a solid neutral tour hero and one red action color instead of the purple gradient', () => {
    const source = read('app/[locale]/tours/ToursClientPage.tsx');

    expect(source).toContain('bg-slate-950 px-4 py-16 text-white');
    expect(source).toContain('bg-red-600');
    expect(source).not.toContain('from-blue-600 via-indigo-600 to-purple-600');
    expect(source).not.toContain('bg-purple-600 text-white');
  });

  it('keeps Explore Egypt and footer actions on the same red brand treatment', () => {
    const egypt = read('app/[locale]/egypt/EgyptHeroClient.tsx');
    const footer = read('components/Footer.tsx');

    expect(egypt).toContain('bg-red-600');
    expect(egypt).not.toContain('from-amber-400 to-amber-500');
    expect(footer).toContain('bg-red-600');
    expect(footer).not.toContain('from-red-600 to-slate-900');
  });
});
