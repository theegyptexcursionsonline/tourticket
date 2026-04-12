// app/robots.txt/route.ts
// Dynamic robots.txt generation — SEO-optimised, blocks AI scrapers & bad bots

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://egypt-excursionsonline.com';
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
Disallow: /admin
Disallow: /admin/*
Disallow: /api
Disallow: /api/*
Disallow: /user
Disallow: /user/*
Disallow: /checkout
Disallow: /checkout/*
Disallow: /cart
Disallow: /login
Disallow: /signup
Disallow: /forgot
Disallow: /forgot/*
Disallow: /profile
Disallow: /bookings
Disallow: /booking/verify
Disallow: /booking/verify/*
Disallow: /accept-invitation
Disallow: /accept-invitation/*
Disallow: /payment
Disallow: /payment/*
Disallow: /redirecting
Disallow: /sentry-example-page
Disallow: /_next
Disallow: /_next/*
Disallow: /coming-soon
Disallow: /maintenance
Disallow: /offline
Disallow: /showcase
Disallow: /showcase/*
Disallow: /showcase-v2
Crawl-delay: 1

# -----------------------------------------------
# Google — no crawl-delay (Google ignores it)
# -----------------------------------------------
User-agent: Googlebot
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /user
Disallow: /checkout
Disallow: /cart
Disallow: /login
Disallow: /signup
Disallow: /forgot
Disallow: /profile
Disallow: /bookings
Disallow: /booking/verify
Disallow: /accept-invitation
Disallow: /payment
Disallow: /redirecting
Disallow: /sentry-example-page
Disallow: /_next
Disallow: /coming-soon
Disallow: /maintenance
Disallow: /offline
Disallow: /showcase
Disallow: /showcase-v2

# -----------------------------------------------
# Googlebot-Image — allow image directories
# -----------------------------------------------
User-agent: Googlebot-Image
Allow: /images/
Allow: /uploads/
Allow: /static/
Disallow: /admin
Disallow: /api
Disallow: /_next

# -----------------------------------------------
# Bing
# -----------------------------------------------
User-agent: Bingbot
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /user
Disallow: /checkout
Disallow: /cart
Disallow: /login
Disallow: /signup
Disallow: /forgot
Disallow: /profile
Disallow: /bookings
Disallow: /booking/verify
Disallow: /accept-invitation
Disallow: /payment
Disallow: /redirecting
Disallow: /_next
Disallow: /coming-soon
Disallow: /maintenance
Disallow: /offline
Disallow: /showcase
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
