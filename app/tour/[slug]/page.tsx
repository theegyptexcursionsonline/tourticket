'use client';
import { ArrowLeft, Clock, Star, Users, ShoppingCart } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useSettings } from '@/hooks/useSettings';
import { useCart } from '@/contexts/CartContext';
import { Tour } from '@/types';

const tourData: { [key: string]: Tour } = {
  '1-hour-amsterdam-canal-cruise': {
    id: 1, image: 'https://images.unsplash.com/photo-1534214526114-0ea5d216e53d?q=80&w=2070&auto=format&fit=crop', title: '1 hour Amsterdam Canal Cruise', duration: '60 minutes', rating: 4.5, bookings: 4506416, originalPrice: 20, discountPrice: 15.50, tags: ['Online only deal', 'Staff favourite', '-25%'], description: 'Experience Amsterdam from a unique perspective with our 1-hour canal cruise. Sail through the city\'s historic waterways, marvel at the iconic canal houses, and learn about Amsterdam\'s rich history with our audio guide. This is the perfect way to see the city\'s highlights in a short amount of time.', highlights: ['See the famous canal houses and bridges', 'Audio guide available in multiple languages', 'Perfect for first-time visitors', 'Departs from a central location'],
  },
};

export default function TourPage({ params }: { params: { slug: string } }) {
  const tour = tourData[params.slug as keyof typeof tourData];
  const { formatPrice } = useSettings();
  const { addToCart } = useCart();

  if (!tour) {
    return <div>Tour not found</div>;
  }

  return (
    <>
      <Header startSolid={true} />
      <main className="bg-slate-50 pt-24">
        <div className="container mx-auto px-4 py-8">
          <a href="/" className="inline-flex items-center gap-2 text-red-600 font-semibold mb-6 hover:underline">
            <ArrowLeft size={20} />
            <span>Back to all tours</span>
          </a>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <img src={tour.image || "https://placehold.co/1200x800/000000/FFFFFF?text=Tour+Image"} alt={tour.title} className="w-full h-auto object-cover rounded-xl shadow-lg" />
              <div className="bg-white p-6 rounded-xl shadow-lg mt-8">
                <h1 className="text-4xl font-extrabold text-slate-800 mb-4">{tour.title}</h1>
                <p className="text-slate-600 leading-relaxed">{tour.description}</p>

                <h2 className="text-2xl font-bold text-slate-800 mt-8 mb-4">Highlights</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-600">
                  {tour.highlights?.map((highlight, index) => (
                    <li key={index}>{highlight}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-lg mt-8">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Reviews</h2>
                <div className="bg-slate-100 p-8 rounded-lg text-center">
                  <p className="text-slate-500 font-semibold">External review widget will be embedded here.</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-xl shadow-lg sticky top-28">
                <div className="flex items-baseline justify-end gap-2 mb-4">
                  {tour.originalPrice && (
                    <span className="text-slate-500 line-through">{formatPrice(tour.originalPrice)}</span>
                  )}
                  <span className="text-3xl font-extrabold text-red-600">{formatPrice(tour.discountPrice)}</span>
                </div>
                <div className="space-y-4 text-slate-600">
                  <div className="flex items-center gap-3">
                    <Clock size={20} className="text-red-500" />
                    <span>Duration: {tour.duration}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Star size={20} className="text-yellow-500" />
                    <span>Rating: {tour.rating}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users size={20} className="text-blue-500" />
                    <span>{tour.bookings?.toLocaleString()} bookings</span>
                  </div>
                </div>
                <button 
                  onClick={() => addToCart(tour)}
                  className="w-full mt-6 bg-red-600 text-white font-bold py-3 px-6 rounded-full hover:bg-red-700 transition-transform transform hover:scale-105 flex items-center justify-center gap-2">
                  <ShoppingCart size={20} />
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
