import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

describe('15 August EEO internal memo', () => {
  it('sends Explore Egypt to the tour catalogue and uses valid destination imagery', () => {
    const hero = read('app/[locale]/egypt/EgyptHeroClient.tsx');
    const page = read('app/[locale]/egypt/page.tsx');
    expect(hero).toContain('href="/tours"');
    expect(hero).not.toContain('href="/egypt"');
    expect(hero).toContain('src="/hero3.jpg"');
    expect(page).toContain('src="/pyramid2.jpg"');
    expect(page).not.toContain('src="/hero2.jpg"');
  });

  it('uses main category pages in the Things To Do footer column', () => {
    const footer = read('components/Footer.tsx');
    const column = footer.slice(footer.indexOf('{/* Column 2: Things To Do */}'), footer.indexOf('{/* Column 3: Destinations'));
    expect(column).toContain('categories.slice(0, 5)');
    expect(column).toContain("contentPath('category'");
    expect(column).not.toContain('destinations.slice');
  });
});
