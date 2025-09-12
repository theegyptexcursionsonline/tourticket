// app/admin/categories/page.tsx
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import { ICategory } from '@/lib/models/Category';
import CategoryManager from './CategoryManager'; // We will create this next

async function getCategories(): Promise<ICategory[]> {
  await dbConnect();
  const categories = await Category.find({}).sort({ name: 1 });
  return JSON.parse(JSON.stringify(categories));
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Categories</h2>
          <p className="text-sm text-slate-600">
            Group your tours into categories for better organization.
          </p>
        </div>
        {/* The "Create" button will be part of the client component */}
      </div>
      
      {/* Pass the server-fetched categories to the client component */}
      <CategoryManager initialCategories={categories} />
    </div>
  );
}