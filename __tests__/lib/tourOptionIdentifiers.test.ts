import {
  collectTourOptionIds,
  findMatchingTourOptionIds,
  matchesTourAdminSearch,
} from '@/lib/admin/tourOptionIdentifiers';

describe('tour option identifiers', () => {
  it('collects RevenuePilot keys, stable ids and subdocument ids without duplicates', () => {
    expect(collectTourOptionIds([
      { pricingKey: 'private-luxor-123', id: 'legacy-1', _id: 'subdoc-1' },
      { pricingKey: 'private-luxor-123', id: 'legacy-2' },
      null,
    ])).toEqual([
      'private-luxor-123',
      'legacy-1',
      'subdoc-1',
      'legacy-2',
    ]);
  });

  it('matches a complete Option ID case-insensitively and ignores partial ids', () => {
    const options = [{ pricingKey: 'private-luxor-123', id: 'UUID-OPTION-1' }];
    expect(findMatchingTourOptionIds(options, 'uuid-option-1')).toEqual(['UUID-OPTION-1']);
    expect(findMatchingTourOptionIds(options, 'uuid-option')).toEqual([]);
  });

  it('lets the Tours list find a tour by a partial Option ID', () => {
    const tour = {
      _id: 'tour-1',
      title: 'Private Luxor Tour',
      optionIds: ['private-luxor-tour-62a4623aa5d7'],
    };
    expect(matchesTourAdminSearch(tour, '62a4623')).toBe(true);
    expect(matchesTourAdminSearch(tour, 'missing-option')).toBe(false);
  });
});
