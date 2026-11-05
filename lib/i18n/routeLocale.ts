import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';

/**
 * A page's metadata runs alongside its layout, so the layout's own locale
 * check cannot stop it. Bots probing paths like /wp-good.php or
 * /dashboard/.env arrive with a fake locale; without this the SEO helpers
 * threw, every probe became a server error and the errors used up the
 * monitoring allowance. Any locale we do not serve is a plain 404.
 */
export function requireRouteLocale(locale: string): void {
  if (!(routing.locales as readonly string[]).includes(locale)) notFound();
}
