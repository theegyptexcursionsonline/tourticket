// app/categories/[slug]/page.tsx
import { notFound, redirect } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import { Tour, Category } from '@/types';
import CategoryPageClient from './CategoryPageClient';

// Enable ISR with 60 second revalidation for instant page loads
export const revalidate = 60;
export const dynamicParams = true;

// Pre-generate static pages for all published categories
export async function generateStaticParams() {
  try {
    await dbConnect();
    
    const categories = await CategoryModel.find({ isPublished: true })
      .select('slug')
      .lean();

    return categories.map((cat) => ({
      slug: cat.slug,
    }));
  } catch (error) {
    console.error('Error generating static params for categories:', error);
    return [];
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    await dbConnect();
    
    const category = await CategoryModel.findOne({ slug })
      .select('name description heroImage metaTitle metaDescription keywords')
      .lean();

    if (!category) {
      return {
        title: 'Category Not Found',
        description: 'The category you are looking for does not exist.',
      };
    }

    return {
      title: category.metaTitle || `${category.name} Tours | Egypt Excursions Online`,
      description: category.metaDescription || category.description?.substring(0, 160) || `Explore ${category.name} tours and activities`,
      keywords: category.keywords?.join(', '),
      openGraph: {
        title: category.name,
        description: category.description?.substring(0, 160),
        images: category.heroImage ? [category.heroImage] : [],
        type: 'website',
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Category - Egypt Excursions Online',
      description: 'Explore our tour categories',
    };
  }
}

async function getPageData(slug: string) {
  await dbConnect();

  const category = await CategoryModel.findOne({ slug }).lean();
  if (!category) {
    return { category: null, categoryTours: [] };
  }

  const categoryTours = await TourModel.find({
    category: { $in: [category._id] },
    isPublished: true
  }).populate('destination').lean();
  
  const serializedCategory = JSON.parse(JSON.stringify(category));
  const serializedTours = JSON.parse(JSON.stringify(categoryTours));

  return { 
    category: serializedCategory, 
    categoryTours: serializedTours,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const { category, categoryTours } = await getPageData(resolvedParams.slug);

  if (!category) {
    notFound();
  }

  return (
    <CategoryPageClient
      category={category}
      categoryTours={categoryTours}
    />
  );
}
