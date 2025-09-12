// app/admin/categories/page.tsx
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import { ICategory } from '@/lib/models/Category';
import CategoryManager from './CategoryManager'; // client component

async function getCategories(): Promise<ICategory[]> {
  await dbConnect();
  const categories = await Category.find({}).sort({ name: 1 });
  return JSON.parse(JSON.stringify(categories));
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start justify-between gap-6 mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Categories</h2>
            <p className="mt-1 text-sm text-slate-500">
              Organize tours into categories for easier discovery and filtering.
            </p>
          </div>
        </div>

        <CategoryManager initialCategories={categories} />
      </div>
    </div>
  );
}
