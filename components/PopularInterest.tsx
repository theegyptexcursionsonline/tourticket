'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Smile, Users, Bus, Ship, Moon, Camera, Star, ArrowRight,
  AlertCircle, MapPin, Calendar, Trophy, Target, Globe, Heart
} from 'lucide-react';

// --- TYPES & INTERFACES ---
interface Interest {
  _id: string;
  type: 'category' | 'attraction';
  name: string;
  slug: string;
  products: number;
  featured?: boolean;
}

const icons = {
  Smile, Users, Bus, Ship, Moon, Camera, MapPin, Calendar, Trophy, Target, Globe, Star, Heart
} as const;
type IconKey = keyof typeof icons;

// --- CONFIGURATION ---
const DEFAULT_ICON: IconKey = 'Target';
const DEFAULT_COLOR = 'text-slate-600 bg-slate-100';

const INTEREST_CONFIG: { key: string; icon: IconKey; color: string }[] = [
  { key: 'adventure', icon: 'Target', color: 'text-green-600 bg-green-50' },
  { key: 'cultural', icon: 'Camera', color: 'text-purple-600 bg-purple-50' },
  { key: 'history', icon: 'Camera', color: 'text-purple-600 bg-purple-50' },
  { key: 'city', icon: 'MapPin', color: 'text-blue-600 bg-blue-50' },
  { key: 'cruise', icon: 'Ship', color: 'text-cyan-600 bg-cyan-50' },
  { key: 'water', icon: 'Ship', color: 'text-cyan-600 bg-cyan-50' },
  { key: 'budget', icon: 'Smile', color: 'text-orange-600 bg-orange-50' },
  { key: 'group', icon: 'Users', color: 'text-pink-600 bg-pink-50' },
  { key: 'family', icon: 'Heart', color: 'text-pink-600 bg-pink-50' },
  { key: 'night', icon: 'Moon', color: 'text-indigo-600 bg-indigo-50' },
  { key: 'day', icon: 'Calendar', color: 'text-yellow-600 bg-yellow-50' },
  { key: 'premium', icon: 'Trophy', color: 'text-violet-600 bg-violet-50' },
  { key: 'luxury', icon: 'Trophy', color: 'text-violet-600 bg-violet-50' },
  { key: 'local', icon: 'Globe', color: 'text-teal-600 bg-teal-50' },
];

const getInterestStyle = (name: string, type: string) => {
  const lowerName = name.toLowerCase();
  const config = INTEREST_CONFIG.find(c => lowerName.includes(c.key));

  if (config) {
    return { Icon: icons[config.icon], colorClass: config.color };
  }

  const iconKey = type === 'attraction' ? 'Star' : DEFAULT_ICON;
  const colorClass = type === 'attraction' ? 'text-emerald-600 bg-emerald-50' : DEFAULT_COLOR;

  return { Icon: icons[iconKey], colorClass };
};

// --- SUB-COMPONENTS ---

const InterestCard = ({ interest }: { interest: Interest }) => {
  const { Icon, colorClass } = getInterestStyle(interest.name, interest.type);
  const linkUrl = interest.type === 'attraction' ? `/attraction/${interest.slug}` : `/interests/${interest.slug}`;

  return (
    <Link
      href={linkUrl}
      className="group flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
      aria-label={`Explore ${interest.name}`}
    >
      <div className="p-6 flex-grow flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between">
            <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${colorClass} transition-all duration-300 group-hover:scale-110`}>
              <Icon className="w-6 h-6" />
            </div>
            {interest.featured && (
              <div className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                Featured
              </div>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-800 mt-4 line-clamp-2">
            {interest.name}
          </h3>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <p className="text-slate-500">
            {interest.products} {interest.products === 1 ? 'experience' : 'experiences'}
          </p>
          <div className="flex items-center text-red-600 font-semibold opacity-0 group-hover:opacity-100 transform translate-x-[-8px] group-hover:translate-x-0 transition-all duration-300">
            Explore <ArrowRight className="w-4 h-4 ml-1" />
          </div>
        </div>
      </div>
    </Link>
  );
};

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
          <div className="h-5 w-16 bg-slate-200 rounded-full"></div>
        </div>
        <div className="h-6 w-3/4 bg-slate-200 rounded mt-4"></div>
        <div className="mt-4 flex justify-between items-center">
          <div className="h-5 w-24 bg-slate-200 rounded"></div>
          <div className="h-5 w-20 bg-slate-200 rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

const InfoState = ({ icon, title, message, children }: { icon: React.ReactNode, title: string, message: string, children?: React.ReactNode }) => (
  <div className="text-center py-16">
    <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 text-slate-500 rounded-full mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
    <p className="text-slate-600 max-w-md mx-auto mb-6">{message}</p>
    {children}
  </div>
);

// --- MAIN COMPONENT ---

export default function PopularInterests() {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // --- NOTE: Using a placeholder API. Replace with your actual endpoint.
        const response = await fetch('/api/interests/popular');
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setInterests(data.data);
        } else {
          throw new Error('Invalid data format received from server.');
        }
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred.');
        // Fallback data for demonstration purposes
        setInterests([
            { _id: '1', name: 'Cultural Tours', slug: 'cultural-tours', products: 12, type: 'category', featured: true },
            { _id: '2', name: 'Nile River Cruises', slug: 'nile-cruises', products: 8, type: 'category' },
            { _id: '3', name: 'Pyramids of Giza', slug: 'pyramids-giza', products: 22, type: 'attraction' },
            { _id: '4', name: 'Family Friendly Adventures', slug: 'family-adventures', products: 7, type: 'category' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const renderContent = () => {
    if (loading) {
      return <LoadingSkeleton />;
    }
    if (error && interests.length === 0) {
      return <InfoState icon={<AlertCircle size={28} />} title="Unable to Load Content" message={error} />;
    }
    if (!loading && interests.length === 0) {
      return (
          <InfoState
            icon={<Star size={28} />}
            title="No Content Available"
            message="We're currently updating our experiences. Please check back soon!"
          >
              <Link
                href="/tours"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors"
              >
                Browse All Tours
                <ArrowRight className="w-4 h-4" />
              </Link>
          </InfoState>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {interests.map((interest) => (
          <InterestCard key={interest._id} interest={interest} />
        ))}
      </div>
    );
  };

  return (
    <section className="bg-slate-50 py-20 sm:py-24">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
            Explore Egypt by Interest
          </h2>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto mt-4">
            Discover curated experiences designed to match your travel style. From cultural immersion to adventure, find your perfect Egyptian journey.
          </p>
        </div>

        {renderContent()}

        {!loading && interests.length > 0 && (
          <div className="mt-16 text-center">
            <h3 className="text-2xl font-bold text-slate-900 mb-3">
              Can't Find What You're Looking For?
            </h3>
            <p className="text-slate-600 mb-6">
              Browse our complete collection or contact our experts for a personalized trip.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/tours"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5"
              >
                Browse All Tours
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:border-slate-400 hover:text-slate-900 transition-all duration-200"
              >
                Contact an Expert
                <Users className="w-5 h-5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}