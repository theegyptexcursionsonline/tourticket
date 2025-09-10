'use client';

import React from 'react';
import { Smile, Users, Bus, Ship, Moon, Camera } from 'lucide-react';

// --- Reusable Icons Component ---
const icons = { Smile, Users, Bus, Ship, Moon, Camera };

const interests = [
    {
        name: 'FUN',
        products: 212,
        icon: 'Smile',
        color: 'from-red-500 to-rose-600',
    },
    {
        name: 'FAMILY-FRIENDLY',
        products: 180,
        icon: 'Users',
        color: 'from-blue-500 to-indigo-600',
    },
    {
        name: 'BUS TOURS',
        products: 59,
        icon: 'Bus',
        color: 'from-yellow-500 to-orange-600',
    },
    {
        name: 'ON THE WATER',
        products: 66,
        icon: 'Ship',
        color: 'from-cyan-500 to-sky-600',
    },
    {
        name: 'NIGHTLIFE',
        products: 26,
        icon: 'Moon',
        color: 'from-indigo-500 to-purple-600',
    },
    {
        name: 'SELFIE MUSEUM',
        products: 40,
        icon: 'Camera',
        color: 'from-pink-500 to-fuchsia-600',
    },
];

const InterestCard = ({ interest }: { interest: typeof interests[0] }) => {
    const IconComponent = icons[interest.icon as keyof typeof icons];
    return (
        <a 
            href="#" 
            className="relative block bg-slate-900 border-2 border-slate-800 transform transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl hover:border-red-500 overflow-hidden group"
        >
            <div className={`absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-tr ${interest.color} rounded-full opacity-20 group-hover:scale-125 transition-transform duration-500`}></div>
            <div className="p-8 text-white relative z-10 flex flex-col justify-between h-48">
                <IconComponent className="w-12 h-12 text-white group-hover:text-red-500 transition-colors duration-300 mb-4" />
                <div>
                    <h3 className="font-extrabold text-2xl tracking-tight leading-tight uppercase">{interest.name}</h3>
                    <p className="text-sm text-slate-400 mt-2">{interest.products} products</p>
                </div>
            </div>
        </a>
    );
};

export default function PopularInterests() {
    return (
        <section className="bg-slate-50 py-20 font-sans">
            <div className="container mx-auto px-4">
                <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 text-center mb-12 tracking-tight">
                    Activities based on popular interests
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                    {interests.map(interest => (
                        <InterestCard key={interest.name} interest={interest} />
                    ))}
                </div>
            </div>
        </section>
    );
}