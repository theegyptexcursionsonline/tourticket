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
    Check,
    Calendar,
    Clock,
    HelpCircle,
    Settings,
    MapPin,
    Tag,
    Star,
    Euro,
    Users,
    Timer,
    Mountain,
    Eye,
    FileText,
    Sparkles,
    Camera,
    Grid3x3,
} from 'lucide-react';

// --- Interface Definitions ---
interface Category {
    _id: string;
    name: string;
}

interface Destination {
    _id: string;
    name: string;
}

// --- Helper Components ---
const FormLabel = ({ children, icon: Icon, required = false }: { 
    children: React.ReactNode; 
    icon?: any; 
    required?: boolean; 
}) => (
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
        {Icon && <Icon className="h-4 w-4 text-indigo-500" />}
        {children}
        {required && <span className="text-red-500 text-xs">*</span>}
    </label>
);

const SmallHint = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <p className={`mt-2 text-xs text-slate-500 ${className}`}>{children}</p>
);

const inputBase = "block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent sm:text-sm disabled:bg-slate-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-slate-700";

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

// --- Availability Manager Sub-Component ---
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
        <SectionCard title="Availability & Scheduling" subtitle="Configure when your tour is available" icon={Calendar}>
            {/* Availability Type Selection */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="space-y-3">
                    <FormLabel icon={Clock}>Availability Type</FormLabel>
                    <div className="relative">
                        <select 
                            value={availability?.type || 'daily'} 
                            onChange={handleTypeChange} 
                            className={`${inputBase} appearance-none cursor-pointer`}
                        >
                            <option value="daily">🔄 Daily (Repeats Weekly)</option>
                            {/* Add other types when ready */}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                            <ChevronDown className="h-5 w-5 text-slate-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Available Days Selection */}
            {availability?.type === 'daily' && (
                <div className="mb-8">
                    <FormLabel icon={Calendar}>Available Days</FormLabel>
                    <div className="flex flex-wrap gap-3">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                            <button 
                                key={day} 
                                type="button" 
                                onClick={() => handleDayToggle(index)} 
                                className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                                    availability?.availableDays?.includes(index) 
                                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200' 
                                        : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 shadow-sm'
                                }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Time Slots Section */}
            <div className="space-y-6">
                <FormLabel icon={Users}>Time Slots & Capacity</FormLabel>
                
                <div className="space-y-4">
                    {(availability?.slots || []).map((slot: any, index: number) => (
                        <div 
                            key={index} 
                            className="group flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-all duration-200 hover:shadow-md"
                        >
                            {/* Time Input */}
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Time</label>
                                <div className="relative">
                                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input 
                                        type="time" 
                                        value={slot.time || ''} 
                                        onChange={(e) => handleSlotChange(index, 'time', e.target.value)} 
                                        className={`${inputBase} pl-10`}
                                    />
                                </div>
                            </div>

                            {/* Capacity Input */}
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Capacity</label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input 
                                        type="number" 
                                        value={slot.capacity || 0} 
                                        onChange={(e) => handleSlotChange(index, 'capacity', Number(e.target.value))} 
                                        className={`${inputBase} pl-10`}
                                        placeholder="Max guests"
                                        min="1"
                                    />
                                </div>
                            </div>

                            {/* Remove Button */}
                            <button 
                                type="button" 
                                onClick={() => removeSlot(index)} 
                                className="flex items-center justify-center w-10 h-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group-hover:opacity-100 opacity-70"
                            >
                                <XCircle className="h-4 w-4"/>
                            </button>
                        </div>
                    ))}
                </div>

                {/* Add Time Slot Button */}
                <button 
                    type="button" 
                    onClick={addSlot} 
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 text-sm font-semibold text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400 transition-all duration-200 group"
                >
                    <Plus className="h-5 w-5 group-hover:scale-110 transition-transform duration-200"/> 
                    Add Time Slot
                </button>
            </div>
        </SectionCard>
    );
};

