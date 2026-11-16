/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

jest.mock('@/lib/dbConnect', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/lib/models/AttractionPage', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/Tour', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/Category', () => ({ __esModule: true, default: {} }));
jest.mock('@/lib/models/Destination', () => ({ __esModule: true, default: {} }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { localizeAttractionTours } = require('@/lib/attractionPages/pageContent') as typeof import('@/lib/attractionPages/pageContent');

const tours = [
  { _id: 't1', slug: 'felucca', title: 'Luxor Sunset Felucca Ride', description: 'Sail', duration: '2 hours', discountPrice: 30,
    translations: { ar: { title: 'رحلة فلوكة عند الغروب في الأقصر', duration: 'ساعتان' } } },
  { _id: 't2', slug: 'balloon', title: 'Hot Air Balloon', description: 'Fly', duration: '1 hour', discountPrice: 90 },
];

describe('trip cards on attraction and catalogue pages follow the page language', () => {
  it('uses the Arabic title and duration where the trip has them, English otherwise', () => {
    const [felucca, balloon] = localizeAttractionTours(tours, 'ar');
    expect(felucca).toMatchObject({ title: 'رحلة فلوكة عند الغروب في الأقصر', duration: 'ساعتان', description: 'Sail', discountPrice: 30, slug: 'felucca' });
    expect(balloon).toMatchObject({ title: 'Hot Air Balloon', duration: '1 hour', discountPrice: 90 });
  });

  it('leaves English pages and the source records untouched', () => {
    expect(localizeAttractionTours(tours, 'en')).toEqual(tours);
    localizeAttractionTours(tours, 'ar');
    expect(tours[0].title).toBe('Luxor Sunset Felucca Ride');
  });

  it('both page loaders pass their trips through it', () => {
    for (const file of ['app/[locale]/attraction/[slug]/AttractionDetailContent.tsx', 'app/[locale]/category/[category-name]/CataloguePageContent.tsx']) {
      expect(readFileSync(join(process.cwd(), file), 'utf8')).toContain('tours: JSON.parse(JSON.stringify(localizeAttractionTours(tours, locale))),');
    }
  });
});
