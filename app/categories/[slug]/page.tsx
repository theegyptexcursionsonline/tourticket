// app/categories/[slug]/page.tsx
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import TourModel from '@/lib/models/Tour';
import CategoryModel from '@/lib/models/Category';
import { Tour, Category } from '@/types';
import CategoryPageClient from './CategoryPageClient'; // We will create this client component

export async function generateStaticParams() {
  await dbConnect();
  const categories = await CategoryModel.find({}).select('slug').lean();
  return categories.map((category) => ({
    slug: category.slug,
  }));
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

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const { category, categoryTours } = await getPageData(params.slug);

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