// --- Main Tour Form Component ---
export default function TourForm({ tourToEdit }: { tourToEdit?: any }) {
    const router = useRouter();
    
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

    const [formData, setFormData] = useState<any>({
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
        whatsIncluded: [''],
        whatsNotIncluded: [''],
        itinerary: [{ day: 1, title: '', description: '' }],
        faqs: [{ question: '', answer: '' }],
        bookingOptions: [{ type: 'Per Person', label: '', price: 0 }],
        addOns: [{ name: '', description: '', price: 0 }],
        isPublished: false,
        difficulty: '',
        maxGroupSize: 10,
        availability: { 
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
        if (tourToEdit) {
            setIsSlugManuallyEdited(Boolean(tourToEdit.slug));
            
            const initialData: any = {
                title: tourToEdit.title || '',
                slug: tourToEdit.slug || '',
                description: tourToEdit.description || '',
                longDescription: tourToEdit.longDescription || '',
                duration: tourToEdit.duration || '',
                discountPrice: tourToEdit.discountPrice || '',
                originalPrice: tourToEdit.originalPrice || '',
                destination: tourToEdit.destination?._id?.toString() || tourToEdit.destination || '',
                categories: tourToEdit.category?._id ? [tourToEdit.category._id.toString()] : (tourToEdit.categories || []),
                image: tourToEdit.image || '', 
                images: tourToEdit.images || [],
                highlights: tourToEdit.highlights?.length > 0 ? tourToEdit.highlights : [''],
                includes: tourToEdit.includes?.length > 0 ? tourToEdit.includes : [''],
                tags: Array.isArray(tourToEdit.tags) ? tourToEdit.tags.join(', ') : (tourToEdit.tags || ''),
                isFeatured: tourToEdit.isFeatured || false,
                whatsIncluded: tourToEdit.whatsIncluded?.length > 0 ? tourToEdit.whatsIncluded : [''],
                whatsNotIncluded: tourToEdit.whatsNotIncluded?.length > 0 ? tourToEdit.whatsNotIncluded : [''],
                itinerary: tourToEdit.itinerary?.length > 0 ? tourToEdit.itinerary : [{ day: 1, title: '', description: '' }],
                faqs: (tourToEdit.faq || tourToEdit.faqs)?.length > 0 ? (tourToEdit.faq || tourToEdit.faqs) : [{ question: '', answer: '' }],
// In the useEffect where you initialize formData for editing
bookingOptions: tourToEdit.bookingOptions?.length > 0 
    ? tourToEdit.bookingOptions.map((option: any) => ({
        type: option.type || 'Per Person',
        label: option.label || '',
        price: option.price || 0,
        description: option.description || ''
    }))
    : [{ type: 'Per Person', label: '', price: 0, description: '' }],                addOns: tourToEdit.addOns?.length > 0 ? tourToEdit.addOns : [{ name: '', description: '', price: 0 }],
                isPublished: tourToEdit.isPublished || false,
                difficulty: tourToEdit.difficulty || '',
                maxGroupSize: tourToEdit.maxGroupSize || 10,
            };
            
            if (tourToEdit.availability && tourToEdit.availability.slots) {
                initialData.availability = {
                    type: tourToEdit.availability.type || 'daily',
                    availableDays: tourToEdit.availability.availableDays || [0, 1, 2, 3, 4, 5, 6],
                    slots: tourToEdit.availability.slots?.length > 0 ? tourToEdit.availability.slots : [{ time: '10:00', capacity: 10 }]
                };
            } else {
                initialData.availability = {
                    type: 'daily',
                    availableDays: [0, 1, 2, 3, 4, 5, 6],
                    slots: [{ time: '10:00', capacity: 10 }]
                };
            }
            
            setFormData(initialData);
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

    const setAvailability = (availabilityData: any) => {
        setFormData((prev: any) => ({ ...prev, availability: availabilityData }));
    };
    
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
        
        if (name === 'title' && !isSlugManuallyEdited) {
            const newSlug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            setFormData((p: any) => ({ ...p, slug: newSlug }));
        }
        
        if (name === 'slug') {
            setIsSlugManuallyEdited(true);
        }
    };

    const handleTextAreaArrayChange = (fieldName: string, e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const arrayValue = value.split('\n');
        setFormData((p: any) => ({ ...p, [fieldName]: arrayValue }));
    };

    const handleItineraryChange = (index: number, field: string, value: string | number) => {
        const updatedItinerary = [...formData.itinerary];
        updatedItinerary[index] = { ...updatedItinerary[index], [field]: value };
        setFormData((p: any) => ({ ...p, itinerary: updatedItinerary }));
    };

    const addItineraryItem = () => {
        const newDay = formData.itinerary.length + 1;
        setFormData((p: any) => ({ 
            ...p, 
            itinerary: [...p.itinerary, { day: newDay, title: '', description: '' }] 
        }));
    };

    const removeItineraryItem = (index: number) => {
        if (formData.itinerary.length <= 1) return;
        const updatedItinerary = formData.itinerary.filter((_: any, i: number) => i !== index);
        updatedItinerary.forEach((item: any, i: number) => {
            item.day = i + 1;
        });
        setFormData((p: any) => ({ ...p, itinerary: updatedItinerary }));
    };

    const handleFAQChange = (index: number, field: string, value: string) => {
        const updatedFAQs = [...formData.faqs];
        updatedFAQs[index] = { ...updatedFAQs[index], [field]: value };
        setFormData((p: any) => ({ ...p, faqs: updatedFAQs }));
    };

    const addFAQ = () => {
        setFormData((p: any) => ({ 
            ...p, 
            faqs: [...p.faqs, { question: '', answer: '' }] 
        }));
    };

    const removeFAQ = (index: number) => {
        if (formData.faqs.length <= 1) return;
        const updatedFAQs = formData.faqs.filter((_: any, i: number) => i !== index);
        setFormData((p: any) => ({ ...p, faqs: updatedFAQs }));
    };

 const handleBookingOptionChange = (index: number, field: string, value: string | number) => {
    const updatedOptions = [...formData.bookingOptions];
    updatedOptions[index] = { ...updatedOptions[index], [field]: value };
    setFormData((p: any) => ({ ...p, bookingOptions: updatedOptions }));
};

    const addBookingOption = () => {
        setFormData((p: any) => ({ 
            ...p, 
            bookingOptions: [...p.bookingOptions, { type: 'Per Person', label: '', price: 0 }] 
        }));
    };

    const removeBookingOption = (index: number) => {
        if (formData.bookingOptions.length <= 1) return;
        const updatedOptions = formData.bookingOptions.filter((_: any, i: number) => i !== index);
        setFormData((p: any) => ({ ...p, bookingOptions: updatedOptions }));
    };

    const handleAddOnChange = (index: number, field: string, value: string | number) => {
        const updatedAddOns = [...formData.addOns];
        updatedAddOns[index] = { ...updatedAddOns[index], [field]: value };
        setFormData((p: any) => ({ ...p, addOns: updatedAddOns }));
    };

    const addAddOn = () => {
        setFormData((p: any) => ({ 
            ...p, 
            addOns: [...p.addOns, { name: '', description: '', price: 0 }] 
        }));
    };

    const removeAddOn = (index: number) => {
        if (formData.addOns.length <= 1) return;
        const updatedAddOns = formData.addOns.filter((_: any, i: number) => i !== index);
        setFormData((p: any) => ({ ...p, addOns: updatedAddOns }));
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

        const promise = fetch('/api/upload', { method: 'POST', body: uploadFormData })
            .then(res => {
                if (!res.ok) {
                    throw new Error('Network response was not ok');
                }
                return res.json();
            })
            .then(data => {
                if (data.success && data.url) {
                    if (isMainImage) {
                        setFormData((prevData: any) => ({ ...prevData, image: data.url }));
                    } else {
                        setFormData((prevData: any) => ({ ...prevData, images: [...prevData.images, data.url] }));
                    }
                    return 'Image uploaded successfully!';
                } else {
                    throw new Error(data.error || 'Upload failed: Invalid response from server.');
                }
            });

        toast.promise(promise, {
            loading: 'Uploading image...',
            success: (message) => message as string,
            error: (err) => err.message || 'Upload failed. Please try again.',
        }).finally(() => {
            setIsUploading(false);
        });
    };

    const removeGalleryImage = (imageUrl: string) => {
        setFormData((p: any) => ({ ...p, images: p.images.filter((u: string) => u !== imageUrl) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (
            !formData.title?.trim() ||
            !formData.description?.trim() ||
            !formData.duration?.trim() ||
            !formData.discountPrice ||
            !formData.destination ||
            !formData.categories?.length
        ) {
            toast.error('Please fill all required fields: Title, Description, Duration, Discount Price, Destination, and Category.');
            setIsSubmitting(false);
            return;
        }

        try {
            const cleanedData = { ...formData };

            const payload = {
                title: cleanedData.title.trim(),
                slug: cleanedData.slug.trim(),
                description: cleanedData.description.trim(),
                duration: cleanedData.duration.trim(),
                price: cleanedData.originalPrice ? parseFloat(cleanedData.originalPrice) : undefined,
                discountPrice: parseFloat(cleanedData.discountPrice) || 0,
                longDescription: cleanedData.longDescription?.trim() || cleanedData.description.trim(),
                originalPrice: cleanedData.originalPrice ? parseFloat(cleanedData.originalPrice) : undefined,
                destination: cleanedData.destination,
                category: cleanedData.categories[0],
                difficulty: cleanedData.difficulty || 'Easy',
                maxGroupSize: parseInt(cleanedData.maxGroupSize) || 10,
                isPublished: Boolean(cleanedData.isPublished),
                isFeatured: Boolean(cleanedData.isFeatured),
                ...(cleanedData.image && cleanedData.image.trim() !== '' && { image: cleanedData.image }),
                images: Array.isArray(cleanedData.images) ? cleanedData.images : [],
                highlights: Array.isArray(cleanedData.highlights) ? cleanedData.highlights.filter((item: string) => item.trim() !== '') : [],
                includes: Array.isArray(cleanedData.includes) ? cleanedData.includes.filter((item: string) => item.trim() !== '') : [],
                whatsIncluded: Array.isArray(cleanedData.whatsIncluded) ? cleanedData.whatsIncluded.filter((item: string) => item.trim() !== '') : [],
                whatsNotIncluded: Array.isArray(cleanedData.whatsNotIncluded) ? cleanedData.whatsNotIncluded.filter((item: string) => item.trim() !== '') : [],
                itinerary: Array.isArray(cleanedData.itinerary) ? cleanedData.itinerary.filter((item: any) => item.title?.trim() && item.description?.trim()) : [],
                faq: Array.isArray(cleanedData.faqs) ? cleanedData.faqs.filter((faq: any) => faq.question?.trim() && faq.answer?.trim()) : [],
                bookingOptions: Array.isArray(cleanedData.bookingOptions) ? cleanedData.bookingOptions.filter((option: any) => option.label?.trim()) : [],
                addOns: Array.isArray(cleanedData.addOns) ? cleanedData.addOns.filter((addon: any) => addon.name?.trim()) : [],
                tags: typeof cleanedData.tags === 'string'
                    ? cleanedData.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                    : Array.isArray(cleanedData.tags) ? cleanedData.tags : [],
                availability: cleanedData.availability || {
                    type: 'daily',
                    availableDays: [0, 1, 2, 3, 4, 5, 6],
                    slots: [{ time: '10:00', capacity: 10 }]
                }
            };

            const apiEndpoint = tourToEdit ? `/api/admin/tours/${tourToEdit._id}` : '/api/admin/tours';
            const method = tourToEdit ? 'PUT' : 'POST';

            const response = await fetch(apiEndpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const responseData = await response.json();

            if (response.ok) {
                toast.success(`Tour ${tourToEdit ? 'updated' : 'created'} successfully!`);
                router.push('/admin/tours');
                router.refresh();
            } else {
                toast.error(`Failed to save tour: ${responseData?.error || 'Unknown error'}`);
            }

        } catch (error) {
            console.error('Submit error:', error);
            toast.error('An unexpected error occurred while saving the tour.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header Card */}
            <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-8">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                            <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                                {tourToEdit ? 'Edit Tour' : 'Create New Tour'}
                            </h1>
                            <p className="text-slate-500 mt-1">
                                {tourToEdit ? `Editing: ${tourToEdit.title}` : 'Fill out the form below to create your tour'}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="hidden lg:flex items-center gap-3 px-4 py-3 rounded-xl bg-white/80 border border-slate-200 shadow-sm">
                            <Camera className="w-5 h-5 text-slate-500" />
                            <span className="text-sm font-medium text-slate-600">
                                {formData.images?.length || 0} images uploaded
                            </span>
                        </div>
                        
                        <button 
                            form="tour-form"
                            type="submit" 
                            disabled={isSubmitting || isUploading} 
                            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="h-5 w-5" />
                                    <span>Save Tour</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <form id="tour-form" onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Information */}
                <SectionCard title="Basic Information" subtitle="Core details about your tour" icon={FileText}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-3">
                            <FormLabel icon={Sparkles} required>Title</FormLabel>
                            <input 
                                name="title" 
                                value={formData.title || ''} 
                                onChange={handleChange} 
                                className={`${inputBase} text-lg font-medium`} 
                                placeholder="e.g., 1-Hour Amsterdam Canal Cruise" 
                                required 
                            />
                            <SmallHint>Make the title descriptive — it will appear on listing pages and search results.</SmallHint>
                        </div>
                        <div className="space-y-3">
                            <FormLabel icon={Tag} required>URL Slug</FormLabel>
                            <div className="relative">
                                <input 
                                    name="slug" 
                                    value={formData.slug || ''} 
                                    onChange={handleChange} 
                                    className={`${inputBase} pr-32`} 
                                    placeholder="auto-generated-from-title" 
                                    required 
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200">
                                    /{formData.slug || 'your-slug'}
                                </div>
                            </div>
                            <SmallHint>If you edit the slug, ensure it stays URL-safe (lowercase, hyphens).</SmallHint>
                        </div>
                    </div>

                    <div className="space-y-3 mb-6">
                        <FormLabel icon={FileText} required>Short Description</FormLabel>
                        <textarea 
                            name="description" 
                            value={formData.description || ''} 
                            onChange={handleChange} 
                            rows={3} 
                            className={`${inputBase} resize-none`} 
                            placeholder="Short summary that appears on the listing" 
                            required
                        />
                    </div>

                    <div className="space-y-3">
                        <FormLabel icon={FileText}>Long Description</FormLabel>
                        <textarea 
                            name="longDescription" 
                            value={formData.longDescription || ''} 
                            onChange={handleChange} 
                            rows={5} 
                            className={`${inputBase} resize-y`} 
                            placeholder="Full description shown on the tour detail page" 
                        />
                    </div>
                </SectionCard>

                {/* Tour Details */}
                <SectionCard title="Tour Details" subtitle="Duration, difficulty, and capacity information" icon={Settings}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-3">
                            <FormLabel icon={Timer} required>Duration</FormLabel>
                            <input 
                                name="duration" 
                                value={formData.duration} 
                                onChange={handleChange} 
                                className={inputBase} 
                                placeholder="e.g., 6 hours" 
                                required 
                            />
                        </div>
                        <div className="space-y-3">
                            <FormLabel icon={Mountain}>Difficulty</FormLabel>
                            <input 
                                name="difficulty" 
                                value={formData.difficulty} 
                                onChange={handleChange} 
                                className={inputBase} 
                                placeholder="e.g., Easy, Moderate" 
                            />
                        </div>
                        <div className="space-y-3">
                            <FormLabel icon={Users}>Max Group Size</FormLabel>
                            <input 
                                name="maxGroupSize" 
                                type="number" 
                                value={formData.maxGroupSize} 
                                onChange={handleChange} 
                                className={inputBase} 
                                placeholder="10" 
                            />
                        </div>
                        <div className="flex items-center justify-center">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input 
                                    id="isPublished" 
                                    name="isPublished" 
                                    type="checkbox" 
                                    checked={formData.isPublished} 
                                    onChange={handleChange} 
                                    className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2" 
                                />
                                <div className="flex items-center gap-2">
                                    <Eye className="h-4 w-4 text-slate-500" />
                                    <span className="text-sm font-semibold text-slate-700">Published</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </SectionCard>

                {/* Pricing */}
                <SectionCard title="Pricing & Tags" subtitle="Set your tour pricing and tags" icon={Euro}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-3">
                            <FormLabel icon={Euro} required>Discount Price (€)</FormLabel>
                            <div className="relative">
                                <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input 
                                    name="discountPrice" 
                                    type="number" 
                                    step="0.01" 
                                    value={formData.discountPrice} 
                                    onChange={handleChange} 
                                    className={`${inputBase} pl-10`} 
                                    placeholder="15.50" 
                                    required 
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <FormLabel icon={Euro}>Original Price (€) (Optional)</FormLabel>
                            <div className="relative">
                                <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input 
                                    name="originalPrice" 
                                    type="number" 
                                    step="0.01" 
                                    value={formData.originalPrice || ''} 
                                    onChange={handleChange} 
                                    className={`${inputBase} pl-10`} 
                                    placeholder="20.00" 
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <FormLabel icon={Tag}>Tags (comma separated)</FormLabel>
                            <input 
                                name="tags" 
                                value={formData.tags} 
                                onChange={handleChange} 
                                className={inputBase} 
                                placeholder="e.g., Staff Favourite, -25%, New" 
                            />
                        </div>
                    </div>
                </SectionCard>

                {/* Location & Category */}
                <SectionCard title="Location & Category" subtitle="Choose destination and category" icon={MapPin}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <FormLabel icon={MapPin} required>Destination</FormLabel>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <select 
                                    name="destination" 
                                    value={formData.destination} 
                                    onChange={handleChange} 
                                    className={`${inputBase} pl-10 appearance-none cursor-pointer`}
                                >
                                    <option value="">Select a Destination</option>
                                    {destinations.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <FormLabel icon={Grid3x3} required>Category</FormLabel>
                            <div className="relative">
                                <Grid3x3 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <select 
                                    name="categories" 
                                    value={formData.categories[0] || ''} 
                                    onChange={handleChange} 
                                    className={`${inputBase} pl-10 appearance-none cursor-pointer`}
                                >
                                    <option value="">Select a Category</option>
                                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </SectionCard>

                {/* Images */}
                <SectionCard title="Images" subtitle="Upload your tour photos" icon={Camera}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <FormLabel icon={ImageIcon}>Main Image</FormLabel>
                            {formData.image && (
                                <div className="relative w-full h-48 mb-4">
                                    <img 
                                        src={formData.image} 
                                        alt="Main tour preview" 
                                        className="w-full h-full object-cover rounded-xl border-2 border-slate-200 shadow-md" 
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData((p: any) => ({ ...p, image: '' }))}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold hover:bg-red-600 transition-all shadow-lg"
                                        aria-label="Remove main image"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageUpload(e, true)}
                                    className={`${inputBase} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100`}
                                    disabled={isUploading}
                                />
                            </div>
                            
                            {isUploading && (
                                <div className="flex items-center gap-2 text-indigo-600">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Uploading image...</span>
                                </div>
                            )}
                            <SmallHint>Upload a high-quality image for the main tour photo.</SmallHint>
                        </div>
                        
                        <div className="space-y-4">
                            <FormLabel icon={Grid3x3}>Gallery Images</FormLabel>
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => handleImageUpload(e, false)} 
                                className={`${inputBase} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100`}
                                disabled={isUploading}
                            />
                            {formData.images.length > 0 && (
                                <div className="grid grid-cols-3 gap-3">
                                    {formData.images.map((img: string, i: number) => (
                                        <div key={i} className="relative group">
                                            <img 
                                                src={img} 
                                                alt={`Gallery ${i}`} 
                                                className="w-full h-24 object-cover rounded-xl border-2 border-slate-200 shadow-sm group-hover:shadow-md transition-all" 
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => removeGalleryImage(img)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-all shadow-lg opacity-0 group-hover:opacity-100"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <SmallHint>Add additional images to showcase your tour.</SmallHint>
                        </div>
                    </div>
                </SectionCard>

                {/* Highlights & Includes */}
                <SectionCard title="Highlights & What's Included" subtitle="Key selling points and inclusions" icon={Star}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <FormLabel icon={Star}>Highlights</FormLabel>
                            <div className="space-y-3">
                                {formData.highlights.map((h: string, i: number) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="flex-1 relative">
                                            <input 
                                                value={h} 
                                                onChange={(e) => handleListChange(i, e.target.value, 'highlights')} 
                                                className={inputBase} 
                                                placeholder={`Highlight ${i + 1}`} 
                                            />
                                        </div>
                                        <button 
                                            type="button" 
                                            disabled={formData.highlights.length <= 1} 
                                            onClick={() => removeListItem(i, 'highlights')} 
                                            className="flex items-center justify-center w-10 h-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 disabled:opacity-30"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    type="button" 
                                    onClick={() => addListItem('highlights')} 
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400 transition-all duration-200"
                                >
                                    <Plus className="w-4 h-4" /> Add Highlight
                                </button>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <FormLabel icon={Check}>What's Included</FormLabel>
                            <div className="space-y-3">
                                {formData.includes.map((it: string, i: number) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <input 
                                                value={it} 
                                                onChange={(e) => handleListChange(i, e.target.value, 'includes')} 
                                                className={inputBase} 
                                                placeholder={`Included item ${i + 1}`} 
                                            />
                                        </div>
                                        <button 
                                            type="button" 
                                            disabled={formData.includes.length <= 1} 
                                            onClick={() => removeListItem(i, 'includes')} 
                                            className="flex items-center justify-center w-10 h-10 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 disabled:opacity-30"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    type="button" 
                                    onClick={() => addListItem('includes')} 
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400 transition-all duration-200"
                                >
                                    <Plus className="w-4 h-4" /> Add Item
                                </button>
                            </div>
                        </div>
                    </div>
                </SectionCard>

                {/* Detailed Inclusions */}
                <SectionCard title="Detailed Inclusions" subtitle="Comprehensive lists of what's included and excluded" icon={Check}>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <FormLabel icon={Check}>What's Included (List)</FormLabel>
                            <textarea 
                                value={formData.whatsIncluded.join('\n')} 
                                onChange={(e) => handleTextAreaArrayChange('whatsIncluded', e)}
                                rows={6} 
                                className={`${inputBase} resize-y`} 
                                placeholder="Enter each item on a new line"
                            />
                            <SmallHint>Each line will be a separate item in the list.</SmallHint>
                        </div>
                        <div className="space-y-3">
                            <FormLabel icon={X}>What's Not Included (List)</FormLabel>
                            <textarea 
                                value={formData.whatsNotIncluded.join('\n')} 
                                onChange={(e) => handleTextAreaArrayChange('whatsNotIncluded', e)}
                                rows={6} 
                                className={`${inputBase} resize-y`} 
                                placeholder="Enter each item on a new line"
                            />
                            <SmallHint>Each line will be a separate item in the list.</SmallHint>
                        </div>
                    </div>
                </SectionCard>

                {/* Itinerary */}
                <SectionCard title="Itinerary" subtitle="Day-by-day breakdown of your tour" icon={Calendar}>
                    <div className="space-y-6">
                        {formData.itinerary.map((day: any, i: number) => (
                            <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 hover:border-indigo-300 transition-all duration-200">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg font-bold text-sm">
                                            {day.day}
                                        </div>
                                        <h4 className="font-semibold text-slate-900">Day {day.day}</h4>
                                    </div>
                                    <button 
                                        type="button" 
                                        disabled={formData.itinerary.length <= 1}
                                        onClick={() => removeItineraryItem(i)} 
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all duration-200 disabled:opacity-30"
                                    >
                                        <XCircle className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500">Day Title</label>
                                        <input 
                                            value={day.title} 
                                            onChange={(e) => handleItineraryChange(i, 'title', e.target.value)}
                                            className={inputBase} 
                                            placeholder="Day title" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500">Description</label>
                                        <textarea 
                                            value={day.description} 
                                            onChange={(e) => handleItineraryChange(i, 'description', e.target.value)}
                                            className={`${inputBase} resize-none`} 
                                            rows={2}
                                            placeholder="Day description" 
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button 
                            type="button" 
                            onClick={addItineraryItem} 
                            className="w-full flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400 transition-all duration-200"
                        >
                            <Plus className="w-4 h-4" /> Add Day
                        </button>
                    </div>
                </SectionCard>

                {/* FAQs */}
                <SectionCard title="Frequently Asked Questions" subtitle="Common questions and answers" icon={HelpCircle}>
                    <div className="space-y-6">
                        {formData.faqs.map((faq: any, i: number) => (
                            <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 hover:border-indigo-300 transition-all duration-200">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-8 h-8 bg-purple-100 text-purple-600 rounded-lg font-bold text-sm">
                                            {i + 1}
                                        </div>
                                        <h4 className="font-semibold text-slate-900">FAQ {i + 1}</h4>
                                    </div>
                                    <button 
                                        type="button" 
                                        disabled={formData.faqs.length <= 1}
                                        onClick={() => removeFAQ(i)} 
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all duration-200 disabled:opacity-30"
                                    >
                                        <XCircle className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500">Question</label>
                                        <input 
                                            value={faq.question} 
                                            onChange={(e) => handleFAQChange(i, 'question', e.target.value)}
                                            className={inputBase} 
                                            placeholder="Question" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500">Answer</label>
                                        <textarea 
                                            value={faq.answer} 
                                            onChange={(e) => handleFAQChange(i, 'answer', e.target.value)}
                                            className={`${inputBase} resize-none`} 
                                            rows={3}
                                            placeholder="Answer" 
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button 
                            type="button" 
                            onClick={addFAQ} 
                            className="w-full flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400 transition-all duration-200"
                        >
                            <Plus className="w-4 h-4" /> Add FAQ
                        </button>
                    </div>
                </SectionCard>

                {/* Booking Options */}
                <SectionCard title="Booking Options" subtitle="Different pricing tiers and options" icon={Settings}>
                    <div className="space-y-6">
                        {formData.bookingOptions.map((option: any, i: number) => (
                            <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 hover:border-indigo-300 transition-all duration-200">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-lg font-bold text-sm">
                                            {i + 1}
                                        </div>
                                        <h4 className="font-semibold text-slate-900">Option {i + 1}</h4>
                                    </div>
                                    <button 
                                        type="button" 
                                        disabled={formData.bookingOptions.length <= 1}
                                        onClick={() => removeBookingOption(i)} 
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all duration-200 disabled:opacity-30"
                                    >
                                        <XCircle className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500">Type</label>
                                        <div className="relative">
                                            <select 
                                                value={option.type} 
                                                onChange={(e) => handleBookingOptionChange(i, 'type', e.target.value)}
                                                className={`${inputBase} appearance-none cursor-pointer`}
                                            >
                                                <option value="Per Person">Per Person</option>
                                                <option value="Per Group">Per Group</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500">Label</label>
                                        <input 
                                            value={option.label} 
                                            onChange={(e) => handleBookingOptionChange(i, 'label', e.target.value)}
                                            className={inputBase} 
                                            placeholder="Option label" 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-slate-500">Price</label>
                                        <div className="relative">
                                            <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                value={option.price} 
                                                onChange={(e) => handleBookingOptionChange(i, 'price', parseFloat(e.target.value))}
                                                className={`${inputBase} pl-10`} 
                                                placeholder="Price" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button 
                            type="button" 
                            onClick={addBookingOption} 
                            className="w-full flex items-center justify-center gap-2 px-4 py-4 text-sm font-semibold text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400 transition-all duration-200"
                        >
                            <Plus className="w-4 h-4" /> Add Booking Option
                        </button>
                    </div>
                </SectionCard>


{/* Enhanced Booking Options Section */}
<SectionCard title="Booking Options" subtitle="Different pricing tiers and booking choices" icon={Settings}>
    <div className="space-y-6">
        {/* Booking Options Preview */}
        {formData.bookingOptions.length > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                    <Eye className="h-5 w-5 text-blue-500" />
                    Preview - How customers see booking options
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {formData.bookingOptions.map((option: any, index: number) => (
                        <div key={index} className="bg-white p-4 rounded-lg border border-slate-200 hover:border-blue-300 transition-all duration-200">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h5 className="font-semibold text-slate-900 mb-1">
                                        {option.label || `Option ${index + 1}`}
                                    </h5>
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                        <Users className="h-4 w-4" />
                                        <span>{option.type}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-slate-900">
                                        €{option.price?.toFixed(2) || '0.00'}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {option.type === 'Per Person' ? 'per person' : 'per group'}
                                    </div>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-center w-full py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium">
                                    Select Option
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Booking Options Editor */}
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-indigo-500" />
                    <h4 className="text-lg font-semibold text-slate-800">Configure Booking Options</h4>
                </div>
                <div className="text-sm text-slate-500">
                    {formData.bookingOptions.length} option{formData.bookingOptions.length !== 1 ? 's' : ''}
                </div>
            </div>

            {formData.bookingOptions.map((option: any, index: number) => (
                <div key={index} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-300 transition-all duration-200">
                    {/* Option Header */}
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg font-bold text-sm">
                                    {index + 1}
                                </div>
                                <div>
                                    <h5 className="font-semibold text-slate-900">
                                        {option.label || `Booking Option ${index + 1}`}
                                    </h5>
                                    <p className="text-sm text-slate-500">
                                        {option.type} - €{option.price?.toFixed(2) || '0.00'}
                                    </p>
                                </div>
                            </div>
                            <button 
                                type="button" 
                                disabled={formData.bookingOptions.length <= 1}
                                onClick={() => removeBookingOption(index)} 
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                                title={formData.bookingOptions.length <= 1 ? "At least one booking option is required" : "Remove this option"}
                            >
                                <XCircle className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Option Configuration */}
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Option Label */}
                            <div className="md:col-span-1 space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    Option Name *
                                </label>
                                <input 
                                    value={option.label || ''} 
                                    onChange={(e) => handleBookingOptionChange(index, 'label', e.target.value)}
                                    className={inputBase}
                                    placeholder="e.g., Standard Tour, Premium Experience"
                                    required
                                />
                                <SmallHint>This is the main name customers will see</SmallHint>
                            </div>

                            {/* Pricing Type */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    Pricing Type *
                                </label>
                                <div className="relative">
                                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <select 
                                        value={option.type || 'Per Person'} 
                                        onChange={(e) => handleBookingOptionChange(index, 'type', e.target.value)}
                                        className={`${inputBase} pl-10 appearance-none cursor-pointer`}
                                    >
                                        <option value="Per Person">Per Person</option>
                                        <option value="Per Group">Per Group</option>
                                        <option value="Per Couple">Per Couple</option>
                                        <option value="Per Family">Per Family (up to 4)</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                </div>
                                <SmallHint>How the price is calculated</SmallHint>
                            </div>

                            {/* Price */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    Price (€) *
                                </label>
                                <div className="relative">
                                    <Euro className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={option.price || ''} 
                                        onChange={(e) => handleBookingOptionChange(index, 'price', parseFloat(e.target.value) || 0)}
                                        className={`${inputBase} pl-10`}
                                        placeholder="0.00"
                                        min="0"
                                        required
                                    />
                                </div>
                                <SmallHint>Base price for this option</SmallHint>
                            </div>
                        </div>

                        {/* Option Description (Optional) */}
                        <div className="mt-6 space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                                Description (Optional)
                            </label>
                            <textarea
                                value={option.description || ''}
                                onChange={(e) => handleBookingOptionChange(index, 'description', e.target.value)}
                                rows={2}
                                className={`${inputBase} resize-none`}
                                placeholder="Brief description of what's included in this option..."
                            />
                            <SmallHint>Explain what makes this option special or different</SmallHint>
                        </div>

                        {/* Quick Price Calculator Preview */}
                        {option.price && (
                            <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                                <h6 className="font-medium text-slate-700 mb-2">Price Examples:</h6>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div className="text-center p-2 bg-white rounded border">
                                        <div className="font-semibold">1 {option.type === 'Per Person' ? 'Person' : 'Group'}</div>
                                        <div className="text-indigo-600 font-bold">€{option.price?.toFixed(2)}</div>
                                    </div>
                                    {option.type === 'Per Person' && (
                                        <>
                                            <div className="text-center p-2 bg-white rounded border">
                                                <div className="font-semibold">2 People</div>
                                                <div className="text-indigo-600 font-bold">€{(option.price * 2)?.toFixed(2)}</div>
                                            </div>
                                            <div className="text-center p-2 bg-white rounded border">
                                                <div className="font-semibold">4 People</div>
                                                <div className="text-indigo-600 font-bold">€{(option.price * 4)?.toFixed(2)}</div>
                                            </div>
                                            <div className="text-center p-2 bg-white rounded border">
                                                <div className="font-semibold">6 People</div>
                                                <div className="text-indigo-600 font-bold">€{(option.price * 6)?.toFixed(2)}</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>

        {/* Add New Booking Option Button */}
        <button 
            type="button" 
            onClick={addBookingOption} 
            className="w-full flex items-center justify-center gap-3 px-6 py-4 text-sm font-semibold text-indigo-600 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-400 transition-all duration-200 group"
        >
            <Plus className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" /> 
            Add Booking Option
        </button>

        {/* Best Practices Help */}
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                    <h6 className="font-semibold text-amber-800 mb-1">Booking Options Best Practices:</h6>
                    <ul className="text-sm text-amber-700 space-y-1">
                        <li>• Create 2-3 clear options (Standard, Premium, VIP)</li>
                        <li>• Use descriptive names that highlight value</li>
                        <li>• Price differences should be meaningful (not just €1-2)</li>
                        <li>• Consider group discounts for "Per Group" pricing</li>
                        <li>• Test your options from a customer's perspective</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</SectionCard>

                {/* Availability */}
                {formData.availability && (
                    <AvailabilityManager
                        availability={formData.availability}
                        setAvailability={setAvailability}
                    />
                )}

                {/* Final Settings */}
                <div className="bg-gradient-to-br from-white to-slate-50 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/40 p-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input 
                                    id="isFeatured" 
                                    name="isFeatured" 
                                    type="checkbox" 
                                    checked={formData.isFeatured} 
                                    onChange={handleChange} 
                                    className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 focus:ring-2" 
                                />
                                <div className="flex items-center gap-2">
                                    <Star className="h-5 w-5 text-yellow-500 group-hover:text-yellow-600 transition-colors" />
                                    <span className="text-sm font-semibold text-slate-700">Featured tour</span>
                                </div>
                            </label>
                            <SmallHint className="mt-0">Show this tour in homepage featured carousel.</SmallHint>
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={isSubmitting || isUploading} 
                            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Check className="h-5 w-5" />
                                    <span>Save Tour</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}