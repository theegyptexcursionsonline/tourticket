import { notFound, permanentRedirect } from 'next/navigation';
import { Metadata } from 'next';
import { decideForSegment } from '@/lib/content/resolveContentBySlug';
import { renderContentMatch, getContentMatchMetadata } from '@/lib/content/renderContentMatch';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// Root-level detail URLs: /{slug}. Historically tours only; now also serves any
// destination/category an admin has switched to the "direct" URL type, and
// 301-redirects items that have moved to a prefixed URL type.
const SEGMENT = '';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const decision = await decideForSegment(slug, SEGMENT, locale);
  if (decision.action === 'render') {
    return (await getContentMatchMetadata(decision.match, locale)) || { title: 'Not Found' };
  }
  return { title: 'Not Found' };
}

// Skip static generation at build time; render on-demand with ISR caching.
export async function generateStaticParams() {
  return [];
}

export default async function RootDetailPage({ params }: PageProps) {
  const { slug, locale } = await params;
  const decision = await decideForSegment(slug, SEGMENT, locale);

  if (decision.action === 'redirect') {
    permanentRedirect(decision.to);
  }
  if (decision.action === 'notFound') {
    notFound();
  }

  const element = await renderContentMatch(decision.match, locale);
  if (!element) notFound();
  return element;
}

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
