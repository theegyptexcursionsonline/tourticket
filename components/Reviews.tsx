'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';
import { Star } from 'lucide-react';

type Review = {
  name: string;
  country: string;
  review: string;
  rating: number;
  datePublished?: string;
};

const reviewsData: Review[] = [
  {
    name: 'Aisha',
    country: 'Egypt',
    review:
      'Amazing Nile sunset cruise—the guide was exceptional and the dinner unforgettable.',
    rating: 5,
    datePublished: '2024-11-12',
  },
  {
    name: 'Luca',
    country: 'Italy',
    review:
      'Private pyramid tour at sunrise was once-in-a-lifetime. Highly recommended.',
    rating: 5,
    datePublished: '2024-10-02',
  },
  {
    name: 'Maya',
    country: 'UK',
    review:
      'Seamless booking and the felucca ride on the Nile was so peaceful and beautiful.',
    rating: 5,
    datePublished: '2024-09-15',
  },
 
];

const initials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

const avatarColor = (name: string) => {
  const colors = [
    'from-amber-400 to-amber-500',
    'from-rose-400 to-rose-500',
    'from-indigo-400 to-indigo-500',
    'from-green-400 to-green-500',
    'from-sky-400 to-sky-500',
    'from-pink-400 to-pink-500',
  ];
  const idx =
    Math.abs(
      name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0),
    ) % colors.length;
  return colors[idx];
};

export default function Reviews({
  elfsightAppId = '0fea9001-da59-4955-b598-76327377c50c',
}: {
  elfsightAppId?: string;
}) {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const tryInit = () => {
      try {
        if (typeof w?.elfsightInit === 'function') {
          w.elfsightInit();
        } else if (w?.Elf && typeof w.Elf.init === 'function') {
          w.Elf.init();
        }
      } catch {
        // ignore
      }
    };
    tryInit();
    const t = setTimeout(tryInit, 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <Script
        src="https://elfsightcdn.com/platform.js"
        strategy="afterInteractive"
      />

      <section className="bg-gray-50 py-12 md:py-20">
        <div className="container mx-auto px-4">
          {/* Heading */}
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-gray-800">
              What Our Guests Say
            </h2>
            <p className="text-gray-600">
              Real stories from our valued customers.
            </p>
          </div>

          {/* Row 1: Our reviews */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-16">
            {reviewsData.map((r, i) => (
              <article key={i} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center mb-3">
                  <div
                    className={`w-12 h-12 rounded-full mr-4 flex items-center justify-center text-white font-semibold text-sm bg-gradient-to-br ${avatarColor(
                      r.name,
                    )}`}
                    title={r.name}
                  >
                    {initials(r.name)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{r.name}</h3>
                    <p className="text-sm text-gray-500">{r.country}</p>
                  </div>
                </div>

                <p className="text-gray-600 mb-4 text-sm">“{r.review}”</p>

                <div className="flex">
                  {[...Array(5)].map((_, idx) => (
                    <Star
                      key={idx}
                      className={`h-5 w-5 ${
                        idx < r.rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                      fill="currentColor"
                    />
                  ))}
                </div>
              </article>
            ))}
          </div>

          {/* Row 2: Elfsight widget, full width */}
          <div className="w-full">
            <div
              className={`elfsight-app-${elfsightAppId}`}
              data-elfsight-app-lazy
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </section>
    </>
  );
}
