'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { PlusCircle, Edit, Trash2, Loader2, X, Tag } from 'lucide-react';
import { ICategory } from '@/lib/models/Category';

// Helper function to generate a URL-safe slug
const generateSlug = (name: string) => 
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

// Helper component for the section card
const SectionCard = ({ children, title, subtitle, icon: Icon }: {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    icon?: any;
}) => (
    <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/60">
        <div className="flex items-center gap-3 mb-6">
            {Icon && (
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                    <Icon className="h-5 w-5 text-white" />
                </div>
            )}
            <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                    {title}
                </h3>
                {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
            </div>
        </div>
        {children}
    </div>
);

export default function CategoryManager({ initialCategories }: { initialCategories: ICategory[] }) {
    const router = useRouter();
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [editingCategory, setEditingCategory] = useState<ICategory | null>(null);
    const [formData, setFormData] = useState({ name: '', slug: '' });
    const [categories, setCategories] = useState(initialCategories);

    useEffect(() => {
        setCategories(initialCategories);
    }, [initialCategories]);

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

    const closePanel = () => {
        setIsPanelOpen(false);
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

        // Client-side validation
        if (!formData.name.trim() || !formData.slug.trim()) {
            toast.error('Category name and slug are required.');
            setIsSubmitting(false);
            return;
        }

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

            const message = editingCategory ? 'Category updated successfully!' : 'Category added successfully!';
            toast.success(message);
            closePanel();
            router.refresh();
            
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (catId: string, catName: string) => {
        setIsDeleting(catId);
        const toastId = toast.loading(`Deleting "${catName}"...`);

        try {
            const res = await fetch(`/api/categories/${catId}`, { method: 'DELETE' });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'An unknown server error occurred.' }));
                throw new Error(errorData.error || 'Failed to delete category.');
            }
            
            toast.success(`"${catName}" deleted.`, { id: toastId });
            router.refresh();
        } catch (err) {
            toast.error((err as Error).message, { id: toastId });
        } finally {
            setIsDeleting(null);
        }
    };

    const inputStyles = "block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm transition-all duration-200 font-medium text-slate-700 disabled:bg-slate-50";

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                        Manage Categories
                    </h1>
                    <p className="text-slate-500 mt-1">Add, edit, or delete tour categories.</p>
                </div>
                <button 
                    onClick={openPanelForCreate} 
                    className="group inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                    <PlusCircle className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
                    Add Category
                </button>
            </div>

            <div className="bg-white shadow-md rounded-2xl overflow-hidden border border-slate-200/60">
                <ul className="divide-y divide-slate-200">
                    {categories.length > 0 ? (
                        categories.map(cat => (
                            <motion.li 
                                key={cat._id} 
                                className="p-4 flex flex-col sm:flex-row justify-between items-center sm:items-center gap-4 hover:bg-slate-50 transition-colors duration-150"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="flex-1">
                                    <p className="font-semibold text-lg text-slate-800">{cat.name}</p>
                                    <p className="text-sm text-slate-500 font-mono mt-1">/{cat.slug}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => openPanelForEdit(cat)} 
                                        className="p-2 text-slate-500 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
                                        aria-label={`Edit ${cat.name}`}
                                    >
                                        <Edit size={20} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(cat._id, cat.name)} 
                                        disabled={isDeleting === cat._id}
                                        className="p-2 text-slate-500 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label={`Delete ${cat.name}`}
                                    >
                                        {isDeleting === cat._id ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : (
                                            <Trash2 size={20} />
                                        )}
                                    </button>
                                </div>
                            </motion.li>
                        ))
                    ) : (
                        <li className="p-8 text-center text-slate-500">
                            No categories found. Click 'Add Category' to create one.
                        </li>
                    )}
                </ul>
            </div>

            <AnimatePresence>
                {isPanelOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        onClick={closePanel}
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
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm">
                                    {editingCategory ? <Edit className="h-5 w-5 text-white" /> : <PlusCircle className="h-5 w-5 text-white" />}
                                </div>
                                <h2 className="text-xl font-bold text-slate-800">{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
                            </div>
                            <button 
                                onClick={closePanel} 
                                className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        {/* The form has been moved inside the motion div */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5">Category Name</label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    id="name" 
                                    value={formData.name} 
                                    onChange={handleInputChange} 
                                    required 
                                    className={inputStyles} 
                                />
                            </div>
                            <div>
                                <label htmlFor="slug" className="block text-sm font-semibold text-slate-700 mb-1.5">URL Slug</label>
                                <input 
                                    type="text" 
                                    name="slug" 
                                    id="slug" 
                                    value={formData.slug} 
                                    onChange={handleInputChange} 
                                    required 
                                    className={`${inputStyles} bg-slate-50`} 
                                />
                            </div>
                            
                            <div className="mt-8 p-6 border border-slate-200 rounded-xl">
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting} 
                                    className="w-full inline-flex justify-center items-center gap-3 px-6 py-3 text-base font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            <span>Saving...</span>
                                        </>
                                    ) : (
                                        <span>Save Category</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
