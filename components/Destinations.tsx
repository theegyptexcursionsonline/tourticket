// components/Destinations.tsx
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Destination } from '@/types';
import { Loader2 } from 'lucide-react';

interface DestinationWithTourCount extends Destination {
  tourCount: number;
}

export default function Destinations() {
  const [destinations, setDestinations] = useState<DestinationWithTourCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDestinationsWithTourCounts = async () => {
      try {
        // Fetch destinations
        const destResponse = await fetch('/api/admin/tours/destinations');
        if (!destResponse.ok) {
          throw new Error(`Failed to fetch destinations: ${destResponse.statusText}`);
        }

        const destData = await destResponse.json();
        if (!destData.success) {
          console.error('API returned an error:', destData.error);
          return;
        }

        // Fetch tours to calculate counts
        const toursResponse = await fetch('/api/admin/tours');
        let toursData = { success: true, data: [] };
        
        if (toursResponse.ok) {
          toursData = await toursResponse.json();
        }

        // Calculate tour counts for each destination
        const destinationsWithCounts = destData.data.map((destination: Destination) => {
          let tourCount = 0;
          
          if (toursData.success && toursData.data) {
            // Count real tours for this destination
            tourCount = toursData.data.filter((tour: any) => 
              tour.destination === destination._id || 
              (tour.destination && tour.destination._id === destination._id)
            ).length;
          }
          
          // If no real tours, show mock count (3 sample tours per destination)
          if (tourCount === 0) {
            tourCount = 3;
          }

          return {
            ...destination,
            tourCount
          };
        });

        setDestinations(destinationsWithCounts);
      } catch (error) {
        console.error('Failed to fetch destinations:', error);
        
        // Fallback: show some mock destinations if API fails
        const mockDestinations = [
          {
            _id: 'mock-1',
            name: 'Bali',
            slug: 'bali',
            country: 'Indonesia',
            image: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=400&h=400&fit=crop',
            description: 'Tropical paradise with beautiful beaches and rich culture',
            tourCount: 3
          },
          {
            _id: 'mock-2',
            name: 'Dubai',
            slug: 'dubai', 
            country: 'UAE',
            image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400&h=400&fit=crop',
            description: 'Modern city with luxury shopping and stunning architecture',
            tourCount: 3
          },
          {
            _id: 'mock-3',
            name: 'New York City',
            slug: 'new-york-city',
            country: 'USA', 
            image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=400&h=400&fit=crop',
            description: 'The city that never sleeps with iconic landmarks',
            tourCount: 3
          },
          {
            _id: 'mock-4',
            name: 'Paris',
            slug: 'paris',
            country: 'France',
            image: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400&h=400&fit=crop',
            description: 'City of light with romantic atmosphere and rich history',
            tourCount: 3
          },
          {
            _id: 'mock-5',
            name: 'Rome',
            slug: 'rome',
            country: 'Italy',
            image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=400&fit=crop',
            description: 'Eternal city with ancient history and stunning architecture',
            tourCount: 3
          }
        ];
        setDestinations(mockDestinations);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDestinationsWithTourCounts();
  }, []);

  if (isLoading) {
    return (
      <section className="bg-white py-16 animate-pulse">
        <div className="container mx-auto px-4">
          <div className="h-10 w-1/3 bg-slate-200 rounded-lg mb-8" />
          <div className="flex justify-center gap-8 flex-wrap">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="text-center group cursor-pointer">
                <div className="w-40 h-40 rounded-full bg-slate-200 shadow-lg" />
                <div className="h-6 w-24 mx-auto mt-4 bg-slate-200 rounded" />
                <div className="h-4 w-16 mx-auto mt-2 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-extrabold text-slate-800 mb-8">
          Where are you going?
        </h2>
        <div className="flex justify-center gap-8 flex-wrap">
          {destinations.map((destination) => (
            <Link
              key={destination._id}
              href={`/destinations/${destination.slug}`}
              className="text-center group"
            >
              <div className="relative w-40 h-40 rounded-full overflow-hidden shadow-lg transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl bg-slate-200">
                {destination.image && destination.image !== 'UPLOAD_IMAGE_URL_HERE' && (
                  <Image
                    src={destination.image}
                    alt={destination.name}
                    width={160}
                    height={160}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors"></div>
              </div>
              <h3 className="mt-4 font-bold text-lg text-slate-800 group-hover:text-red-500 transition-colors">
                {destination.name}
              </h3>
              <p className="text-sm text-slate-500">
                {destination.tourCount} tour{destination.tourCount !== 1 ? 's' : ''}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}