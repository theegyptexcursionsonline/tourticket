// app/admin/tours/TourForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2, XCircle, ChevronDown, X } from 'lucide-react';

// Define types for fetched data
interface Category {
  _id: string;
  name: string;
}

interface Destination {
  _id: string;
  name: string;
}

// Reusable Label component
const FormLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{children}</label>
);

export default function TourForm({ tourToEdit }: { tourToEdit?: any }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: tourToEdit?.title || '',
    slug: tourToEdit?.slug || '',
    description: tourToEdit?.description || '',
    longDescription: tourToEdit?.longDescription || '',
    duration: tourToEdit?.duration || '',
    discountPrice: tourToEdit?.discountPrice || '',
    originalPrice: tourToEdit?.originalPrice || '',
    destination: tourToEdit?.destination?._id || '',
    // Use the first category ID if it exists
    categories: tourToEdit?.categories?.[0]?._id ? [tourToEdit.categories[0]._id] : [],
    image: tourToEdit?.image || '',
    images: tourToEdit?.images || [],
    highlights: tourToEdit?.highlights?.length > 0 ? tourToEdit.highlights : [''],
    includes: tourToEdit?.includes?.length > 0 ? tourToEdit.includes : [''],
    tags: tourToEdit?.tags?.join(', ') || '',
    isFeatured: tourToEdit?.isFeatured || false,
  });

  // State to hold the lists of destinations and categories
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // NEW: Fetch destinations and categories when the component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [destRes, catRes] = await Promise.all([
          fetch('/api/admin/destinations'),
          fetch('/api/admin/categories')
        ]);
        const destData = await destRes.json();
        const catData = await catRes.json();
        if (destData.success) setDestinations(destData.data);
        if (catData.success) setCategories(catData.data);
      } catch (error) {
        toast.error("Failed to load destinations or categories.");
      }
    };
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({...prev, [name]: checked}));
        return;
    }

    if (name === 'categories') {
      // For simplicity, we're handling a single category selection
      setFormData(prev => ({ ...prev, [name]: [value] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (name === 'title') {
      setFormData(prev => ({
        ...prev,
        slug: value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      }));
    }
  };

  const handleListChange = (index: number, value: string, field: 'highlights' | 'includes') => {
    const updatedList = [...formData[field]];
    updatedList[index] = value;
    setFormData(prev => ({ ...prev, [field]: updatedList }));
  };

  const addListItem = (field: 'highlights' | 'includes') => {
    setFormData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };
  
  const removeListItem = (index: number, field: 'highlights' | 'includes') => {
    if (formData[field].length <= 1) return;
    setFormData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isMainImage = true) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    const promise = fetch('/api/upload', { method: 'POST', body: uploadFormData })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (isMainImage) {
            setFormData(prev => ({ ...prev, image: data.url }));
          } else {
            setFormData(prev => ({ ...prev, images: [...prev.images, data.url] }));
          }
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
  
  const removeGalleryImage = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter(url => url !== imageUrl) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const apiEndpoint = tourToEdit ? `/api/admin/tours/${tourToEdit._id}` : '/api/admin/tours';
    const method = tourToEdit ? 'PUT' : 'POST';

    const payload = {
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
    };

    try {
      const res = await fetch(apiEndpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success('Tour saved successfully!');
        router.push('/admin/tours');
        router.refresh();
      } else {
        const errorData = await res.json();
        // The alert you saw came from here. We'll replace it with a toast.
        toast.error(`Failed to save tour: ${errorData.error}`);
      }
    } catch (error) {
      console.error(error);
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const inputStyles = "block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 sm:text-sm disabled:bg-slate-50 disabled:cursor-not-allowed";
  
  // --- JSX Rendering ---
  
  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
      <div className="space-y-8">
        {/* ... (Other form sections are the same) ... */}
        <div className="space-y-4">
            {/* ... (title, slug, description, longDescription...) ... */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <FormLabel>Tour Title</FormLabel>
                  <input name="title" placeholder="e.g., 1-Hour Amsterdam Canal Cruise" value={formData.title} onChange={handleChange} required className={inputStyles} />
                </div>
                <div>
                  <FormLabel>URL Slug</FormLabel>
                  <input name="slug" placeholder="auto-generated-from-title" value={formData.slug} onChange={handleChange} required className={inputStyles} />
                </div>
              </div>
        </div>
        
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <FormLabel>Duration</FormLabel>
                    <input name="duration" placeholder="e.g., 6 hours" value={formData.duration} onChange={handleChange} required className={inputStyles} />
                </div>
                <div>
                    <FormLabel>Discount Price (€)</FormLabel>
                    <input name="discountPrice" type="number" step="0.01" placeholder="15.50" value={formData.discountPrice} onChange={handleChange} required className={inputStyles} />
                </div>
                <div>
                    <FormLabel>Original Price (€) (Optional)</FormLabel>
                    <input name="originalPrice" type="number" step="0.01" placeholder="20.00" value={formData.originalPrice} onChange={handleChange} className={inputStyles} />
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <FormLabel>Destination</FormLabel>
                    <div className="relative">
                        {/* UPDATED: Dropdown now uses real data */}
                        <select name="destination" value={formData.destination} onChange={handleChange} required className={`${inputStyles} appearance-none pr-8`}>
                            <option value="">Select a Destination</option>
                            {destinations.map(d => (
                                <option key={d._id} value={d._id}>{d.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                <div>
                    <FormLabel>Category</FormLabel>
                     <div className="relative">
                        {/* UPDATED: Dropdown now uses real data */}
                        <select name="categories" value={formData.categories[0] || ''} onChange={handleChange} required className={`${inputStyles} appearance-none pr-8`}>
                           <option value="">Select a Category</option>
                           {categories.map(c => (
                               <option key={c._id} value={c._id}>{c.name}</option>
                           ))}
                        </select>
                         <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                </div>
           </div>
           <div>
                <FormLabel>Tags</FormLabel>
                <input name="tags" placeholder="e.g., Staff Favourite, -25%, New" value={formData.tags} onChange={handleChange} className={inputStyles} />
           </div>
        </div>
        
        {/* ... (highlights, includes, and image upload sections are the same) ... */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
                <FormLabel>Highlights</FormLabel>
                {formData.highlights.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <input value={item} onChange={(e) => handleListChange(index, e.target.value, 'highlights')} className={inputStyles} />
                        <button type="button" onClick={() => removeListItem(index, 'highlights')} className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50" disabled={formData.highlights.length <= 1}><XCircle size={18}/></button>
                    </div>
                ))}
                <button type="button" onClick={() => addListItem('highlights')} className="px-3 py-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm">Add Highlight</button>
            </div>
            <div className="space-y-2">
                <FormLabel>What's Included</FormLabel>
                {formData.includes.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <input value={item} onChange={(e) => handleListChange(index, e.target.value, 'includes')} className={inputStyles} />
                        <button type="button" onClick={() => removeListItem(index, 'includes')} className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50" disabled={formData.includes.length <= 1}><XCircle size={18}/></button>
                    </div>
                ))}
                <button type="button" onClick={() => addListItem('includes')} className="px-3 py-1.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm">Add Item</button>
            </div>
        </div>
        <div className="space-y-6">
            <div>
              <FormLabel>Main Image</FormLabel>
              <div className="flex items-center gap-4">
                 <input type="file" onChange={(e) => handleImageUpload(e, true)} disabled={isUploading} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"/>
                {isUploading && <Loader2 className="animate-spin text-slate-500" />}
              </div>
              {formData.image && <img src={formData.image} alt="Main preview" className="mt-4 h-32 w-auto rounded-md shadow-sm" />}
            </div>
            <div>
              <FormLabel>Gallery Images</FormLabel>
              <input type="file" onChange={(e) => handleImageUpload(e, false)} disabled={isUploading} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"/>
              {formData.images.length > 0 && (
                <div className="mt-4 flex gap-4 flex-wrap">
                  {formData.images.map(img => (
                    <div key={img} className="relative">
                      <img src={img} alt="Gallery preview" className="h-24 w-auto rounded-md shadow-sm" />
                      <button type="button" onClick={() => removeGalleryImage(img)} className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 text-red-600 hover:text-red-800 shadow-md"><XCircle size={18}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>

        <div className="border-t border-slate-200 pt-6 space-y-4">
             <div className="flex items-center">
                <input type="checkbox" id="isFeatured" name="isFeatured" checked={formData.isFeatured} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"/>
                <label htmlFor="isFeatured" className="ml-2 block text-sm text-slate-900">Mark as a featured tour on the homepage.</label>
             </div>
             <button type="submit" disabled={isSubmitting || isUploading} className="inline-flex justify-center items-center px-6 py-2.5 text-sm font-bold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Tour'}
             </button>
        </div>
      </div>
    </form>
  );
}