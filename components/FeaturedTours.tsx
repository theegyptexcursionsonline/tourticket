'use client';

import { ArrowRight, Star } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';

type Tour = {
  id: number;
  image: string;
  title: string;
  duration: string;
  rating: number;
  bookings: number;
  originalPrice?: number;
  discountPrice: number;
  tags: string[];
};

const featuredTours: Tour[] = [
  { id: 1, image: '/tour-canal-cruise.jpg', title: '1 hour Amsterdam Canal Cruise', duration: '60 minutes', rating: 4.5, bookings: 4506416, originalPrice: 20, discountPrice: 15.50, tags: ['Online only deal', 'Staff favourite', '-25%'] },
  { id: 2, image: '/tour-pizza-cruise.jpg', title: 'New York Pizza by LOVERS Canal Cruise', duration: '75 minutes', rating: 4.6, bookings: 21080, originalPrice: 43.50, discountPrice: 37.50, tags: ['-15%'] },
  { id: 3, image: '/tour-evening-cruise.jpg', title: 'Amsterdam Evening & Night Boat Tour', duration: '60 minutes', rating: 4.5, bookings: 1256854, originalPrice: 20, discountPrice: 15.50, tags: ['Staff favourite', '-25%'] },
  { id: 4, image: '/tour-wine-cheese.jpg', title: 'Wine & Cheese Cruise in Amsterdam', duration: '90 minutes', rating: 4.9, bookings: 10245, originalPrice: 38.50, discountPrice: 35, tags: ['New', '-10%'] },
  { id: 5, image: '/tour-dinner-cruise.jpg', title: 'Amsterdam Dinner Cruise', duration: '2 hours', rating: 4.8, bookings: 5008, discountPrice: 89, tags: ['Staff favourite'] },
  { id: 6, image: '/tour-pancake-cruise.jpg', title: 'Pancake Cruise Amsterdam', duration: '75 minutes', rating: 4.8, bookings: 11859, discountPrice: 26, tags: [] },
];

const TourCard = ({ tour }: { tour: Tour }) => {
  const { formatPrice } = useSettings();

  const formatBookings = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'm';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
    return num.toString();
  };
  
  const getTagColor = (tag: string) => {
    if (tag.includes('%')) return 'bg-red-500 text-white';
    if (tag === 'Staff favourite') return 'bg-blue-500 text-white';
    if (tag === 'Online only deal') return 'bg-green-500 text-white';
    if (tag === 'New') return 'bg-purple-500 text-white';
    return 'bg-gray-200 text-gray-700';
  };

  return (
    <div className="flex-shrink-0 w-80 bg-white rounded-xl shadow-lg overflow-hidden snap-start transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
      <div className="relative">
        <img src="https://placehold.co/600x400/000000/FFFFFF?text=Tour+Image" alt={tour.title} className="w-full h-40 object-cover" />
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {tour.tags.map(tag => (
            <span key={tag} className={`px-2 py-1 text-xs font-bold rounded-md ${getTagColor(tag)}`}>
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between">
           <div className="flex items-center gap-2 text-sm text-gray-500">
             <div className="flex items-center gap-1">
                <Star size={16} className="text-yellow-500 fill-current" />
                <span className="font-bold">{tour.rating}</span>
             </div>
             <span>({formatBookings(tour.bookings)} bookings)</span>
           </div>
           <span className="text-sm text-gray-500">{tour.duration}</span>
        </div>
        <h3 className="mt-2 text-lg font-bold text-gray-800 h-14">{tour.title}</h3>
        <div className="mt-4 flex items-end justify-end gap-2">
            {tour.originalPrice && (
                <span className="text-gray-500 line-through">{formatPrice(tour.originalPrice)}</span>
            )}
            <span className="text-2xl font-extrabold text-red-600">{formatPrice(tour.discountPrice)}</span>
        </div>
      </div>
    </div>
  );
};

export default function FeaturedTours() {
  return (
    <section className="bg-slate-50 py-16">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900">Canal Cruises perfect for you</h2>
            <button className="flex items-center gap-2 text-red-600 font-semibold hover:text-red-700 transition-colors">
                <span>SEE ALL</span>
                <ArrowRight size={20} />
            </button>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {featuredTours.map(tour => (
                <TourCard key={tour.id} tour={tour} />
            ))}
        </div>
      </div>
    </section>
  );
}
