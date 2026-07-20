// Default attraction-page URL (/attraction/{slug}). Renders pages still on the
// default URL type; 301-redirects any whose admin-chosen URL type moved.
import { notFound, permanentRedirect } from 'next/navigation';
import { Metadata } from 'next';
import { decideForSegment } from '@/lib/content/resolveContentBySlug';
import { renderContentMatch, getContentMatchMetadata } from '@/lib/content/renderContentMatch';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const SEGMENT = 'attraction';

export const revalidate = 1800; // 30 min — storefront content; edge serves stale-while-revalidate so clicks stay instant
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const decision = await decideForSegment(slug, SEGMENT, locale);
  if (decision.action === 'render') {
    return (await getContentMatchMetadata(decision.match, locale)) || { title: 'Attraction Not Found' };
  }
  return { title: 'Attraction Not Found' };
}

export default async function AttractionPage({ params }: PageProps) {
  const { locale, slug } = await params;
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
