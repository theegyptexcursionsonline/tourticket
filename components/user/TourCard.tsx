'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Tour } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { useWishlist } from '@/contexts/WishlistContext';
import { Star, Clock, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface TourCardProps {
  tour: Tour;
  onRemove?: (tourId: string) => void;
}

export const UserTourCard: React.FC<TourCardProps> = ({ tour, onRemove }) => {
  const { formatPrice } = useSettings();
  const { removeFromWishlist } = useWishlist();

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Use the passed onRemove function, or default to the context's function
    if (onRemove) {
      onRemove(tour._id!);
    } else {
      removeFromWishlist(tour._id!);
    }
    toast.success(`${tour.title} removed from favorites.`);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="flex flex-col sm:flex-row">
        <div className="relative w-full h-48 sm:w-48 sm:h-auto flex-shrink-0">
          <Link href={`/tour/${tour.slug}`}>
            <Image
              src={tour.image}
              alt={tour.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 192px"
            />
          </Link>
        </div>
        <div className="p-4 sm:p-5 flex flex-col flex-grow">
          <h3 className="text-lg font-semibold text-slate-900 leading-tight mb-2 line-clamp-2">
            <Link href={`/tour/${tour.slug}`} className="hover:text-red-600 transition-colors">
              {tour.title}
            </Link>
          </h3>
          <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
            <div className="flex items-center gap-1.5"><Clock size={14} /><span>{tour.duration}</span></div>
            <div className="flex items-center gap-1.5"><Star size={14} className="text-yellow-500 fill-current" /><span>{tour.rating}</span></div>
          </div>
          <div className="mt-auto flex items-end justify-between">
            <div className="text-right">
                <span className="text-xl font-bold text-red-600">{formatPrice(tour.discountPrice)}</span>
            </div>
            <button
              onClick={handleRemove}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors text-sm font-medium"
              aria-label="Remove from favorites"
            >
              <Trash2 size={14} />
              <span>Remove</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

