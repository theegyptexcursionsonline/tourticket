'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Smile, Users, Bus, Ship, Moon, Camera, Star, ArrowRight,
  AlertCircle, MapPin, Calendar, Trophy, Target, Globe, Heart, Gem, Utensils, Zap, PartyPopper
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
  Smile, Users, Bus, Ship, Moon, Camera, MapPin, Calendar, Trophy, Target, Globe, Heart, Gem, Utensils, Zap, PartyPopper
} as const;
type IconKey = keyof typeof icons;

interface InterestStyle {
  Icon: React.ElementType;
  iconBgClass: string; // Background for the icon circle
  hoverBorderClass: string; // Border color on hover
  arrowColorClass: string; // Arrow color on hover
  featuredBgClass?: string; // Optional: specific bg for featured badge
  featuredTextColorClass?: string; // Optional: specific text for featured badge
}

// --- CONFIGURATION ---
const DEFAULT_STYLE: InterestStyle = {
  Icon: Target,
  iconBgClass: 'bg-blue-500',
  hoverBorderClass: 'border-blue-300',
  arrowColorClass: 'text-blue-500',
};

const INTEREST_CONFIG: { key: string; icon: IconKey; color: string }[] = [
  { key: 'fun', icon: 'PartyPopper', color: 'blue' },
  { key: 'family', icon: 'Heart', color: 'red' },
  { key: 'bus', icon: 'Bus', color: 'amber' },
  { key: 'water', icon: 'Ship', color: 'sky' },
  { key: 'nightlife', icon: 'Moon', color: 'violet' },
  { key: 'instagrammable', icon: 'Camera', color: 'pink' },
  { key: 'cultural', icon: 'Globe', color: 'purple' },
  { key: 'adventure', icon: 'Zap', color: 'indigo' },
  { key: 'luxury', icon: 'Gem', color: 'emerald' },
  { key: 'history', icon: 'Camera', color: 'yellow' },
  { key: 'city', icon: 'MapPin', color: 'orange' },
  { key: 'budget', icon: 'Smile', color: 'green' },
  { key: 'group', icon: 'Users', color: 'rose' },
  { key: 'day', icon: 'Calendar', color: 'teal' },
  { key: 'premium', icon: 'Trophy', color: 'cyan' },
  { key: 'local', icon: 'Globe', color: 'lime' },
  { key: 'food', icon: 'Utensils', color: 'fuchsia' },
];

const getInterestStyle = (name: string, type: string): InterestStyle => {
  const lowerName = name.toLowerCase();
  const config = INTEREST_CONFIG.find(c => lowerName.includes(c.key));

  if (config) {
    return {
      Icon: icons[config.icon],
      iconBgClass: `bg-${config.color}-500`,
      hoverBorderClass: `border-${config.color}-300`,
      arrowColorClass: `text-${config.color}-500`,
      featuredBgClass: config.key === 'family' ? 'bg-red-100' : 'bg-emerald-100',
      featuredTextColorClass: config.key === 'family' ? 'text-red-700' : 'text-emerald-700',
    };
  }

  if (type === 'attraction') {
    return {
      Icon: Star,
      iconBgClass: 'bg-teal-500',
      hoverBorderClass: 'border-teal-300',
      arrowColorClass: 'text-teal-500',
      featuredBgClass: 'bg-emerald-100',
      featuredTextColorClass: 'text-emerald-700',
    };
  }

  return DEFAULT_STYLE;
};

// --- SUB-COMPONENTS ---

