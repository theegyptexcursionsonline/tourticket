'use client';
import { useState } from 'react';
import { MapPin } from 'lucide-react';

const locations = [
    { city: 'ALL', count: 0 },
    { city: 'AMSTERDAM', count: 10 },
    { city: 'BERLIN', count: 5 },
    { city: 'COPENHAGEN', count: 3 },
    { city: 'STOCKHOLM', count: 4 },
];

export default function VisitUs() {
    const [activeCity, setActiveCity] = useState('ALL');

    return (
        <section className="bg-slate-50 py-16">
            <div className="container mx-auto px-4">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-extrabold text-slate-800">
                        VISIT US IN PERSON
                    </h2>
                    <button className="mt-2 text-slate-600 font-semibold hover:text-red-500 transition-colors">
                        CLICK TO SHOW MAP
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Map Placeholder */}
                    <div className="flex-1 lg:w-2/3 bg-slate-200 rounded-lg shadow-md flex items-center justify-center min-h-[400px]">
                        <p className="text-slate-500 font-semibold text-lg">Map Placeholder</p>
                    </div>

                    {/* Locations List */}
                    <div className="flex-1 lg:w-1/3">
                        <div className="flex flex-wrap gap-2 mb-4 border-b border-slate-200 pb-4">
                            {locations.map(location => (
                                <button
                                    key={location.city}
                                    onClick={() => setActiveCity(location.city)}
                                    className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
                                        activeCity === location.city
                                            ? 'bg-slate-800 text-white'
                                            : 'bg-white text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    {location.city}
                                </button>
                            ))}
                        </div>
                        
                        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
                            {/* Placeholder for location cards */}
                            {[...Array(8)].map((_, index) => (
                                <div key={index} className="bg-white p-4 rounded-lg shadow-sm flex items-start gap-4">
                                    <MapPin className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-slate-800">Store Location {index + 1}</h4>
                                        <p className="text-sm text-slate-500">123 Example Street, {activeCity}</p>
                                        <a href="#" className="text-sm text-red-600 font-semibold hover:underline mt-1 inline-block">View on map</a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
