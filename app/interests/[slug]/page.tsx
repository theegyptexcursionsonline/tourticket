import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import InterestLandingPage from '@/components/InterestLandingPage';

// Types
interface InterestPageProps {
  params: Promise<{ slug: string }>;
}

interface InterestData {
  name: string;
  slug: string;
  description: string;
  longDescription?: string;
  category?: any;
  tours: any[];
  totalTours: number;
  reviews: any[];
  relatedCategories: any[];
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

// Helper function to get base URL
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  return 'http://localhost:3000';
}

// Fetch interest data
async function getInterestData(slug: string): Promise<InterestData | null> {
  try {
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/interests/${slug}`;
    
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      console.error('Failed to fetch interest data:', res.status);
      return null;
    }

    const data = await res.json();
    
    if (!data.success || !data.data) {
      console.error('Invalid API response');
      return null;
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching interest data:', error);
    return null;
  }
}

// Use dynamic rendering to avoid build timeouts
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

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
    description: `Discover the best ${interest.name.toLowerCase()} tours and experiences in Egypt. ${interest.totalTours} amazing tours available.`,
    keywords: [interest.name, 'tours', 'Egypt', 'travel'].join(', '),
    openGraph: {
      title: `${interest.name} Tours in Egypt`,
      description: `Discover the best ${interest.name.toLowerCase()} tours.`,
      images: [interest.heroImage],
      type: 'website',
    },
    alternates: {
      canonical: `/interests/${resolvedParams.slug}`,
    },
  };
}

// Main page component
export default async function Page(props: InterestPageProps) {
  const params = await props.params;
  const interest = await getInterestData(params.slug);

  if (!interest) {
    notFound();
  }

  return (
    <>
      <Header startSolid />
      <InterestLandingPage interest={interest} />
      <Footer />
    </>
  );
}