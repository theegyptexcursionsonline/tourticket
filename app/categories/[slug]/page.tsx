// app/categories/[slug]/page.tsx
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import { Tour, Category } from '@/types';
import CategoryPageClient from './CategoryPageClient'; // We will create this client component

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const dynamicParams = true;

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
