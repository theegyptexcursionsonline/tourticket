// app/admin/categories/CategoryManager.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { PlusCircle, Edit, Trash2, Loader2, X } from 'lucide-react';
import { ICategory } from '@/lib/models/Category';

const generateSlug = (name: string) => 
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export default function CategoryManager({ initialCategories }: { initialCategories: ICategory[] }) {
  const router = useRouter();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ICategory | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '' });

  const openPanelForCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', slug: '' });
    setIsPanelOpen(true);
  };

  const openPanelForEdit = (cat: ICategory) => {
    setEditingCategory(cat);
    setFormData({ name: cat.name, slug: cat.slug });
    setIsPanelOpen(true);
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

    // **FIX: Corrected the API endpoint to remove '/admin'**
    const apiEndpoint = editingCategory 
      ? `/api/categories/${editingCategory._id}` 
      : '/api/categories';
      
    const method = editingCategory ? 'PUT' : 'POST';

    try {
      const res = await fetch(apiEndpoint, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'An unknown server error occurred.' }));
        throw new Error(errorData.error || 'Failed to save category.');
      }

      toast.success('Category saved successfully!');
      setIsPanelOpen(false);
      router.refresh();
      
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (catId: string, catName: string) => {
    if (!confirm(`Are you sure you want to delete the category "${catName}"?`)) return;

    const toastId = toast.loading(`Deleting ${catName}...`);

    try {
      // **FIX: Corrected the API endpoint to remove '/admin'**
      const res = await fetch(`/api/categories/${catId}`, { method: 'DELETE' });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'An unknown server error occurred.' }));
        throw new Error(errorData.error || 'Failed to delete category.');
      }
      
      toast.success(`${catName} deleted.`, { id: toastId });
      router.refresh();

    } catch (err) {
      toast.error((err as Error).message, { id: toastId });
    }
  };
  
  const inputStyles = "block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manage Categories</h1>
          <p className="text-slate-500">Add, edit, or delete tour categories.</p>
        </div>
        <button onClick={openPanelForCreate} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors shadow-sm">
          <PlusCircle className="h-5 w-5" />
          Add Category
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <ul className="divide-y divide-slate-200">
            {initialCategories.map(cat => (
                <li key={cat._id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                    <div>
                        <p className="font-semibold text-slate-800">{cat.name}</p>
                        <p className="text-xs text-slate-500 font-mono">{cat.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => openPanelForEdit(cat)} className="p-2 text-slate-500 hover:text-blue-600 transition-colors"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(cat._id, cat.name)} className="p-2 text-slate-500 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                    </div>
                </li>
            ))}
        </ul>
      </div>

      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsPanelOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-slate-800">{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
              <button onClick={() => setIsPanelOpen(false)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5">Category Name</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className={inputStyles} />
                </div>
                 <div>
                    <label htmlFor="slug" className="block text-sm font-semibold text-slate-700 mb-1.5">URL Slug</label>
                    <input type="text" name="slug" id="slug" value={formData.slug} onChange={handleInputChange} required className={`${inputStyles} bg-slate-50`} />
                </div>
            </form>

            <div className="p-6 border-t bg-slate-50 mt-auto">
                <button type="submit" onClick={handleSubmit} disabled={isSubmitting} className="w-full inline-flex justify-center items-center px-6 py-3 text-base font-bold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Save Category'}
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}