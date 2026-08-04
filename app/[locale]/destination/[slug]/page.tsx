import { notFound, permanentRedirect } from 'next/navigation';
import { Metadata } from 'next';
import { decideForSegment } from '@/lib/content/resolveContentBySlug';
import { renderContentMatch, getContentMatchMetadata } from '@/lib/content/renderContentMatch';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// Serves items an admin set to the singular "/destination/{slug}" URL type;
// anything else with this slug 301-redirects to its own canonical URL.
const SEGMENT = 'destination';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, locale } = await params;
  const decision = await decideForSegment(slug, SEGMENT, locale);
  if (decision.action === 'render') {
    return (await getContentMatchMetadata(decision.match, locale)) || { title: 'Not Found' };
  }
  return { title: 'Not Found' };
}

export async function generateStaticParams() {
  return [];
}

export default async function DestinationPrefixPage({ params }: PageProps) {
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
