import { formatTourForAlgolia } from '@/lib/algolia';

const tour = (extra: Record<string, unknown>) => ({
  _id: { toString: () => '507f1f77bcf86cd799439011' },
  title: 'Cairo Private Shopping Tour',
  slug: 'cairo-private-shopping-tour',
  ...extra,
}) as Parameters<typeof formatTourForAlgolia>[0];

describe('search "from" price', () => {
  it('uses the tour price when the stored listing summary is 0 (an unpriced option)', () => {
    const record = formatTourForAlgolia(tour({ discountPrice: 60, price: 60, pricingSummary: { fromPrice: 0, currency: 'USD', version: 0 } }));
    expect(record.fromPrice).toBe(60);
    expect(record.discountPrice).toBe(60);
  });

  it('keeps a real listing summary', () => {
    const record = formatTourForAlgolia(tour({ discountPrice: 16, pricingSummary: { fromPrice: 21.66, currency: 'USD', version: 0 } }));
    expect(record.fromPrice).toBe(21.66);
  });
});
