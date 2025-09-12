// app/admin/tours/edit/[id]/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import withAuth from '@/components/admin/withAuth';
import { Calendar, Clock, Plus, Trash2, X } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

// --- Helper: Availability Manager Component ---
// For clarity, this could be a separate file, but is included here for simplicity.
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
        const newSlots = [...availability.slots, { time: '12:00 PM', capacity: 10 }];
        setAvailability({ ...availability, slots: newSlots });
    };

    const removeSlot = (index: number) => {
        const newSlots = availability.slots.filter((_: any, i: number) => i !== index);
        setAvailability({ ...availability, slots: newSlots });
    };

    const handleDayToggle = (dayIndex: number) => {
        const newAvailableDays = [...availability.availableDays];
        if (newAvailableDays.includes(dayIndex)) {
            setAvailability({ ...availability, availableDays: newAvailableDays.filter(d => d !== dayIndex) });
        } else {
            setAvailability({ ...availability, availableDays: [...newAvailableDays, dayIndex] });
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mt-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Availability & Scheduling</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Availability Type</label>
                    <select value={availability.type} onChange={handleTypeChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md">
                        <option value="daily">Daily (Repeats Weekly)</option>
                        <option value="date_range">Date Range</option>
                        <option value="specific_dates">Specific Dates</option>
                    </select>
                </div>
            </div>
            {/* Conditional Inputs */}
            {availability.type === 'daily' && (
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Available Days</label>
                    <div className="flex space-x-2 mt-2">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                            <button key={day} type="button" onClick={() => handleDayToggle(index)} className={`px-3 py-1 text-sm rounded-full ${availability.availableDays?.includes(index) ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {/* Time Slots */}
            <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-900">Time Slots & Capacity</h3>
                 {availability.slots?.map((slot: any, index: number) => (
                    <div key={index} className="flex items-center gap-4 mt-2">
                        <input type="time" value={slot.time} onChange={(e) => handleSlotChange(index, 'time', e.target.value)} className="p-2 border rounded" />
                        <input type="number" value={slot.capacity} onChange={(e) => handleSlotChange(index, 'capacity', Number(e.target.value))} className="p-2 border rounded w-24" placeholder="Capacity" />
                        <button type="button" onClick={() => removeSlot(index)} className="text-red-500 hover:text-red-700"><Trash2 className="h-5 w-5"/></button>
                    </div>
                ))}
                <button type="button" onClick={addSlot} className="mt-2 flex items-center gap-2 px-3 py-1 text-sm font-semibold text-white bg-slate-700 rounded-md hover:bg-slate-800">
                    <Plus className="h-4 w-4"/> Add Time Slot
                </button>
            </div>
        </div>
    );
};


const EditTourPage = () => {
    const [tourData, setTourData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const params = useParams();
    const router = useRouter();
    const id = params.id;

    useEffect(() => {
        if (id) {
            fetch(`/api/admin/tours/${id}`)
                .then(res => res.json())
                .then(data => {
                    // Ensure availability is a non-null object
                    data.availability = data.availability || { type: 'daily', slots: [] };
                    if (!data.availability.slots) data.availability.slots = [];
                    if (!data.availability.availableDays) data.availability.availableDays = [0,1,2,3,4,5,6];
                    
                    setTourData(data);
                    setLoading(false);
                })
                .catch(err => {
                    setError('Failed to load tour data.');
                    setLoading(false);
                });
        }
    }, [id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setTourData({ ...tourData, [name]: value });
    };

    const setAvailability = (availabilityData: any) => {
        setTourData({ ...tourData, availability: availabilityData });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetch(`/api/admin/tours/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tourData),
            });
            if (!response.ok) throw new Error('Failed to update tour');
            router.push('/admin/tours');
        } catch (err) {
            setError((err as Error).message);
        }
    };

    if (loading) return <p>Loading tour...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6 text-slate-800">Edit Tour</h1>
            <form onSubmit={handleSubmit}>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                            <input type="text" name="title" id="title" value={tourData.title || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"/>
                        </div>
                         <div>
                            <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Duration</label>
                            <input type="text" name="duration" id="duration" value={tourData.duration || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"/>
                        </div>
                        <div className="md:col-span-2">
                             <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                            <textarea name="description" id="description" value={tourData.description || ''} onChange={handleChange} rows={5} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500"></textarea>
                        </div>
                    </div>
                </div>

                {/* --- Availability Section --- */}
                {tourData.availability && (
                    <AvailabilityManager 
                        availability={tourData.availability} 
                        setAvailability={setAvailability}
                    />
                )}

                <div className="mt-6 flex justify-end">
                    <button type="submit" className="px-6 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700">
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
};

export default withAuth(EditTourPage);