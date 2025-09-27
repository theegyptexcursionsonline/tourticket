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

async function getInterestData(slug: string): Promise<InterestData | null> {
  try {
    console.log('Fetching interest data for slug:', slug);
    
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/interests/${slug}`,
      {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('Response status:', res.status);

    if (!res.ok) {
      console.error('Failed to fetch interest data:', res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    console.log('Interest API response:', data);
    
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

export async function generateStaticParams() {
  try {
    console.log('Generating static params for interests...');
    
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/interests`,
      {
        cache: 'no-store',
      }
    );
    
    if (!res.ok) {
      console.error('Failed to fetch interests for static generation:', res.status);
      return [];
    }
    
    const data = await res.json();
    
    if (!data.success || !Array.isArray(data.data)) {
      console.error('Invalid response format for static generation');
      return [];
    }
    
    const params = data.data
      .filter((interest: any) => interest.products > 0) // Only generate for interests with tours
      .map((interest: any) => ({
        slug: interest.slug,
      }));

    console.log('Generated static params:', params);
    return params;
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