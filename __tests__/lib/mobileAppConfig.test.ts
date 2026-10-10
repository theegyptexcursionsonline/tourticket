/**
 * @jest-environment node
 *
 * The app store listings decide whether the storefront shows a store link or
 * "coming soon". Only a URL with the shape of a real listing is accepted.
 */
import {
  mobileAppIsLive,
  mobileAppLandingPath,
  mobileAppLandingUrl,
  mobileAppStores,
  parseMobileAppStores,
} from '@/lib/config/mobileApp';

describe('App Store listing', () => {
  it.each([
    ['https://apps.apple.com/us/app/egypt-excursions-online/id1234567890', '1234567890'],
    ['https://apps.apple.com/app/id987654321', '987654321'],
    ['https://apps.apple.com/de/app/eeo/id1234567890?platform=iphone', '1234567890'],
  ])('accepts %s', (url, id) => {
    expect(parseMobileAppStores({ appStore: url })).toEqual({ appStoreUrl: url, playStoreUrl: null, appStoreId: id });
  });

  it.each([
    ['plain http', 'http://apps.apple.com/us/app/eeo/id1234567890'],
    ['another host', 'https://apps.apple.com.example.net/us/app/eeo/id1234567890'],
    ['a script URL', 'javascript:alert(1)//apps.apple.com/app/id1234567890'],
    ['no app id', 'https://apps.apple.com/us/app/egypt-excursions-online'],
    ['the developer page', 'https://apps.apple.com/us/developer/eeo/id1234567890'],
    ['an empty value', ''],
  ])('refuses %s', (_label, url) => {
    expect(parseMobileAppStores({ appStore: url })).toEqual({ appStoreUrl: null, playStoreUrl: null, appStoreId: null });
  });
});

describe('Google Play listing', () => {
  it.each([
    'https://play.google.com/store/apps/details?id=com.eeoapp',
    'https://play.google.com/store/apps/details?id=com.eeoapp&hl=en',
  ])('accepts %s', (url) => {
    expect(parseMobileAppStores({ playStore: url }).playStoreUrl).toBe(url);
  });

  it.each([
    ['plain http', 'http://play.google.com/store/apps/details?id=com.eeoapp'],
    ['another host', 'https://play.google.com.example.net/store/apps/details?id=com.eeoapp'],
    ['the search page', 'https://play.google.com/store/search?q=eeo'],
    ['no package', 'https://play.google.com/store/apps/details?id='],
    ['a package without a dot', 'https://play.google.com/store/apps/details?id=eeoapp'],
  ])('refuses %s', (_label, url) => {
    expect(parseMobileAppStores({ playStore: url }).playStoreUrl).toBeNull();
  });
});

describe('app state', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it('is coming soon with no listing configured', () => {
    delete process.env.NEXT_PUBLIC_EEO_APP_STORE_URL;
    delete process.env.NEXT_PUBLIC_EEO_PLAY_STORE_URL;
    const stores = mobileAppStores();
    expect(stores).toEqual({ appStoreUrl: null, playStoreUrl: null, appStoreId: null });
    expect(mobileAppIsLive(stores)).toBe(false);
  });

  it('is live as soon as one store listing is configured', () => {
    process.env.NEXT_PUBLIC_EEO_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.eeoapp';
    expect(mobileAppIsLive(mobileAppStores())).toBe(true);
  });

  it('ignores a configured value that is not a listing', () => {
    process.env.NEXT_PUBLIC_EEO_APP_STORE_URL = 'https://example.com/app';
    expect(mobileAppIsLive(mobileAppStores())).toBe(false);
  });
});

describe('app page address', () => {
  it.each([
    ['en', '/mobile-app'],
    ['ar', '/ar/mobile-app'],
    ['de', '/de/mobile-app'],
  ])('for %s is %s', (locale, path) => {
    expect(mobileAppLandingPath(locale)).toBe(path);
    expect(mobileAppLandingUrl(locale)).toBe(`https://egypt-excursionsonline.com${path}`);
  });
});
