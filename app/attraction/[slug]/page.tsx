import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AttractionPageTemplate from '@/components/AttractionPageTemplate';
import type { CategoryPageData } from '@/types';

interface AttractionPageProps {
  params: { slug: string };
}

async function getAttractionPage(slug: string): Promise<CategoryPageData | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/attraction-pages/${slug}`,
      {
        cache: 'no-store',
      }
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error fetching attraction page:', error);
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/attraction-pages`,
      {
        cache: 'no-store',
      }
    );
    
    if (!res.ok) return [];
    
    const data = await res.json();
    
    if (!data.success || !Array.isArray(data.data)) return [];
    
    return data.data
      .filter((page: any) => page.pageType === 'attraction' && page.isPublished)
      .map((page: any) => ({
        slug: page.slug,
      }));
  } catch (error) {
    console.error('Error generating static params for attractions:', error);
    return [];
  }
}

export async function generateMetadata({ params }: AttractionPageProps): Promise<Metadata> {
  const page = await getAttractionPage(params.slug);

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

export default async function AttractionPage({ params }: AttractionPageProps) {
  const page = await getAttractionPage(params.slug);

  if (!page) {
    notFound();
  }

  return (
    <>
      <Header startSolid />
      <AttractionPageTemplate page={page} urlType="attraction" />
      <Footer />
    </>
  );
}