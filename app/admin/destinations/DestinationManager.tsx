// app/admin/destinations/DestinationManager.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Loader2, 
  X, 
  UploadCloud, 
  Image as ImageIcon,
  MapPin,
  Globe,
  Camera,
  Sparkles,
  Check,
  AlertCircle
} from 'lucide-react';
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
          return 'Image uploaded successfully!';
        } else {
          throw new Error('Upload failed.');
        }
      });

    toast.promise(promise, {
      loading: 'Uploading image...',
      success: (message) => message as string,
      error: 'Upload failed. Please try again.',
    }).finally(() => {
        setIsUploading(false)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.image) {
      toast.error('Please upload an image for the destination.');
      return;
    }
    setIsSubmitting(true);

    const apiEndpoint = editingDestination
      ? `/api/admin/tours/destinations/${editingDestination._id}`
      : '/api/admin/tours/destinations';

    const method = editingDestination ? 'PUT' : 'POST';

    const promise = fetch(apiEndpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)})
      .then(async res => {
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to save.');
        }
        return res.json();
      });

    toast.promise(promise, {
      loading: 'Saving destination...',
      success: () => {
        setIsPanelOpen(false);
        router.refresh();
        return `Destination saved successfully!`;
      },
      error: (err) => err.message || 'Failed to save destination.',
    }).finally(() => {
        setIsSubmitting(false)
    });
  };

  const handleDelete = (destId: string, destName: string) => {
    const promise = fetch(`/api/admin/tours/destinations/${destId}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete.');
        return res.json();
      });

    toast.promise(promise, {
        loading: `Deleting ${destName}...`,
        success: () => {
            router.refresh();
            return `${destName} deleted successfully.`;
        },
        error: `Failed to delete ${destName}.`
    });
  };

  const inputStyles = "block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm disabled:bg-slate-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-slate-700";

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <Globe className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Destination Manager
              </h1>
              <p className="text-slate-500 mt-1">
                Manage your tour destinations and locations
              </p>
            </div>
          </div>
          
          <button 
            onClick={openPanelForCreate} 
            className="group inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            <PlusCircle className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
            Add Destination
          </button>
        </div>

        {/* Stats */}
        <div className="mt-6 pt-6 border-t border-slate-200/60">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 text-indigo-500" />
            <span className="font-medium">{initialDestinations.length}</span>
            <span>destination{initialDestinations.length !== 1 ? 's' : ''} available</span>
          </div>
        </div>
      </div>

      {/* Destinations Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {initialDestinations.map((dest, index) => (
          <motion.div 
            key={dest._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white border border-slate-200/60"
          >
            {/* Image Container */}
            <div className="relative h-56 overflow-hidden">
              <img 
                src={dest.image} 
                alt={dest.name} 
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
              
              {/* Action Buttons */}
              <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <button 
                  onClick={() => openPanelForEdit(dest)} 
                  className="flex items-center justify-center w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl text-slate-700 hover:bg-white hover:text-indigo-600 shadow-lg transition-all duration-200 transform hover:scale-110"
                  title="Edit destination"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(dest._id, dest.name)} 
                  className="flex items-center justify-center w-10 h-10 bg-white/90 backdrop-blur-sm rounded-xl text-slate-700 hover:bg-white hover:text-red-600 shadow-lg transition-all duration-200 transform hover:scale-110"
                  title="Delete destination"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Status Badge */}
              <div className="absolute top-3 left-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/90 backdrop-blur-sm rounded-full text-white text-xs font-semibold shadow-lg">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  Active
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors duration-200">
                    {dest.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Globe className="h-4 w-4 text-slate-400" />
                    <p className="text-slate-500 text-sm font-mono truncate">/{dest.slug}</p>
                  </div>
                </div>
                
                {/* Visual Indicator */}
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg">
                  <MapPin className="h-4 w-4 text-indigo-600" />
                </div>
              </div>
            </div>

            {/* Hover Effect Border */}
            <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-indigo-200 transition-all duration-300 pointer-events-none"></div>
          </motion.div>
        ))}

        {/* Empty State */}
        {initialDestinations.length === 0 && (
          <div className="col-span-full">
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center">
                <MapPin className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-3">No destinations yet</h3>
              <p className="text-slate-500 max-w-md mx-auto mb-6">
                Create your first destination to start organizing your tours by location.
              </p>
              <button 
                onClick={openPanelForCreate}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <PlusCircle className="h-5 w-5" />
                Add First Destination
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Backdrop Overlay */}
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

      {/* Enhanced Slide Panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between p-8 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-sm">
                  {editingDestination ? <Edit className="h-5 w-5 text-white" /> : <PlusCircle className="h-5 w-5 text-white" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingDestination ? 'Edit Destination' : 'Add New Destination'}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {editingDestination ? 'Update destination details' : 'Create a new travel destination'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsPanelOpen(false)} 
                className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all duration-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="p-8 space-y-8">
                {/* Image Upload Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-indigo-500" />
                    <label className="text-sm font-bold text-slate-700">Destination Image</label>
                    <span className="text-red-500 text-sm">*</span>
                  </div>
                  
                  <div className="relative">
                    {formData.image ? (
                      <div className="group relative overflow-hidden rounded-2xl border-2 border-slate-200">
                        <img 
                          src={formData.image} 
                          alt="Preview" 
                          className="w-full h-64 object-cover" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <button 
                            type="button" 
                            onClick={() => setFormData(p => ({...p, image: ''}))} 
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors duration-200"
                          >
                            <Trash2 size={16} />
                            Remove Image
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-200">
                        <div className="space-y-4">
                          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl">
                            <UploadCloud className="h-8 w-8 text-indigo-600" />
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-center">
                              <label 
                                htmlFor="file-upload" 
                                className="relative cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
                              >
                                <span>Upload Image</span>
                                <input 
                                  id="file-upload" 
                                  name="file-upload" 
                                  type="file" 
                                  className="sr-only" 
                                  onChange={handleImageUpload} 
                                  accept="image/*" 
                                  disabled={isUploading} 
                                />
                              </label>
                            </div>
                            <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
                            {isUploading && (
                              <div className="flex items-center justify-center gap-2 text-indigo-600">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm font-medium">Uploading...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Name Field */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    <label htmlFor="name" className="text-sm font-bold text-slate-700">Destination Name</label>
                    <span className="text-red-500 text-sm">*</span>
                  </div>
                  <input 
                    type="text" 
                    name="name" 
                    id="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    placeholder="e.g., Amsterdam, Paris, Tokyo"
                    required 
                    className={inputStyles} 
                  />
                  <p className="text-xs text-slate-500">Enter the full name of the destination</p>
                </div>

                {/* Slug Field */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-indigo-500" />
                    <label htmlFor="slug" className="text-sm font-bold text-slate-700">URL Slug</label>
                    <span className="text-red-500 text-sm">*</span>
                  </div>
                  <div className="relative">
                    <input 
                      type="text" 
                      name="slug" 
                      id="slug" 
                      value={formData.slug} 
                      onChange={handleInputChange} 
                      placeholder="auto-generated-from-name"
                      required 
                      className={`${inputStyles} pr-20`} 
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 px-2 py-1 bg-slate-100 rounded-lg border border-slate-200">
                      /{formData.slug || 'slug'}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">Auto-generated URL-friendly version (lowercase, hyphens)</p>
                </div>
              </div>
            </form>

            {/* Panel Footer */}
            <div className="p-8 border-t border-slate-200 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsPanelOpen(false)}
                  className="flex-1 px-6 py-3 text-slate-700 font-semibold border border-slate-300 rounded-xl hover:bg-slate-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || isUploading || !formData.name || !formData.image} 
                  className="flex-1 inline-flex justify-center items-center gap-3 px-6 py-3 text-white font-bold bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 disabled:transform-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      <span>Save Destination</span>
                    </>
                  )}
                </button>
              </div>
              
              {/* Validation Message */}
              {(!formData.name || !formData.image) && (
                <div className="flex items-center gap-2 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <p className="text-xs text-amber-700">
                    Please fill in all required fields and upload an image.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}