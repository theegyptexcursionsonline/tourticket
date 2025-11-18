// hooks/useDestinations.ts
import { useState, useEffect } from 'react';
import { DestinationWithTourCount, ApiResponse, Destination } from '@/types';
import { getOptimizedImageUrl } from '@/utils/cloudinary';

interface Tour {
  _id: string;
  destination: string | { _id: string };
  title: string;
  isActive: boolean;
}

export const useDestinations = () => {
  const [destinations, setDestinations] = useState<DestinationWithTourCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDestinationsWithTourCounts = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch destinations and tours in parallel - NO CACHING
        const [destResponse, toursResponse] = await Promise.all([
          fetch('/api/destinations', {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate'
            }
          }),
          fetch('/api/tours/public', {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate'
            }
          })
        ]);

        if (!destResponse.ok) {
          throw new Error(`Failed to fetch destinations: ${destResponse.statusText}`);
        }

        const destData: ApiResponse<Destination[]> = await destResponse.json();
        
        if (!destData.success) {
          throw new Error(destData.error || 'Failed to fetch destinations');
        }

        let toursData: ApiResponse<Tour[]> = { success: true, data: [] };
        
        if (toursResponse.ok) {
          toursData = await toursResponse.json();
        }

        // Process destinations with optimized images and tour counts
        const destinationsWithCounts = destData.data.map((destination: Destination) => {
          let tourCount = 0;
          
          if (toursData.success && toursData.data) {
            tourCount = toursData.data.filter((tour: Tour) => {
              const destId = typeof tour.destination === 'string' 
                ? tour.destination 
                : tour.destination._id;
              return destId === destination._id;
            }).length;
          }
          
          // Fallback count if no real tours
          if (tourCount === 0) {
            tourCount = 3;
          }

          return {
            ...destination,
            // Optimize image URL for fast loading
            image: destination.image ? getOptimizedImageUrl(destination.image, {
              width: 320,
              height: 320,
              quality: '80'
            }) : '',
            tourCount
          };
        });

        setDestinations(destinationsWithCounts);
      } catch (error) {
        console.error('Failed to fetch destinations:', error);
        setError(error instanceof Error ? error.message : 'An error occurred');
        
        // Fallback to mock data
        setDestinations(getMockDestinations());
      } finally {
        setIsLoading(false);
      }
    };

    fetchDestinationsWithTourCounts();
  }, []);

  return { destinations, isLoading, error, refetch: () => window.location.reload() };
};

const getMockDestinations = (): DestinationWithTourCount[] => [
  {
    _id: 'mock-1',
    name: 'Bali',
    slug: 'bali',
    country: 'Indonesia',
    image: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=320&h=320&fit=crop&auto=format&q=80',
    description: 'Tropical paradise with beautiful beaches and rich culture',
    tourCount: 3
  },
  {
    _id: 'mock-2',
    name: 'Dubai',
    slug: 'dubai', 
    country: 'UAE',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=320&h=320&fit=crop&auto=format&q=80',
    description: 'Modern city with luxury shopping and stunning architecture',
    tourCount: 3
  },
  {
    _id: 'mock-3',
    name: 'New York City',
    slug: 'new-york-city',
    country: 'USA', 
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=320&h=320&fit=crop&auto=format&q=80',
    description: 'The city that never sleeps with iconic landmarks',
    tourCount: 3
  },
  {
    _id: 'mock-4',
    name: 'Paris',
    slug: 'paris',
    country: 'France',
    image: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=320&h=320&fit=crop&auto=format&q=80',
    description: 'City of light with romantic atmosphere and rich history',
    tourCount: 3
  },
  {
    _id: 'mock-5',
    name: 'Rome',
    slug: 'rome',
    country: 'Italy',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=320&h=320&fit=crop&auto=format&q=80',
    description: 'Eternal city with ancient history and stunning architecture',
    tourCount: 3
  }
];