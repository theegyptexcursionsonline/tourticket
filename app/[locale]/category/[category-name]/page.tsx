import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import AttractionPageModel from '@/lib/models/AttractionPage';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { attractionPagePath, normalizeUrlType } from '@/lib/content/contentUrl';
import { defaultLocale } from '@/i18n/config';
import {
  renderCataloguePage,
  getCataloguePageMetadata,
} from './CataloguePageContent';

interface CategoryPageProps {
  params: Promise<{ locale: string; 'category-name': string }>;
}

// A catalogue page whose admin moved it to another URL shape must 301 off the
// historical /category path to its canonical one (mirrors the attraction and
// category routes' urlType mechanics).
async function canonicalRedirectTarget(slug: string, locale: string): Promise<string | null> {
  await dbConnect();
  const page = await AttractionPageModel.findOne({
    slug,
    pageType: 'category',
    ...DEFAULT_TENANT_FILTER,
  }).select('slug urlType cityDestination').populate('cityDestination', 'slug').lean() as {
    urlType?: string;
    cityDestination?: { slug?: string } | null;
  } | null;

  if (!page || normalizeUrlType(page.urlType) === 'default') return null;
  const path = attractionPagePath(slug, 'category', page.urlType, page.cityDestination?.slug);
  return locale && locale !== defaultLocale ? `/${locale}${path}` : path;
}

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 1800; // 30 min — storefront content; edge serves stale-while-revalidate so clicks stay instant
export const dynamicParams = true;

// Skip static generation at build time to avoid MongoDB connection issues on Netlify
// Pages will be generated on-demand with ISR caching
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const metadata = await getCataloguePageMetadata(resolvedParams['category-name'], resolvedParams.locale);

  if (!metadata) {
    return {
      title: 'Category Not Found',
      description: 'The requested category page could not be found.'
    };
  }
  return metadata;
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams['category-name'];

  const target = await canonicalRedirectTarget(slug, resolvedParams.locale);
  if (target) {
    permanentRedirect(target);
  }

  const element = await renderCataloguePage(slug, resolvedParams.locale);
  if (!element) {
    notFound();
  }
  return element;
}
