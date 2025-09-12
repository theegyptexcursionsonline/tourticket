// app/admin/tours/TourForm.tsx
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
  Check
} from 'lucide-react';

interface Category {
  _id: string;
  name: string;
}

interface Destination {
  _id: string;
  name: string;
}

const FormLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-sm font-semibold text-slate-700 mb-1.5">{children}</label>
);

const SmallHint = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-1 text-xs text-slate-500">{children}</p>
);

const inputBase = "block w-full px-3 py-2 border border-slate-200 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 sm:text-sm disabled:bg-slate-50 disabled:cursor-not-allowed";

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
  });

  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [destRes, catRes] = await Promise.all([
          fetch('/api/admin/destinations'),
          fetch('/api/admin/categories')
        ]);
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
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;

    if (type === 'checkbox') {
      setFormData((p: any) => ({ ...p, [name]: (target as HTMLInputElement).checked }));
      return;
    }

    if (name === 'categories') {
      // single selection in this UI
      setFormData((p: any) => ({ ...p, [name]: [value] }));
    } else {
      setFormData((p: any) => ({ ...p, [name]: value }));
    }

    if (name === 'title') {
      const newSlug = value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
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

  // tag preview array
  const tagList = formData.tags
    ? formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
    : [];

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <div className="space-y-6">
        {/* Header row */}
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

            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-semibold shadow hover:opacity-95 disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span>{isSubmitting ? 'Saving...' : 'Save Tour'}</span>
            </button>
          </div>
        </div>

        {/* Basic fields */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <FormLabel>Title</FormLabel>
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={`${inputBase} text-lg font-medium`}
              placeholder="e.g., 1-Hour Amsterdam Canal Cruise"
              required
            />
            <SmallHint>Make the title descriptive — it will appear on listing pages and search results.</SmallHint>
          </div>

          <div className="space-y-4">
            <FormLabel>URL Slug</FormLabel>
            <div className="relative">
              <input
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                className={`${inputBase} pr-28`}
                placeholder="auto-generated-from-title"
                required
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 px-3 py-1 rounded-md bg-slate-50 border border-slate-100">/{formData.slug || 'your-slug'}</span>
            </div>
            <SmallHint>If you edit the slug, ensure it stays URL-safe (lowercase, hyphens).</SmallHint>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <FormLabel>Short Description</FormLabel>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className={`${inputBase} resize-none`}
            placeholder="Short summary that appears on the listing"
          />
        </div>

        <div className="space-y-2">
          <FormLabel>Long Description</FormLabel>
          <textarea
            name="longDescription"
            value={formData.longDescription}
            onChange={handleChange}
            rows={5}
            className={`${inputBase} resize-y`}
            placeholder="Full description shown on the tour detail page"
          />
        </div>

        {/* Pricing and meta */}
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

        {/* Destination / Category / Tags */}
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
                {categories.map(c => <option key={c._id} value={c._1d}>{/* ensure no typo */}{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <FormLabel>Tags (comma separated)</FormLabel>
            <div className="flex gap-2 items-center">
              <input name="tags" value={formData.tags} onChange={handleChange} className={inputBase} placeholder="e.g., Staff Favourite, -25%, New" />
              <button type="button" className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-slate-200 shadow-sm" onClick={() => toast('Tip: press Enter after typing tags in future enhancements')}>
                <TagIcon className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <SmallHint>Tags help internal filtering and quick labels on the listing.</SmallHint>

            {/* tag preview */}
            <div className="mt-2 flex flex-wrap gap-2">
              {tagList.map((t: string) => (
                <span key={t} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-sm text-slate-700">
                  <TagIcon className="w-3 h-3 text-slate-500" />
                  {t}
                </span>
              ))}
              {tagList.length === 0 && <span className="text-xs text-slate-400">No tags yet</span>}
            </div>
          </div>
        </div>

        {/* Highlights / Includes */}
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
              <button type="button" onClick={() => addListItem('highlights')} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-slate-200 shadow-sm">
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
              <button type="button" onClick={() => addListItem('includes')} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white border border-slate-200 shadow-sm">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <FormLabel>Main Image</FormLabel>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border border-dashed border-slate-200 bg-slate-50">
                <UploadCloud className="w-5 h-5" />
                <span className="text-sm text-slate-600">Upload main image</span>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} disabled={isUploading} className="hidden" />
              </label>
              {isUploading && <Loader2 className="h-5 w-5 animate-spin text-slate-500" />}
            </div>
            {formData.image ? (
              <div className="mt-3 relative max-w-xs rounded-md overflow-hidden border border-slate-100 shadow-sm">
                <img src={formData.image} alt="Main preview" className="w-full h-36 object-cover" />
                <button type="button" onClick={() => setFormData((p: any) => ({ ...p, image: '' }))} className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm">
                  <X className="w-4 h-4 text-rose-500" />
                </button>
              </div>
            ) : (
              <SmallHint className={""}>No main image selected yet.</SmallHint>
            )}
          </div>

          <div>
            <FormLabel>Gallery Images</FormLabel>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border border-dashed border-slate-200 bg-slate-50">
                <ImageIcon className="w-5 h-5" />
                <span className="text-sm text-slate-600">Add to gallery</span>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} disabled={isUploading} className="hidden" />
              </label>
              <SmallHint>Multiple images will appear in the tour gallery.</SmallHint>
            </div>

            {formData.images?.length > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-3">
                {formData.images.map((img: string) => (
                  <div key={img} className="relative rounded-md overflow-hidden border border-slate-100">
                    <img src={img} alt="Gallery" className="w-full h-28 object-cover" />
                    <button onClick={() => removeGalleryImage(img)} type="button" className="absolute top-2 right-2 bg-white rounded-full p-1 shadow">
                      <XCircle className="w-4 h-4 text-rose-500" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 text-sm text-slate-400">No gallery images yet.</div>
            )}
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-3">
            <input id="isFeatured" name="isFeatured" type="checkbox" checked={formData.isFeatured} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500" />
            <label htmlFor="isFeatured" className="text-sm font-medium text-slate-900">Featured tour</label>
            <SmallHint>Show this tour in homepage featured carousel.</SmallHint>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { setFormData({
              title: '',
              slug: '',
              description: '',
              longDescription: '',
              duration: '',
              discountPrice: '',
              originalPrice: '',
              destination: '',
              categories: [],
              image: '',
              images: [],
              highlights: [''],
              includes: [''],
              tags: '',
              isFeatured: false,
            }); toast('Form cleared'); }} className="px-3 py-2 rounded-md border border-slate-200 bg-white text-sm shadow-sm">Reset</button>

            <button type="submit" disabled={isSubmitting || isUploading} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-semibold shadow">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{isSubmitting ? 'Saving...' : 'Save Tour'}</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
