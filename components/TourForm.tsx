// components/TourForm.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Loader2,
  XCircle,
  ChevronDown,
  X,
  Plus,
  Image as ImageIcon,
  Tag as TagIcon,
  UploadCloud,
  Check,
  Calendar, // Icon for new section
  Clock,    // Icon for new section
} from 'lucide-react';

// --- Interface Definitions (from your original file) ---
interface Category {
  _id: string;
  name: string;
}

interface Destination {
  _id: string;
  name: string;
}

// --- Helper Components (from your original file) ---
const FormLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{children}</label>
);

const SmallHint = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <p className={`mt-1 text-xs text-slate-500 ${className}`}>{children}</p>
);

const inputBase = "block w-full px-3 py-2 border border-slate-200 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 sm:text-sm disabled:bg-slate-50 disabled:cursor-not-allowed";


// --- NEW: Availability Manager Sub-Component ---
const AvailabilityManager = ({ availability, setAvailability }: { availability: any, setAvailability: (data: any) => void }) => {
    
    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setAvailability({ ...availability, type: e.target.value });
    };

    const handleSlotChange = (index: number, field: string, value: string | number) => {
        const newSlots = [...availability.slots];
        newSlots[index] = { ...newSlots[index], [field]: value };
        setAvailability({ ...availability, slots: newSlots });
    };

    const addSlot = () => {
        const newSlots = [...(availability.slots || []), { time: '12:00', capacity: 10 }];
        setAvailability({ ...availability, slots: newSlots });
    };

    const removeSlot = (index: number) => {
        const newSlots = availability.slots.filter((_: any, i: number) => i !== index);
        setAvailability({ ...availability, slots: newSlots });
    };

    const handleDayToggle = (dayIndex: number) => {
        const currentDays = availability.availableDays || [];
        const newAvailableDays = [...currentDays];
        if (newAvailableDays.includes(dayIndex)) {
            setAvailability({ ...availability, availableDays: newAvailableDays.filter(d => d !== dayIndex) });
        } else {
            setAvailability({ ...availability, availableDays: [...newAvailableDays, dayIndex] });
        }
    };

    return (
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 mt-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5"/>
                Availability & Scheduling
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <FormLabel>Availability Type</FormLabel>
                    <select value={availability.type || 'daily'} onChange={handleTypeChange} className={`${inputBase} appearance-none pr-8`}>
                        <option value="daily">Daily (Repeats Weekly)</option>
                        {/* Add other types when ready */}
                    </select>
                </div>
            </div>
            {availability.type === 'daily' && (
                <div className="mt-4">
                    <FormLabel>Available Days</FormLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                            <button key={day} type="button" onClick={() => handleDayToggle(index)} className={`px-3 py-1 text-sm rounded-full ${availability.availableDays?.includes(index) ? 'bg-sky-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <div className="mt-6">
                <h4 className="text-base font-medium text-gray-900 flex items-center gap-2 mb-2"><Clock className="h-4 w-4"/>Time Slots & Capacity</h4>
                 {(availability.slots || []).map((slot: any, index: number) => (
                    <div key={index} className="flex items-center gap-4 mt-2 p-3 bg-white rounded-md border">
                        <input type="time" value={slot.time || ''} onChange={(e) => handleSlotChange(index, 'time', e.target.value)} className={`${inputBase} w-auto`} />
                        <input type="number" value={slot.capacity || 0} onChange={(e) => handleSlotChange(index, 'capacity', Number(e.target.value))} className={`${inputBase} w-28`} placeholder="Capacity" />
                        <button type="button" onClick={() => removeSlot(index)} className="ml-auto text-rose-500 hover:text-rose-700 p-2 hover:bg-rose-50 rounded-full"><XCircle className="h-5 w-5"/></button>
                    </div>
                ))}
                <button type="button" onClick={addSlot} className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-slate-200 shadow-sm text-sm">
                    <Plus className="w-4 h-4"/> Add Time Slot
                </button>
            </div>
        </div>
    );
};


// --- Main Tour Form Component (MODIFIED) ---
export default function TourForm({ tourToEdit }: { tourToEdit?: any }) {
  const router = useRouter();

  const [formData, setFormData] = useState<any>({
    title: tourToEdit?.title || '',
    slug: tourToEdit?.slug || '',
    description: tourToEdit?.description || '',
    longDescription: tourToEdit?.longDescription || '',
    duration: tourToEdit?.duration || '',
    discountPrice: tourToEdit?.discountPrice || '',
    originalPrice: tourToEdit?.originalPrice || '',
    destination: tourToEdit?.destination?._id || '',
    categories: tourToEdit?.categories?.[0]?._id ? [tourToEdit.categories[0]._id] : [],
    image: tourToEdit?.image || '',
    images: tourToEdit?.images || [],
    highlights: tourToEdit?.highlights?.length > 0 ? tourToEdit.highlights : [''],
    includes: tourToEdit?.includes?.length > 0 ? tourToEdit.includes : [''],
    tags: tourToEdit?.tags?.join(', ') || '',
    isFeatured: tourToEdit?.isFeatured || false,
    // --- ADDED: Initialize availability ---
    availability: tourToEdit?.availability || { 
        type: 'daily', 
        availableDays: [0, 1, 2, 3, 4, 5, 6], 
        slots: [{ time: '10:00', capacity: 10 }] 
    },
  });

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Correctly initialize availability for existing tours
    if (tourToEdit) {
        const initialData = { ...tourToEdit };
        if (!initialData.availability || !initialData.availability.slots) {
            initialData.availability = {
                type: 'daily',
                availableDays: [0, 1, 2, 3, 4, 5, 6],
                slots: [{ time: '10:00', capacity: 10 }]
            };
        }
        setFormData(prev => ({...prev, ...initialData}));
    }

    const fetchData = async () => {
      try {
        const [destRes, catRes] = await Promise.all([
          fetch('/api/admin/tours/destinations'),
          fetch('/api/categories')
        ]);
        if (!destRes.ok) throw new Error(`Failed to fetch destinations: ${destRes.statusText}`);
        if (!catRes.ok) throw new Error(`Failed to fetch categories: ${catRes.statusText}`);
        const destData = await destRes.json();
        const catData = await catRes.json();
        if (destData?.success) setDestinations(destData.data);
        if (catData?.success) setCategories(catData.data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load destinations or categories.');
      }
    };
    fetchData();
  }, [tourToEdit]);

  // --- ADDED: Handler to update availability from child component ---
  const setAvailability = (availabilityData: any) => {
    setFormData((prev: any) => ({ ...prev, availability: availabilityData }));
  };
  
  // --- All your other handlers (handleChange, handleListChange, etc.) remain unchanged ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    if (type === 'checkbox') {
      setFormData((p: any) => ({ ...p, [name]: (target as HTMLInputElement).checked }));
      return;
    }
    if (name === 'categories') {
      setFormData((p: any) => ({ ...p, [name]: [value] }));
    } else {
      setFormData((p: any) => ({ ...p, [name]: value }));
    }
    if (name === 'title') {
      const newSlug = value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      setFormData((p: any) => ({ ...p, slug: newSlug }));
    }
  };

  const handleListChange = (index: number, value: string, field: 'highlights' | 'includes') => {
    const updated = [...formData[field]];
    updated[index] = value;
    setFormData((p: any) => ({ ...p, [field]: updated }));
  };

  const addListItem = (field: 'highlights' | 'includes') => {
    setFormData((p: any) => ({ ...p, [field]: [...p[field], ''] }));
  };

  const removeListItem = (index: number, field: 'highlights' | 'includes') => {
    if (formData[field].length <= 1) return;
    setFormData((p: any) => ({ ...p, [field]: p[field].filter((_: any, i: number) => i !== index) }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isMainImage = true) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    const uploadPromise = fetch('/api/upload', { method: 'POST', body: uploadFormData })
      .then(res => res.json())
      .then(data => {
        if (data?.success) {
          if (isMainImage) {
            setFormData((p: any) => ({ ...p, image: data.url }));
          } else {
            setFormData((p: any) => ({ ...p, images: [...p.images, data.url] }));
          }
          return 'Image uploaded!';
        }
        throw new Error('Upload failed');
      });
    toast.promise(uploadPromise, {
      loading: 'Uploading image...',
      success: (msg) => msg as string,
      error: 'Upload failed. Try again.',
    }).finally(() => setIsUploading(false));
  };

  const removeGalleryImage = (imageUrl: string) => {
    setFormData((p: any) => ({ ...p, images: p.images.filter((u: string) => u !== imageUrl) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const apiEndpoint = tourToEdit ? `/api/admin/tours/${tourToEdit._id}` : '/api/admin/tours';
    const method = tourToEdit ? 'PUT' : 'POST';
    const payload = {
      ...formData,
      tags: formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
    };
    try {
      const res = await fetch(apiEndpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success('Tour saved successfully!');
        router.push('/admin/tours');
        router.refresh();
      } else {
        const errorData = await res.json();
        toast.error(`Failed to save tour: ${errorData?.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tagList = formData.tags ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [];

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Tour Content</h3>
              <p className="text-sm text-slate-500">Edit core tour fields below. Changes are saved when you click <strong>Save Tour</strong>.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                <ImageIcon className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-600">{formData.images?.length || 0} images</span>
              </div>
              <button type="submit" disabled={isSubmitting || isUploading} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-semibold shadow hover:opacity-95 disabled:opacity-60">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>{isSubmitting ? 'Saving...' : 'Save Tour'}</span>
              </button>
            </div>
        </div>

        {/* --- All your existing form fields --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
                <FormLabel>Title</FormLabel>
                <input name="title" value={formData.title} onChange={handleChange} className={`${inputBase} text-lg font-medium`} placeholder="e.g., 1-Hour Amsterdam Canal Cruise" required />
                <SmallHint>Make the title descriptive — it will appear on listing pages and search results.</SmallHint>
            </div>
            <div className="space-y-4">
                <FormLabel>URL Slug</FormLabel>
                <div className="relative">
                    <input name="slug" value={formData.slug} onChange={handleChange} className={`${inputBase} pr-28`} placeholder="auto-generated-from-title" required />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 px-3 py-1 rounded-md bg-slate-50 border border-slate-100">/{formData.slug || 'your-slug'}</span>
                </div>
                <SmallHint>If you edit the slug, ensure it stays URL-safe (lowercase, hyphens).</SmallHint>
            </div>
        </div>
        <div className="space-y-2">
            <FormLabel>Short Description</FormLabel>
            <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className={`${inputBase} resize-none`} placeholder="Short summary that appears on the listing" />
        </div>
        <div className="space-y-2">
            <FormLabel>Long Description</FormLabel>
            <textarea name="longDescription" value={formData.longDescription} onChange={handleChange} rows={5} className={`${inputBase} resize-y`} placeholder="Full description shown on the tour detail page" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
                <FormLabel>Duration</FormLabel>
                <input name="duration" value={formData.duration} onChange={handleChange} className={inputBase} placeholder="e.g., 6 hours" required />
            </div>
            <div>
                <FormLabel>Discount Price (€)</FormLabel>
                <input name="discountPrice" type="number" step="0.01" value={formData.discountPrice} onChange={handleChange} className={inputBase} placeholder="15.50" required />
            </div>
            <div>
                <FormLabel>Original Price (€) (Optional)</FormLabel>
                <input name="originalPrice" type="number" step="0.01" value={formData.originalPrice} onChange={handleChange} className={inputBase} placeholder="20.00" />
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
                <FormLabel>Destination</FormLabel>
                <div className="relative">
                    <select name="destination" value={formData.destination} onChange={handleChange} className={`${inputBase} appearance-none pr-8`}>
                        <option value="">Select a Destination</option>
                        {destinations.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
            </div>
            <div>
                <FormLabel>Category</FormLabel>
                <div className="relative">
                    <select name="categories" value={formData.categories[0] || ''} onChange={handleChange} className={`${inputBase} appearance-none pr-8`}>
                        <option value="">Select a Category</option>
                        {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                </div>
            </div>
            <div>
                <FormLabel>Tags (comma separated)</FormLabel>
                <div className="flex gap-2 items-center">
                    <input name="tags" value={formData.tags} onChange={handleChange} className={inputBase} placeholder="e.g., Staff Favourite, -25%, New" />
                </div>
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <FormLabel>Highlights</FormLabel>
                <div className="space-y-3">
                    {formData.highlights.map((h: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                            <input value={h} onChange={(e) => handleListChange(i, e.target.value, 'highlights')} className={`${inputBase} flex-1`} placeholder={`Highlight ${i + 1}`} />
                            <button type="button" disabled={formData.highlights.length <= 1} onClick={() => removeListItem(i, 'highlights')} className="p-2 rounded-md hover:bg-red-50 disabled:opacity-50">
                                <XCircle className="w-5 h-5 text-rose-500" />
                            </button>
                        </div>
                    ))}
                    <button type="button" onClick={() => addListItem('highlights')} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-slate-200 shadow-sm text-sm">
                        <Plus className="w-4 h-4" /> Add Highlight
                    </button>
                </div>
            </div>
            <div>
                <FormLabel>What's Included</FormLabel>
                <div className="space-y-3">
                    {formData.includes.map((it: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                            <input value={it} onChange={(e) => handleListChange(i, e.target.value, 'includes')} className={`${inputBase} flex-1`} placeholder={`Included item ${i + 1}`} />
                            <button type="button" disabled={formData.includes.length <= 1} onClick={() => removeListItem(i, 'includes')} className="p-2 rounded-md hover:bg-red-50 disabled:opacity-50">
                                <XCircle className="w-5 h-5 text-rose-500" />
                            </button>
                        </div>
                    ))}
                    <button type="button" onClick={() => addListItem('includes')} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-slate-200 shadow-sm text-sm">
                        <Plus className="w-4 h-4" /> Add Item
                    </button>
                </div>
            </div>
        </div>
        
        {/* --- ADDED: Availability Manager Section --- */}
        {formData.availability && (
            <AvailabilityManager
                availability={formData.availability}
                setAvailability={setAvailability}
            />
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image upload sections remain here */}
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t border-slate-100 pt-6 mt-6">
            <div className="flex items-center gap-3">
              <input id="isFeatured" name="isFeatured" type="checkbox" checked={formData.isFeatured} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
              <label htmlFor="isFeatured" className="text-sm font-medium text-slate-900">Featured tour</label>
              <SmallHint>Show this tour in homepage featured carousel.</SmallHint>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={isSubmitting || isUploading} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-semibold shadow">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span>{isSubmitting ? 'Saving...' : 'Save Tour'}</span>
              </button>
            </div>
        </div>
      </div>
    </form>
  );
}