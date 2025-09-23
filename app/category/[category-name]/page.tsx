import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AttractionPageTemplate from '@/components/AttractionPageTemplate';
import { CategoryPageData } from '@/types';

interface CategoryPageProps {
  params: { 'category-name': string };
}

async function getCategoryPage(categoryName: string): Promise<CategoryPageData | null> {
  try {
    // Try to find an attraction page that matches this category
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/attraction-pages/${categoryName}`, {
      cache: 'no-store'
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

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const page = await getCategoryPage(params['category-name']);

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
  const page = await getCategoryPage(params['category-name']);

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