// app/admin/categories/CategoryManager.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Edit, Trash2, Loader2, X } from 'lucide-react';
import { ICategory } from '@/lib/models/Category';

// Helper to generate a slug from a name
const generateSlug = (name: string) => 
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export default function CategoryManager({ initialCategories }: { initialCategories: ICategory[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ICategory | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '' });

  const openModalForCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', slug: '' });
    setIsModalOpen(true);
  };

  const openModalForEdit = (category: ICategory) => {
    setEditingCategory(category);
    setFormData({ name: category.name, slug: category.slug });
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'name') {
      setFormData(prev => ({ ...prev, slug: generateSlug(value) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const apiEndpoint = editingCategory
      ? `/api/admin/categories/${editingCategory._id}`
      : '/api/admin/categories';
    const method = editingCategory ? 'PUT' : 'POST';

    try {
      const res = await fetch(apiEndpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        router.refresh(); // Re-fetches data from the server and updates the page
      } else {
        const errorData = await res.json();
        alert(`Failed to save category: ${errorData.error}`);
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
        const res = await fetch(`/api/admin/categories/${categoryId}`, { method: 'DELETE' });
        if (res.ok) {
            router.refresh();
        } else {
            alert('Failed to delete category.');
        }
    } catch (error) {
        alert('An error occurred during deletion.');
    }
  };
  
  const inputStyles = "block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm";

  return (
    <div>
      <div className="text-right mb-4">
        <button 
            onClick={openModalForCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors shadow-sm"
        >
          <PlusCircle className="h-4 w-4" />
          Create New Category
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-500">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3">Category Name</th>
              <th scope="col" className="px-6 py-3">Slug</th>
              <th scope="col" className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category._id} className="bg-white border-b hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{category.name}</td>
                <td className="px-6 py-4 font-mono text-xs">{category.slug}</td>
                <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openModalForEdit(category)} className="p-2 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-100"><Edit className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(category._id)} className="p-2 border border-red-200 bg-red-50 rounded-md text-red-600 hover:bg-red-100"><Trash2 className="h-4 w-4" /></button>
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editingCategory ? 'Edit Category' : 'Create New Category'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700">Name</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className={`mt-1 ${inputStyles}`} />
                </div>
                 <div>
                    <label htmlFor="slug" className="block text-sm font-medium text-slate-700">Slug</label>
                    <input type="text" name="slug" id="slug" value={formData.slug} onChange={handleInputChange} required className={`mt-1 ${inputStyles}`} />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="inline-flex justify-center px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-red-300">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Save'}
                    </button>
                </div>
            </form>
            <button onClick={() => setIsModalOpen(false)} className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:bg-slate-100"><X size={20}/></button>
          </div>
        </div>
      )}
    </div>
  );
}