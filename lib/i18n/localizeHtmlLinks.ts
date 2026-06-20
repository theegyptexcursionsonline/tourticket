// Localize internal links inside stored HTML content (blog/tour/destination
// bodies rendered via dangerouslySetInnerHTML) so they match the page's locale.
//
// Why: in-content links are stored locale-less (e.g. /tour/x or an apex URL).
// With next-intl localePrefix:'as-needed' + cookie-based locale detection, a
// locale-less path is redirected to whatever the visitor's NEXT_LOCALE cookie
// says — so a link clicked on /es/ lands on /es/... regardless, and never
// updates when the page locale changes. Localizing at render time makes every
// in-content link deterministically match the page it sits on.

import { routing } from "@/i18n/routing";

const LOCALES = new Set<string>(routing.locales as readonly string[]);
const DEFAULT_LOCALE = routing.defaultLocale;

const ASSET_RE =
  /\.(?:jpe?g|png|gif|webp|avif|svg|ico|css|js|mjs|pdf|mp4|webm|woff2?|ttf)(?:\?|#|$)/i;

function localizeOnePath(href: string, locale: string): string {
  let h = href.trim();
  if (!h) return href;
  if (/^(?:mailto:|tel:|#)/i.test(h)) return href;

  // Strip our own domain (apex or www) down to a root-relative path.
  const own = h.match(
    /^https?:\/\/(?:www\.)?egypt-excursionsonline\.com(\/[^\s]*)?$/i,
  );
  if (own) {
    h = own[1] || "/";
  } else if (/^https?:\/\//i.test(h)) {
    return href; // external link — leave untouched
  } else if (!h.startsWith("/")) {
    return href; // in-page relative / anchor — leave
  }

  // Don't touch API routes, Next internals, or asset files.
  if (h.startsWith("/api/") || h.startsWith("/_next/") || ASSET_RE.test(h)) {
    return href;
  }

  // Operate on the path only; preserve any ?query / #hash.
  const tail = h.match(/[?#].*$/)?.[0] ?? "";
  let path = tail ? h.slice(0, -tail.length) : h;

  // Strip an existing leading locale segment (guards against /es/es/…).
  const seg = path.split("/"); // ["", "es", "tour", "x"]
  if (seg[1] && LOCALES.has(seg[1])) {
    seg.splice(1, 1);
    path = seg.join("/") || "/";
  }

  // Tours render at the catch-all /[locale]/[slug]; /tour/:slug 301s to /:slug.
  // Link straight to the canonical URL to avoid an extra redirect hop.
  path = path.replace(/^\/tour\/([^/]+)/, "/$1");

  // Prepend the page locale for non-default locales (as-needed strategy).
  if (locale && locale !== DEFAULT_LOCALE && LOCALES.has(locale)) {
    path = path === "/" ? `/${locale}` : `/${locale}${path}`;
  }

  return path + tail;
}

/** Rewrite every internal href in an HTML string to match the given locale. */
export function localizeHtmlLinks(html: string, locale: string): string {
  if (!html || typeof html !== "string") return html;
  return html.replace(
    /(href=)("|')([^"']*)\2/gi,
    (full, pre: string, q: string, url: string) => {
      const next = localizeOnePath(url, locale);
      return next === url ? full : `${pre}${q}${next}${q}`;
    },
  );
}
