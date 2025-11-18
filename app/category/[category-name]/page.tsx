import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AttractionPageTemplate from '@/components/AttractionPageTemplate';
import { CategoryPageData } from '@/types';

interface CategoryPageProps {
  params: Promise<{ 'category-name': string }>;
}

async function getCategoryPage(categoryName: string): Promise<CategoryPageData | null> {
  try {
    // Try to find an attraction page that matches this category
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/attraction-pages/${categoryName}`, {
      next: { revalidate: 3600 } // Revalidate every hour
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error fetching category page:', error);
    return null;
  }
}

// NO CACHING - Real-time data from admin panel
export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const page = await getCategoryPage(resolvedParams['category-name']);

  if (!page) {
    return {
      title: 'Category Not Found',
      description: 'The requested category page could not be found.'
    };
  }

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || page.description,
    keywords: page.keywords?.join(', '),
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription || page.description,
      images: [page.heroImage],
      type: 'website',
    },
    alternates: {
      canonical: `/category/${page.slug}`,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const resolvedParams = await params;
  const page = await getCategoryPage(resolvedParams['category-name']);

  if (!page) {
    notFound();
  }

  return (
    <>
      <Header />
      <AttractionPageTemplate page={page} urlType="category" />
      <Footer />
    </>
  );
}