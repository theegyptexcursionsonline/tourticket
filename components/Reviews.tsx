'use client';

import React from 'react';
import { Star } from 'lucide-react';

// =================================================================
// --- REVIEWS DATA ---
// =================================================================
const reviewsData = [
    {
        name: '898yazans',
        date: 'Jun 1, 2025',
        text: 'I’ve had the pleasure of booking two trips through Yours & Ticket, and on both occasions, Luca has done an absolutely amazing job. He was incredibly friendly, professional, and welcoming from the very beginning, making the entire process smooth and enjoyable.',
        rating: 5,
    },
    {
        name: 'Southease_1967',
        date: 'Oct 24, 2024',
        text: 'Wow what can I say. 8 of us booked the windmills, clog, cheese and waffle tour. Guide was brilliant can\'t remember her name. But the driver Steff he was absolutely amazing. He made the trip. Piano playing had us singing and he is so funny.',
        rating: 5,
    },
    {
        name: 'LINDA AYE',
        date: 'Sep 14, 2024',
        text: 'One of the must do tour when you are in Amsterdam. Prices are reasonable and tour guides are the friendliest and knowledgeable. Highly recommended!',
        rating: 4,
    },
    {
        name: 'Lama Dakhakhni',
        date: 'Sep 14, 2024',
        text: 'The place is located at the water side from the station. Easy to find. The staff was speaking good English. They were very friendly.',
        rating: 5,
    },
     {
        name: 'Tanmay K. Mohapatra',
        date: 'Jul 20, 2024',
        text: 'Easy peasy. Quick and easy tickets.',
        rating: 4,
    },
];

// =================================================================
// --- STAR RATING COMPONENT (ENHANCED) ---
// This component now handles a fractional rating with a full-star display.
// =================================================================
const StarRating = ({ rating }: { rating: number }) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    return (
        <div className="relative inline-flex items-center">
            <div className="flex text-2xl text-slate-300">
                {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                ))}
            </div>
            <div
                className="absolute top-0 left-0 overflow-hidden flex"
                style={{ width: `${(rating / 5) * 100}%` }}
            >
                <div className="flex text-2xl text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-current" />
                    ))}
                </div>
            </div>
        </div>
    );
};

// =================================================================
// --- REVIEWS COMPONENT (ENHANCED) ---
// =================================================================
export default function Reviews() {
    return (
        <section className="bg-slate-50 py-20 font-sans">
            <div className="container mx-auto px-4">
                <div className="text-center mb-10">
                    <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
                        What Our Clients Say
                    </h2>
                    <div className="mt-6 flex flex-col items-center gap-2">
                        <p className="font-semibold text-slate-600">Based on 87 verified reviews</p>
                        <div className="flex items-center gap-4">
                            <span className="text-4xl font-extrabold text-slate-900 leading-none">4.9</span>
                            <StarRating rating={4.9} />
                        </div>
                        <p className="text-sm text-slate-500">Average rating from Tripadvisor</p>
                    </div>
                </div>

                <div className="flex overflow-x-auto gap-6 pb-4 scroll-smooth" style={{ scrollbarWidth: 'none', '-ms-overflow-style': 'none' }}>
                    <div className="flex-shrink-0 w-1"></div> {/* Left padding */}
                    {reviewsData.map((review, index) => (
                        <div 
                            key={index} 
                            className="flex-shrink-0 w-80 bg-white p-6 shadow-xl border border-slate-100 transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
                        >
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h4 className="font-bold text-slate-900 text-lg">{review.name}</h4>
                                    <p className="text-xs text-slate-400">{review.date}</p>
                                </div>
                                <StarRating rating={review.rating} />
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">
                                {review.text}
                            </p>
                        </div>
                    ))}
                    <div className="flex-shrink-0 w-1"></div> {/* Right padding */}
                </div>
            </div>
        </section>
    );
}