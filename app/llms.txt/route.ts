// app/llms.txt/route.ts
// llms.txt — a curated, LLM-friendly index of the site (https://llmstxt.org).
// Lists the key sections, destinations, and recent articles as markdown links
// so AI assistants can discover and cite EEO content accurately.

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import DestinationModel from '@/lib/models/Destination';
import BlogModel from '@/lib/models/Blog';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { contentPath } from '@/lib/content/contentUrl';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const BASE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://egypt-excursionsonline.com';

export async function GET() {
  const lines: string[] = [
    '# Egypt Excursions Online',
    '',
    '> Book tours and excursions across Egypt and the Red Sea — Cairo, Hurghada, Luxor, Aswan, Sharm el-Sheikh and more. Day trips, Nile cruises, diving, snorkeling and desert safaris, most with hotel pickup.',
    '',
    '## Key pages',
    `- [Tours](${BASE}/tours): Browse and book all tours and excursions`,
    `- [Destinations](${BASE}/destinations): Egypt and Red Sea destinations`,
    `- [Blog](${BASE}/blog): Travel guides, tips and itineraries`,
    `- [About](${BASE}/about)`,
    `- [Contact](${BASE}/contact)`,
    '',
  ];

  try {
    await dbConnect();

    const dests = await DestinationModel.find(
      { isPublished: true, archivedAt: null, ...DEFAULT_TENANT_FILTER },
      { name: 1, slug: 1, urlType: 1, parentPage: 1 },
    )
      .limit(30)
      .lean();
    if (dests.length) {
      lines.push('## Destinations');
      for (const d of dests as Array<{ name?: string; slug?: string; urlType?: string; parentPage?: { slug?: string } | null }>) {
        if (d.slug) lines.push(`- [${d.name ?? d.slug}](${BASE}${contentPath('destination', d.slug, d.urlType, null, d.parentPage?.slug)})`);
      }
      lines.push('');
    }

    const posts = await BlogModel.find(
      { status: 'published', ...DEFAULT_TENANT_FILTER },
      { title: 1, slug: 1, excerpt: 1 },
    )
      .sort({ publishedAt: -1 })
      .limit(40)
      .lean();
    if (posts.length) {
      lines.push('## Recent articles');
      for (const p of posts as Array<{ title?: string; slug?: string; excerpt?: string }>) {
        if (!p.slug) continue;
        const ex = p.excerpt ? `: ${String(p.excerpt).replace(/\s+/g, ' ').slice(0, 140)}` : '';
        lines.push(`- [${p.title ?? p.slug}](${BASE}/blog/${p.slug})${ex}`);
      }
      lines.push('');
    }
  } catch {
    // Fall through with the static sections if the DB is unavailable.
  }

  lines.push('## More');
  lines.push(`- [XML sitemap](${BASE}/sitemap.xml)`);
  lines.push('');

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
