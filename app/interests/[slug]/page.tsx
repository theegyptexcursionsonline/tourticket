import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import InterestLandingPage from '@/components/InterestLandingPage';

interface InterestPageProps {
  params: { slug: string };
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

// Helper function to get the base URL
function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Browser environment
    return window.location.origin;
  }
  
  // Server environment
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  return 'http://localhost:3000';
}

async function getInterestData(slug: string): Promise<InterestData | null> {
  try {
    console.log('Fetching interest data for slug:', slug);
    
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/interests/${slug}`;
    
    console.log('Fetching from URL:', url);
    
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', res.status);

    if (!res.ok) {
      console.error('Failed to fetch interest data:', res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    console.log('Interest API response success:', !!data.success);
    
    if (!data.success) {
      console.error('API returned error:', data.error);
      return null;
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching interest data:', error);
    return null;
  }
}

// Make generateStaticParams more robust
export async function generateStaticParams() {
  try {
    console.log('Generating static params for interests...');
    
    // Return empty array for now to use ISR instead of SSG
    // This prevents build failures when API is not available during build
    return [];
  } catch (error) {
    console.error('Error generating static params for interests:', error);
    return [];
  }
}

export async function generateMetadata({ params }: InterestPageProps): Promise<Metadata> {
  const interest = await getInterestData(params.slug);

  if (!interest) {
    return {
      title: 'Interest Not Found',
      description: 'The requested interest could not be found.',
    };
  }

  return {
    title: `${interest.name} Tours in Egypt | Egypt Excursions Online`,
    description: `Discover the best ${interest.name.toLowerCase()} tours and experiences in Egypt. ${interest.totalTours} amazing tours available. Book your perfect adventure today!`,
    keywords: [
      interest.name, 
      'tours', 
      'Egypt', 
      'travel', 
      'excursions',
      'experiences',
      'adventure',
      'vacation',
      'holiday'
    ].join(', '),
    openGraph: {
      title: `${interest.name} Tours in Egypt`,
      description: `Discover the best ${interest.name.toLowerCase()} tours and experiences in Egypt.`,
      images: [interest.heroImage],
      type: 'website',
      url: `/interests/${params.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${interest.name} Tours in Egypt`,
      description: `Discover the best ${interest.name.toLowerCase()} tours and experiences in Egypt.`,
      images: [interest.heroImage],
    },
    alternates: {
      canonical: `/interests/${params.slug}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

// Make the page use ISR (Incremental Static Regeneration)
export const revalidate = 3600; // Revalidate every hour

export default async function InterestPage({ params }: InterestPageProps) {
  console.log('Interest page rendering with params:', params);
  
  const interest = await getInterestData(params.slug);

  console.log('Fetched interest data:', interest ? 'Success' : 'Failed');

  if (!interest) {
    console.log('Interest not found, showing 404');
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