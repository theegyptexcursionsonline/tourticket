import { normalizeContextualDiscoveryLinks } from '@/lib/seo/contextualDiscovery';

describe('contextual discovery links', () => {
  it('keeps only bounded unique internal routes with visible labels', () => {
    const links = normalizeContextualDiscoveryLinks([
      { href: '/de/destinations/cairo', label: '  Cairo   trips ' },
      { href: '/de/destinations/cairo', label: 'Duplicate Cairo' },
      { href: 'https://example.com', label: 'External' },
      { href: '//example.com', label: 'Protocol relative' },
      { href: '/de/blog/x?ref=forced', label: 'Tracking URL' },
      { href: '/de/categories/culture', label: 'Culture' },
      { href: '/de/blog/history', label: 'History' },
    ], 2);

    expect(links).toEqual([
      { href: '/de/destinations/cairo', label: 'Cairo trips' },
      { href: '/de/categories/culture', label: 'Culture' },
    ]);
  });

  it('fails closed for a non-positive or invalid limit', () => {
    expect(normalizeContextualDiscoveryLinks([{ href: '/blog', label: 'Blog' }], 0)).toEqual([]);
    expect(normalizeContextualDiscoveryLinks([{ href: '/blog', label: 'Blog' }], 1.5)).toEqual([]);
  });
});
