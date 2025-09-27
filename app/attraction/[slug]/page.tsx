import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AttractionLandingPage from '@/components/AttractionLandingPage';
import type { CategoryPageData } from '@/types';

interface AttractionPageProps {
  params: Promise<{ slug: string }>;
}

// Helper function to get the base URL
function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  
  return 'http://localhost:3000';
}

async function getAttractionPage(slug: string): Promise<CategoryPageData | null> {
  try {
    console.log('Fetching attraction page for slug:', slug);
    
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/attraction-pages/${slug}`;
    
    console.log('Fetching from URL:', url);
    
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', res.status);

    if (!res.ok) {
      console.error('Failed to fetch attraction page:', res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    console.log('Attraction API response success:', !!data.success);
    
    if (!data.success) {
      console.error('API returned error:', data.error);
      return null;
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching attraction page:', error);
    return null;
  }
}

export async function generateStaticParams() {
  try {
    console.log('Generating static params for attractions...');
    
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/attraction-pages`, {
      cache: 'no-store',
    });
    
    if (!res.ok) {
      console.error('Failed to fetch attraction pages for static generation');
      return [];
    }
    
    const data = await res.json();
    
    if (!data.success || !Array.isArray(data.data)) {
      console.error('Invalid response format for static generation');
      return [];
    }
    
    const params = data.data
      .filter((page: any) => page.pageType === 'attraction' && page.isPublished)
      .map((page: any) => ({
        slug: page.slug,
      }));

    console.log('Generated static params for attractions:', params);
    return params;
  } catch (error) {
    console.error('Error generating static params for attractions:', error);
    return [];
  }
}

export async function generateMetadata({ params }: AttractionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getAttractionPage(slug);

  if (!page) {
    return {
      title: 'Attraction Not Found',
      description: 'The requested attraction could not be found.',
    };
  }

  return {
    title: page.metaTitle || `${page.title} | Egypt Excursions Online`,
    description: page.metaDescription || page.description,
    keywords: page.keywords?.join(', '),
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription || page.description,
      images: [page.heroImage],
      type: 'website',
      url: `/attraction/${page.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: page.metaTitle || page.title,
      description: page.metaDescription || page.description,
      images: [page.heroImage],
    },
    alternates: {
      canonical: `/attraction/${page.slug}`,
    },
    robots: {
      index: page.isPublished,
      follow: page.isPublished,
    },
  };
}

// Add ISR
export const revalidate = 3600; // Revalidate every hour

export default async function AttractionPage({ params }: AttractionPageProps) {
  const { slug } = await params;
  console.log('Attraction page rendering with params:', { slug });
  
  const page = await getAttractionPage(slug);

  console.log('Fetched attraction page:', page ? 'Success' : 'Failed');

  if (!page) {
    console.log('Attraction page not found, showing 404');
    notFound();
  }

  return (
    <>
      <Header startSolid />
      <AttractionLandingPage attraction={page} />
      <Footer />
    </>
  );
}