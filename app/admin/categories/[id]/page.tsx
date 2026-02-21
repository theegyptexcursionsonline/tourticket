// app/categories/[slug]/page.tsx
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';

export default async function CategoryPage({ params }: { params: { slug: string } }) {
  await dbConnect();
  
  const category = await Category.findOne({ slug: params.slug });
  if (!category) {
    notFound();
  }

  const tours = await Tour.find({ category: { $in: [category._id] } })
    .populate('destination')
    .lean();

  return (
    <div>
      <h1>{category.name} Tours</h1>
      {/* Render tours */}
    </div>
  );
}