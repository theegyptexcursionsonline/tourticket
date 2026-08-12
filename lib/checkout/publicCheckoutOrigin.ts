const DEFAULT_CHECKOUT_ORIGIN = 'https://egypt-excursionsonline.com';

export function publicCheckoutOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
    || process.env.NEXT_PUBLIC_BASE_URL
    || DEFAULT_CHECKOUT_ORIGIN;
  const url = new URL(configured);
  const localDevelopment = process.env.NODE_ENV !== 'production'
    && ['localhost', '127.0.0.1'].includes(url.hostname);
  if ((!localDevelopment && url.protocol !== 'https:') || url.username || url.password) {
    throw new Error('Public checkout origin must be a credential-free HTTPS origin.');
  }
  return url.origin;
}
