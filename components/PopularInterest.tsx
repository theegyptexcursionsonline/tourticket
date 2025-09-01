'use client';

import { Smile, Users, Bus, Ship, Moon, Camera } from 'lucide-react';
import React from 'react';

const interests = [
    {
        name: 'FUN',
        products: 212,
        icon: Smile,
        color: 'bg-red-500',
    },
    {
        name: 'FAMILY-FRIENDLY',
        products: 180,
        icon: Users,
        color: 'bg-blue-500',
    },
    {
        name: 'BUS TOURS',
        products: 59,
        icon: Bus,
        color: 'bg-yellow-500',
    },
    {
        name: 'ON THE WATER',
        products: 66,
        icon: Ship,
        color: 'bg-cyan-500',
    },
    {
        name: 'NIGHTLIFE',
        products: 26,
        icon: Moon,
        color: 'bg-indigo-500',
    },
    {
        name: 'SELFIE MUSEUM',
        products: 40,
        icon: Camera,
        color: 'bg-pink-500',
    },
];

const InterestCard = ({ interest }: { interest: typeof interests[0] }) => {
    const Icon = interest.icon;
    return (
        <a href="#" className="relative block bg-slate-800 rounded-lg overflow-hidden group transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
            <div className={`absolute -bottom-8 -right-8 w-32 h-32 ${interest.color} rounded-full opacity-20 group-hover:opacity-30 transition-opacity duration-300`}></div>
            <div className="p-6 text-white relative z-10">
                <Icon className="w-12 h-12 mb-4 opacity-80" />
                <h3 className="font-extrabold text-2xl">{interest.name}</h3>
                <p className="text-sm opacity-70 mt-1">{interest.products} products</p>
            </div>
        </a>
    );
};

export default function PopularInterests() {
    return (
        <section className="bg-slate-50 py-16">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl font-extrabold text-slate-800 text-center mb-10">
                    Activities based on popular interests
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {interests.map(interest => (
                        <InterestCard key={interest.name} interest={interest} />
                    ))}
                </div>
            </div>
        </section>
    );
}