const InterestCard = ({ interest }: { interest: Interest }) => {
  const { Icon, iconBgClass, hoverBorderClass, arrowColorClass, featuredBgClass, featuredTextColorClass } = getInterestStyle(interest.name, interest.type);
  const linkUrl = interest.type === 'attraction' ? `/attraction/${interest.slug}` : `/interests/${interest.slug}`;

  return (
    <Link
      href={linkUrl}
      className={`group relative flex items-center justify-between p-4 rounded-xl shadow-sm border border-slate-200 bg-white
                 hover:${hoverBorderClass} hover:shadow-md transition-all duration-300 ease-in-out cursor-pointer`}
    >
      <div className="flex items-center space-x-4 relative z-10">
        <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${iconBgClass} text-white`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-medium text-slate-800 group-hover:text-slate-900 transition-colors duration-300">
            {interest.name}
          </h3>
          <p className="text-xs text-slate-500 group-hover:text-slate-600 transition-colors duration-300 mt-0.5">
            {interest.products} products
          </p>
        </div>
      </div>

      <ArrowRight className={`w-4 h-4 text-slate-400 group-hover:${arrowColorClass} transform group-hover:translate-x-1 transition-all duration-300 relative z-10`} />

      {interest.featured && (
        <div className={`absolute -top-2 -right-2 px-2 py-0.5 text-xs font-semibold rounded-full shadow-sm
                        ${featuredBgClass || 'bg-emerald-100'} ${featuredTextColorClass || 'text-emerald-700'}`}>
          Featured
        </div>
      )}
    </Link>
  );
};

const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="relative flex items-center p-4 rounded-xl shadow-sm bg-white border border-slate-200 h-[76px]">
            <div className="flex items-center space-x-4">
                <div className="w-11 h-11 rounded-full bg-slate-200 flex-shrink-0"></div>
                <div>
                    <div className="h-4 bg-slate-200 rounded w-32 mb-1"></div>
                    <div className="h-3 bg-slate-200 rounded w-20"></div>
                </div>
            </div>
            <div className="absolute right-4 w-4 h-4 bg-slate-200 rounded-full"></div>
        </div>
      ))}
    </div>
  );
  

const InfoState = ({ icon, title, message, children }: { icon: React.ReactNode, title: string, message: string, children?: React.ReactNode }) => (
  <div className="text-center py-16">
    <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 text-slate-500 rounded-full mb-4">
      {icon}
    </div>
    <h3 className="text-2xl font-bold text-slate-800 mb-2">{title}</h3>
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
        const response = await fetch('/api/interests');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          setInterests(data.data);
        } else {
          throw new Error(data.error || 'Invalid response format from API');
        }
      } catch (err: any) {
        console.error('Error fetching interests:', err);
        setError(err.message || 'Failed to load content from the server.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const renderContent = () => {
    if (loading) return <LoadingSkeleton />;
    if (error) return <InfoState icon={<AlertCircle size={32} />} title="Error Loading Content" message={error} />;
    if (interests.length === 0) return (
      <InfoState icon={<Star size={32} />} title="No Experiences Found" message="We're busy crafting new adventures. Please check back soon for exciting new options!">
        <Link href="/tours" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors">
          Browse All Tours <ArrowRight className="w-4 h-4" />
        </Link>
      </InfoState>
    );
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {interests.map((interest) => (
          <InterestCard key={interest._id} interest={interest} />
        ))}
      </div>
    );
  };

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Activities based on <br className="hidden sm:inline" /> popular interests
          </h2>
          <p className="text-lg text-slate-600 mt-4">
            Explore curated experiences and discover the best of Egypt tailored to your unique tastes.
          </p>
          <div className="relative w-20 h-1 bg-blue-500 mx-auto mt-6 rounded-full"></div>
        </div>

        {renderContent()}

        {!loading && !error && interests.length > 0 && (
          <div className="mt-20 text-center">
            <div className="max-w-2xl mx-auto p-8 bg-blue-50/70 rounded-2xl border border-blue-100/60 shadow-inner">
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                    Need a Custom Itinerary?
                </h3>
                <p className="text-slate-600 mb-6">
                    Our local travel experts are here to craft your dream Egyptian adventure.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/tours" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:-translate-y-1">
                    View All Experiences <ArrowRight className="w-5 h-5" />
                </Link>
                <Link href="/contact" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white border-2 border-blue-300 text-blue-700 font-bold rounded-xl hover:border-blue-400 hover:text-blue-800 transition-all duration-200 transform hover:-translate-y-1">
                    Contact an Expert <Users className="w-5 h-5" />
                </Link>
                </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}