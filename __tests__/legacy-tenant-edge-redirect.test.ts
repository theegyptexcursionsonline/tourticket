import fs from 'node:fs';
import path from 'node:path';

describe('legacy tenant edge redirects', () => {
  it('routes English and every supported localized URL to El Gouna at the CDN edge', () => {
    const config = fs.readFileSync(path.join(process.cwd(), 'netlify.toml'), 'utf8');
    const locales = ['', 'ar/', 'es/', 'fr/', 'de/'];

    for (const locale of locales) {
      expect(config).toContain(`from = "/${locale}snorkeling-boat-trip-el-gouna"`);
      expect(config).toContain(
        `to = "https://elgounaexcursions.com/${locale}snorkeling-boat-trip-el-gouna"`
      );
    }
  });
});
