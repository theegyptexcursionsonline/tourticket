// app/admin/categories/CategoryManager.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Edit, Trash2, Loader2, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { ICategory } from '@/lib/models/Category';

const generateSlug = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

type Props = { initialCategories: ICategory[] };

export default function CategoryManager({ initialCategories }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<ICategory[]>(initialCategories || []);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ICategory | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '' });
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setCategories(initialCategories || []);
  }, [initialCategories]);

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

  const validate = () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return false;
    }
    if (!formData.slug.trim()) {
      toast.error('Slug is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);

    const apiEndpoint = editingCategory ? `/api/admin/categories/${editingCategory._id}` : '/api/admin/categories';
    const method = editingCategory ? 'PUT' : 'POST';
    const payload = { name: formData.name.trim(), slug: formData.slug.trim() };

    // Optimistic UI: update local state immediately
    let optimisticId = '';
    try {
      if (!editingCategory) {
        optimisticId = `temp-${Date.now()}`;
        setCategories(prev => [{ _id: optimisticId, ...payload } as ICategory, ...prev]);
      } else {
        setCategories(prev => prev.map(c => (c._id === editingCategory._id ? ({ ...c, ...payload } as ICategory) : c)));
      }

      const res = await fetch(apiEndpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // rollback optimistic update
        if (!editingCategory) {
          setCategories(prev => prev.filter(c => c._id !== optimisticId));
        } else {
          // revert by reloading server data
          router.refresh();
        }
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.message || 'Failed to save');
      }

      const saved = await res.json();

      // Replace temp id with real id if created
      if (!editingCategory) {
        setCategories(prev => prev.map(c => (c._id === optimisticId ? saved.data : c)));
        toast.success('Category created');
      } else {
        toast.success('Category updated');
      }

      setIsModalOpen(false);
      setFormData({ name: '', slug: '' });
      setEditingCategory(null);
      // refresh server-side data if needed
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('Delete category? This will remove it from any linked tours.')) return;
    setDeletingId(categoryId);

    // optimistic remove
    const prev = categories;
    setCategories(prev => prev.filter(c => c._id !== categoryId));

    try {
      const res = await fetch(`/api/admin/categories/${categoryId}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error('Failed to delete category');
      }
      toast.success('Category deleted');
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error('Delete failed');
      setCategories(prev); // rollback
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase()));

  const inputStyles = "block w-full px-3 py-2 border border-slate-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 sm:text-sm";

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 w-full md:max-w-md">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full pl-3 pr-3 py-2 rounded-md border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>

        <div className="text-right">
          <button
            onClick={openModalForCreate}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors shadow"
          >
            <PlusCircle className="h-4 w-4" />
            Create Category
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-100">
        <table className="min-w-full text-sm text-left text-slate-600">
          <thead className="bg-slate-50 text-xs text-slate-700 uppercase">
            <tr>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">No categories found.</td>
              </tr>
            )}
            {filtered.map(cat => (
              <tr key={cat._id} className="bg-white border-t last:border-b hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{cat.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{cat.slug}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-2">
                    <button onClick={() => openModalForEdit(cat)} className="p-2 rounded-md border border-slate-200 hover:bg-slate-50">
                      <Edit className="h-4 w-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat._id)}
                      className="p-2 rounded-md border border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100"
                      disabled={deletingId === cat._id}
                    >
                      {deletingId === cat._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !isSubmitting && setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-100 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{editingCategory ? 'Edit Category' : 'Create Category'}</h3>
                <p className="text-xs text-slate-500 mt-1">Create a category to organize tours. Slug will be used in URLs.</p>
              </div>
              <button onClick={() => !isSubmitting && setIsModalOpen(false)} className="p-1 rounded-md text-slate-400 hover:bg-slate-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input name="name" value={formData.name} onChange={handleInputChange} className={inputStyles} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Slug</label>
                <input name="slug" value={formData.slug} onChange={handleInputChange} className={inputStyles} required />
                <p className="mt-1 text-xs text-slate-500">Only lowercase letters, numbers and hyphens allowed.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingCategory(null); }} className="px-3 py-2 rounded-md border bg-white text-slate-700">
                  Cancel
                </button>

                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 text-white font-semibold">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span>{isSubmitting ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
