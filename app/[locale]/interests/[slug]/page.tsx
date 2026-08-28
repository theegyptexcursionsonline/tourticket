import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import type { Category as CategoryData, Review, Tour } from '@/types';
import { contentPath, localizedContentPath } from '@/lib/content/contentUrl';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { PUBLIC_CONTENT_FILTER } from '@/lib/content/publicContentFilter';
import { explicitContentLocales, metadataAlternates } from '@/lib/i18n/seoAlternates';

// Types
interface InterestPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

interface InterestData {
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  category?: CategoryData;
  tours: Tour[];
  totalTours: number;
  reviews: Review[];
  relatedCategories: CategoryData[];
  heroImage: string;
  type?: string;
  highlights: string[];
  features: string[];
  stats: {
    totalTours: number;
    totalReviews: number;
    averageRating: string;
    happyCustomers: number;
  };
}

// Fetch interest data directly from database (faster!)
async function getInterestData(slug: string): Promise<InterestData | null> {
  try {
    await dbConnect();
    
    // The API uses /api/interests/${slug} which returns data from Category or AttractionPage
    // Let's fetch directly from database instead
    const category = await Category.findOne({
      slug,
      ...DEFAULT_TENANT_FILTER,
      ...PUBLIC_CONTENT_FILTER,
    }).lean();
    
    if (category) {
      // Return category-based interest data
      const serialized = JSON.parse(JSON.stringify(category));
      return {
        name: serialized.name,
        slug: serialized.slug,
        description: serialized.description || '',
        longDescription: serialized.longDescription,
        category: serialized,
        tours: [], // Will be fetched by InterestLandingPage component
        totalTours: 0,
        reviews: [],
        relatedCategories: [],
        heroImage: serialized.heroImage || '',
        type: 'category',
        highlights: serialized.highlights || [],
        features: serialized.features || [],
        stats: {
          totalTours: 0,
          totalReviews: 0,
          averageRating: '0',
          happyCustomers: 0,
        },
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching interest data:', error);
    return null;
  }
}

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 1800; // 30 min — storefront content; edge serves stale-while-revalidate so clicks stay instant
export const dynamicParams = true;

// Skip static generation at build time to avoid MongoDB connection issues on Netlify
// Pages will be generated on-demand with ISR caching
export async function generateStaticParams() {
  return [];
}

// Generate metadata
export async function generateMetadata(
  { params }: InterestPageProps
): Promise<Metadata> {
  const resolvedParams = await params;
  const interest = await getInterestData(resolvedParams.slug);

  if (!interest) {
    return {
      title: 'Interest Not Found',
      description: 'The requested interest could not be found.',
    };
  }

  return {
    title: `${interest.name} Tours in Egypt | Egypt Excursions Online`,
    description: interest.description || `Explore ${interest.name} tours and experiences in Egypt.`,
    keywords: [interest.name, 'tours', 'Egypt', 'travel'].join(', '),
    openGraph: {
      title: `${interest.name} Tours in Egypt`,
      description: `Discover the best ${interest.name.toLowerCase()} tours.`,
      images: [interest.heroImage],
      type: 'website',
    },
    alternates: metadataAlternates(
      resolvedParams.locale,
      contentPath(
        'category',
        interest.slug,
        interest.category?.urlType,
        undefined,
        interest.category?.parentPage?.slug,
      ),
      explicitContentLocales(interest.category || {}, ['name', 'description']),
    ),
  };
}

// Main page component
export default async function Page(props: InterestPageProps) {
  const params = await props.params;
  const interest = await getInterestData(params.slug);

  if (!interest) {
    notFound();
  }

  permanentRedirect(
    localizedContentPath(
      'category',
      interest.slug,
      interest.category?.urlType,
      params.locale,
      undefined,
      interest.category?.parentPage?.slug,
    ),
  );
}
