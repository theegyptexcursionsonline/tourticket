import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AttractionPageTemplate from '@/components/AttractionPageTemplate';
import { CategoryPageData } from '@/types';
import dbConnect from '@/lib/dbConnect';
import AttractionPageModel from '@/lib/models/AttractionPage';
import Category from '@/lib/models/Category';
import { localizeEntityFields } from '@/lib/i18n/contentLocalization';

interface CategoryPageProps {
  params: Promise<{ locale: string; 'category-name': string }>;
}

// Fetch category page directly from database
async function getCategoryPage(categoryName: string, locale: string): Promise<CategoryPageData | null> {
  try {
    await dbConnect();
    
    const page = await AttractionPageModel.findOne({ 
      slug: categoryName, 
      pageType: 'category',
      isPublished: true 
    })
    .populate({
      path: 'categoryId',
      model: Category,
      select: 'name slug'
    })
    .lean();

    if (!page) {
      return null;
    }

    const serializedPage = JSON.parse(JSON.stringify(page));

    if (serializedPage.categoryId && typeof serializedPage.categoryId === 'object') {
      serializedPage.categoryId = localizeEntityFields(
        serializedPage.categoryId as Record<string, unknown>,
        locale,
        ['name', 'description', 'longDescription', 'metaTitle', 'metaDescription']
      );
    }

    return serializedPage;
  } catch (error) {
    console.error('Error fetching category page:', error);
    return null;
  }
}

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 60;
export const dynamicParams = true;

// Skip static generation at build time to avoid MongoDB connection issues on Netlify
// Pages will be generated on-demand with ISR caching
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const page = await getCategoryPage(resolvedParams['category-name'], resolvedParams.locale);

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
  const page = await getCategoryPage(resolvedParams['category-name'], resolvedParams.locale);

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
