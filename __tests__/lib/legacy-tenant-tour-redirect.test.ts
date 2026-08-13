import { legacyTenantTourUrl } from '@/lib/content/legacyTenantTourRedirect';

describe('legacyTenantTourUrl', () => {
  it('redirects the leaked EEO El Gouna URL to the tenant-owned tour', () => {
    expect(legacyTenantTourUrl('snorkeling-boat-trip-el-gouna', 'en')).toBe(
      'https://elgounaexcursions.com/snorkeling-boat-trip-el-gouna'
    );
  });

  it('preserves supported locale prefixes', () => {
    expect(legacyTenantTourUrl('snorkeling-boat-trip-el-gouna', 'de')).toBe(
      'https://elgounaexcursions.com/de/snorkeling-boat-trip-el-gouna'
    );
  });

  it('fails closed for unknown slugs and locales', () => {
    expect(legacyTenantTourUrl('another-tour', 'en')).toBeNull();
    expect(legacyTenantTourUrl('snorkeling-boat-trip-el-gouna', 'xx')).toBeNull();
  });
});
