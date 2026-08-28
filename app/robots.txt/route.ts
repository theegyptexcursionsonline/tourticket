// app/robots.txt/route.ts
// Dynamic robots.txt generation — SEO-optimised, blocks AI scrapers & bad bots

import { NextResponse } from 'next/server';
import { locales } from '@/i18n/config';
import { SEO_BASE_URL } from '@/lib/i18n/seoAlternates';

export const dynamic = 'force-dynamic';

const PRIVATE_PATHS = [
  '/admin',
  '/api',
  '/user',
  '/checkout',
  '/cart',
  '/login',
  '/signup',
  '/forgot',
  '/reset-password',
  '/profile',
  '/bookings',
  '/booking/verify',
  '/accept-invitation',
  '/offer',
  '/payment',
  '/redirecting',
] as const;

function privateDisallowRules(): string {
  const paths = [
    ...PRIVATE_PATHS,
    ...locales.flatMap((locale) => PRIVATE_PATHS.map((path) => `/${locale}${path}`)),
  ];
  return paths.map((path) => `Disallow: ${path}`).join('\n');
}

export async function GET() {
  const baseUrl = SEO_BASE_URL;
  const sitemapUrl = `${baseUrl}/sitemap.xml`;

  const robotsTxt = `# =============================================
# Robots.txt — ${baseUrl}
# Egypt Excursions Online
# =============================================

# -----------------------------------------------
# Default rules for all well-behaved crawlers
# -----------------------------------------------
User-agent: *
Allow: /
${privateDisallowRules()}
Disallow: /sentry-example-page
Disallow: /coming-soon
Disallow: /maintenance
Disallow: /offline
Crawl-delay: 1

# -----------------------------------------------
# Google — no crawl-delay (Google ignores it)
# -----------------------------------------------
User-agent: Googlebot
Allow: /
${privateDisallowRules()}
Disallow: /sentry-example-page
Disallow: /coming-soon
Disallow: /maintenance
Disallow: /offline

# -----------------------------------------------
# Googlebot-Image — allow image directories
# -----------------------------------------------
User-agent: Googlebot-Image
Allow: /images/
Allow: /uploads/
Allow: /static/
${privateDisallowRules()}

# -----------------------------------------------
# Bing
# -----------------------------------------------
User-agent: Bingbot
Allow: /
${privateDisallowRules()}
Disallow: /coming-soon
Disallow: /maintenance
Disallow: /offline
Crawl-delay: 1

# -----------------------------------------------
# Block AI scrapers / LLM training bots
# -----------------------------------------------
User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Claude-Web
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: PerplexityBot
Disallow: /

User-agent: Cohere-ai
Disallow: /

User-agent: FacebookBot
Disallow: /

User-agent: Diffbot
Disallow: /

User-agent: Omgilibot
Disallow: /

User-agent: YouBot
Disallow: /

# -----------------------------------------------
# Block aggressive SEO / scraper bots
# -----------------------------------------------
User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

User-agent: MJ12bot
Disallow: /

User-agent: DotBot
Disallow: /

User-agent: BLEXBot
Disallow: /

User-agent: PetalBot
Disallow: /

User-agent: DataForSeoBot
Disallow: /

User-agent: Sogou
Disallow: /

User-agent: Yandex
Disallow: /

User-agent: MegaIndex.ru
Disallow: /

User-agent: BaiduSpider
Disallow: /

User-agent: Rogerbot
Disallow: /

User-agent: Exabot
Disallow: /

User-agent: Swiftbot
Disallow: /

User-agent: Seekport
Disallow: /

User-agent: ZoominfoBot
Disallow: /

User-agent: SeznamBot
Disallow: /

# -----------------------------------------------
# Sitemap
# -----------------------------------------------
Sitemap: ${sitemapUrl}

Host: ${baseUrl}
`;

  return new NextResponse(robotsTxt.trim() + '\n', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
}
