/**
 * The EEO mobile app as the storefront presents it.
 *
 * The store listings are unset until the app is published. Until then every
 * surface (header card, footer, /mobile-app) presents the app as coming soon and
 * never renders a store button that leads nowhere. A store link appears only
 * once its listing URL is configured and has the shape of a real listing.
 * NEXT_PUBLIC_* values are inlined at build time, so adding the links needs a
 * rebuild; each value must be read with a direct `process.env.NAME` reference.
 */

const APP_STORE_LISTING = /^https:\/\/apps\.apple\.com\/(?:[a-z]{2}\/)?app\/(?:[a-z0-9-]+\/)?id(\d{6,12})(?:\?[^\s]*)?$/i;
const PLAY_STORE_LISTING = /^https:\/\/play\.google\.com\/store\/apps\/details\?id=[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+(?:&[^\s]*)?$/;

export const MOBILE_APP_SITE_ORIGIN = 'https://egypt-excursionsonline.com';

export type MobileAppStores = {
  appStoreUrl: string | null;
  playStoreUrl: string | null;
  /** Numeric App Store id, for Safari's own app banner. */
  appStoreId: string | null;
};

export function parseMobileAppStores(input: { appStore?: string; playStore?: string }): MobileAppStores {
  const appStore = input.appStore?.trim() ?? '';
  const playStore = input.playStore?.trim() ?? '';
  const appStoreMatch = APP_STORE_LISTING.exec(appStore);
  return {
    appStoreUrl: appStoreMatch ? appStore : null,
    playStoreUrl: PLAY_STORE_LISTING.test(playStore) ? playStore : null,
    appStoreId: appStoreMatch ? appStoreMatch[1] : null,
  };
}

export function mobileAppStores(): MobileAppStores {
  return parseMobileAppStores({
    appStore: process.env.NEXT_PUBLIC_EEO_APP_STORE_URL,
    playStore: process.env.NEXT_PUBLIC_EEO_PLAY_STORE_URL,
  });
}

/** True once at least one store listing is configured. */
export function mobileAppIsLive(stores: MobileAppStores): boolean {
  return Boolean(stores.appStoreUrl || stores.playStoreUrl);
}

/** The app page the QR codes open (English has no locale prefix). */
export function mobileAppLandingPath(locale: string): string {
  return locale === 'en' ? '/mobile-app' : `/${locale}/mobile-app`;
}

export function mobileAppLandingUrl(locale: string): string {
  return `${MOBILE_APP_SITE_ORIGIN}${mobileAppLandingPath(locale)}`;
}
