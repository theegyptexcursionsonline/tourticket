import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AttractionPageTemplate from '@/components/AttractionPageTemplate';
import type { AttractionPage, CategoryPageData } from '@/types';

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

export async function generateMetadata({ params }: AttractionPageProps): Promise<Metadata> {
  const page = await getAttractionPage(params.slug);

  if (!page) {
    return {
      title: 'Page Not Found',
      description: 'The requested page could not be found.',
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
      canonical: `/attraction/${page.slug}`,
    },
  };
}

// Renamed to Page to avoid name collisions and follow Next.js convention
export default async function Page({ params }: AttractionPageProps) {
  const page = await getAttractionPage(params.slug);

  if (!page) {
    notFound();
  }

  return (
    <>
      <Header />
      <AttractionPageTemplate page={page as AttractionPage} urlType="attraction" />
      <Footer />
    </>
  );
}
