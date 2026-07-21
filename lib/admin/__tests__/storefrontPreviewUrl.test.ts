import { storefrontPreviewUrl } from '../storefrontPreviewUrl';

describe('storefrontPreviewUrl', () => {
  it('removes the main dashboard hostname from public previews', () => {
    expect(storefrontPreviewUrl('/categories/safari', {
      adminOrigin: 'https://dashboard2.egypt-excursionsonline.com',
    })).toBe('https://egypt-excursionsonline.com/categories/safari');
  });

  it('prefers the selected tenant storefront domain', () => {
    expect(storefrontPreviewUrl('/tour/safari', {
      tenantDomain: 'makadibayexcursions.com',
      adminOrigin: 'https://dashboard.egypt-excursionsonline.com',
    })).toBe('https://makadibayexcursions.com/tour/safari');
  });
});
