import { notFound, permanentRedirect } from 'next/navigation';
import { Metadata } from 'next';
import { decideForCityPath } from '@/lib/content/resolveContentBySlug';
import { renderContentMatch, getContentMatchMetadata } from '@/lib/content/renderContentMatch';

interface PageProps {
  params: Promise<{ locale: string; slug: string; child: string }>;
}

// City-nested detail URLs: /{city}/{slug}. Serves tours whose admin-selected
// URL type is `city` under their own destination's slug, and 301-redirects any
// other real tour slug to its canonical path (never a 404 for a guessed URL).

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: city, child, locale } = await params;
  const decision = await decideForCityPath(city, child, locale);
  if (decision.action === 'render') {
    return (await getContentMatchMetadata(decision.match, locale)) || { title: 'Not Found' };
  }
  return { title: 'Not Found' };
}

// Skip static generation at build time; render on-demand with ISR caching.
export async function generateStaticParams() {
  return [];
}

export default async function CityDetailPage({ params }: PageProps) {
  const { slug: city, child, locale } = await params;
  const decision = await decideForCityPath(city, child, locale);

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

export const revalidate = 1800; // 30 min — same policy as the root detail route
export const dynamicParams = true;
