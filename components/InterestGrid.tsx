'use client';
import { ArrowRight } from 'lucide-react';
import React from 'react';

const allInterests = [
    { name: 'FUN', products: 212 },
    { name: 'FAMILY-FRIENDLY', products: 180 },
    { name: 'SIGHTSEEING', products: 123 },
    { name: 'HISTORICAL', products: 107 },
    { name: 'BUS TOURS', products: 59 },
    { name: 'ON THE WATER', products: 66 },
    { name: 'ROMANTIC', products: 24 },
    { name: 'INSTAGRAM MUSEUMS', products: 41 },
    { name: 'PARTY', products: 19 },
    { name: 'ART', products: 49 },
    { name: 'WITH FOOD', products: 23 },
    { name: 'NIGHTLIFE', products: 26 },
    { name: 'SELFIE MUSEUM', products: 40 },
    { name: 'WITH DRINKS', products: 36 },
    { name: 'PLANTS & FLOWERS', products: 24 },
    { name: 'CROSSING THE BORDER', products: 2 },
    { name: 'BIKE TOURS', products: 4 },
    { name: 'WALKING TOURS', products: 9 },
    { name: 'ANIMALS', products: 13 },
];

const InterestButton = ({ interest }: { interest: typeof allInterests[0] }) => (
    <a 
        href="#" 
        className="block bg-white p-5 shadow-lg border-2 border-transparent hover:border-red-600 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ease-in-out"
    >
        <h4 className="font-extrabold text-slate-800 text-lg uppercase tracking-wide">{interest.name}</h4>
        <p className="text-sm text-slate-500 mt-1">{interest.products} products</p>
    </a>
);

export default function InterestGrid() {
    return (
        <section className="bg-slate-50 py-20">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                        Egypt Excursions Online
                    </h2>
                    <a href="#" className="mt-6 inline-flex items-center gap-3 px-8 py-3 font-bold text-red-600 border-2 border-red-600 hover:bg-red-600 hover:text-white transition-all duration-300 group">
                        <span>FIND THE RIGHT INTEREST FOR YOU</span>
                        <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </a>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {allInterests.map(interest => (
                        <InterestButton key={interest.name} interest={interest} />
                    ))}
                </div>
            </div>
        </section>
    );
}