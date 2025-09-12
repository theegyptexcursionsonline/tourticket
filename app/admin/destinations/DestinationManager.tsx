// app/admin/destinations/DestinationManager.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { PlusCircle, Edit, Trash2, Loader2, X, UploadCloud, Image as ImageIcon } from 'lucide-react';
import { IDestination } from '@/lib/models/Destination';

const generateSlug = (name: string) => 
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export default function DestinationManager({ initialDestinations }: { initialDestinations: IDestination[] }) {
  const router = useRouter();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingDestination, setEditingDestination] = useState<IDestination | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', image: '' });

  const openPanelForCreate = () => {
    setEditingDestination(null);
    setFormData({ name: '', slug: '', image: '' });
    setIsPanelOpen(true);
  };

  const openPanelForEdit = (dest: IDestination) => {
    setEditingDestination(dest);
    setFormData({ name: dest.name, slug: dest.slug, image: dest.image });
    setIsPanelOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'name') {
      setFormData(prev => ({ ...prev, slug: generateSlug(value) }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    
    const promise = fetch('/api/upload', { method: 'POST', body: uploadFormData })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFormData(prev => ({ ...prev, image: data.url }));
          return 'Image uploaded!';
        } else {
          throw new Error('Upload failed.');
        }
      });
    
    toast.promise(promise, {
      loading: 'Uploading image...',
      success: (message) => message,
      error: 'Upload failed. Please try again.',
    });
    
    setIsUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image) {
      toast.error('Please upload an image for the destination.');
      return;
    }
    setIsSubmitting(true);

    const apiEndpoint = editingDestination ? `/api/admin/destinations/${editingDestination._id}` : '/api/admin/destinations';
    const method = editingDestination ? 'PUT' : 'POST';

    const promise = fetch(apiEndpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)})
      .then(res => {
        if (!res.ok) throw new Error('Failed to save.');
        return res.json();
      });

    toast.promise(promise, {
      loading: 'Saving destination...',
      success: () => {
        setIsPanelOpen(false);
        router.refresh();
        return `Destination saved successfully!`;
      },
      error: 'Failed to save destination.',
    });

    setIsSubmitting(false);
  };

  const handleDelete = (destId: string, destName: string) => {
    const promise = fetch(`/api/admin/destinations/${destId}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete.');
        return res.json();
      });

    toast.promise(promise, {
        loading: `Deleting ${destName}...`,
        success: () => {
            router.refresh();
            return `${destName} deleted.`;
        },
        error: `Failed to delete ${destName}.`
    });
  };

  const inputStyles = "block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm";

  return (
    <div>
      <div className="flex justify-end">
        <button onClick={openPanelForCreate} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors shadow-sm">
          <PlusCircle className="h-5 w-5" />
          Add Destination
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {initialDestinations.map(dest => (
          <div key={dest._id} className="group relative overflow-hidden rounded-lg shadow-lg border border-slate-200 bg-white">
            <img src={dest.image} alt={dest.name} className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="p-4 absolute bottom-0 left-0 w-full">
              <h3 className="text-white text-lg font-bold">{dest.name}</h3>
              <p className="text-slate-300 text-xs font-mono">{dest.slug}</p>
            </div>
            <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openPanelForEdit(dest)} className="p-2 bg-white/80 backdrop-blur-sm rounded-md text-slate-700 hover:bg-white hover:text-red-600 shadow-sm"><Edit size={16} /></button>
              <button onClick={() => handleDelete(dest._id, dest.name)} className="p-2 bg-white/80 backdrop-blur-sm rounded-md text-slate-700 hover:bg-white hover:text-red-600 shadow-sm"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60"
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
            className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-50 z-50 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b bg-white">
              <h2 className="text-xl font-bold text-slate-800">{editingDestination ? 'Edit Destination' : 'Add New Destination'}</h2>
              <button onClick={() => setIsPanelOpen(false)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                    <label htmlFor="image" className="block text-sm font-semibold text-slate-700 mb-1.5">Destination Image</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
                        {formData.image ? (
                            <div className="relative group">
                                <img src={formData.image} alt="Preview" className="h-48 w-auto rounded-md object-contain" />
                                <button type="button" onClick={() => setFormData(p => ({...p, image: ''}))} className="absolute -top-2 -right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-1 text-center">
                                <ImageIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <div className="flex text-sm text-slate-600">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-red-600 hover:text-red-500 focus-within:outline-none">
                                        <span>Upload a file</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" disabled={isUploading} />
                                    </label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5">Name</label>
                    <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className={inputStyles} />
                </div>
                 <div>
                    <label htmlFor="slug" className="block text-sm font-semibold text-slate-700 mb-1.5">Slug</label>
                    <input type="text" name="slug" id="slug" value={formData.slug} onChange={handleInputChange} required className={inputStyles} />
                </div>
            </form>

            <div className="p-6 border-t bg-white mt-auto">
                <button type="submit" onClick={handleSubmit} disabled={isSubmitting || isUploading} className="w-full inline-flex justify-center items-center px-6 py-3 text-base font-bold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Save Destination'}
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}