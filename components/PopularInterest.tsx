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
  gradientClass: string;
  iconColorClass: string;
  accentColor: string;
  glowClass: string;
}

// --- CONFIGURATION ---
const DEFAULT_STYLE: InterestStyle = {
  Icon: Target,
  gradientClass: 'from-slate-800 to-slate-900',
  iconColorClass: 'text-blue-400',
  accentColor: 'blue',
  glowClass: 'group-hover:shadow-blue-500/20',
};

const INTEREST_CONFIG: { key: string; icon: IconKey; gradient: string; iconColor: string; accent: string; glow: string }[] = [
  { key: 'fun', icon: 'PartyPopper', gradient: 'from-purple-900 to-indigo-900', iconColor: 'text-purple-300', accent: 'purple', glow: 'group-hover:shadow-purple-500/25' },
  { key: 'family', icon: 'Heart', gradient: 'from-rose-900 to-pink-900', iconColor: 'text-rose-300', accent: 'rose', glow: 'group-hover:shadow-rose-500/25' },
  { key: 'bus', icon: 'Bus', gradient: 'from-amber-900 to-orange-900', iconColor: 'text-amber-300', accent: 'amber', glow: 'group-hover:shadow-amber-500/25' },
  { key: 'water', icon: 'Ship', gradient: 'from-cyan-900 to-blue-900', iconColor: 'text-cyan-300', accent: 'cyan', glow: 'group-hover:shadow-cyan-500/25' },
  { key: 'nightlife', icon: 'Moon', gradient: 'from-violet-900 to-purple-900', iconColor: 'text-violet-300', accent: 'violet', glow: 'group-hover:shadow-violet-500/25' },
  { key: 'instagrammable', icon: 'Camera', gradient: 'from-pink-900 to-rose-900', iconColor: 'text-pink-300', accent: 'pink', glow: 'group-hover:shadow-pink-500/25' },
  { key: 'cultural', icon: 'Globe', gradient: 'from-emerald-900 to-teal-900', iconColor: 'text-emerald-300', accent: 'emerald', glow: 'group-hover:shadow-emerald-500/25' },
  { key: 'adventure', icon: 'Zap', gradient: 'from-yellow-900 to-orange-900', iconColor: 'text-yellow-300', accent: 'yellow', glow: 'group-hover:shadow-yellow-500/25' },
  { key: 'luxury', icon: 'Gem', gradient: 'from-indigo-900 to-purple-900', iconColor: 'text-indigo-300', accent: 'indigo', glow: 'group-hover:shadow-indigo-500/25' },
  { key: 'history', icon: 'Camera', gradient: 'from-stone-800 to-slate-900', iconColor: 'text-stone-300', accent: 'stone', glow: 'group-hover:shadow-stone-500/25' },
  { key: 'city', icon: 'MapPin', gradient: 'from-sky-900 to-blue-900', iconColor: 'text-sky-300', accent: 'sky', glow: 'group-hover:shadow-sky-500/25' },
  { key: 'budget', icon: 'Smile', gradient: 'from-green-900 to-emerald-900', iconColor: 'text-green-300', accent: 'green', glow: 'group-hover:shadow-green-500/25' },
  { key: 'group', icon: 'Users', gradient: 'from-red-900 to-rose-900', iconColor: 'text-red-300', accent: 'red', glow: 'group-hover:shadow-red-500/25' },
  { key: 'day', icon: 'Calendar', gradient: 'from-teal-900 to-cyan-900', iconColor: 'text-teal-300', accent: 'teal', glow: 'group-hover:shadow-teal-500/25' },
  { key: 'premium', icon: 'Trophy', gradient: 'from-yellow-900 to-amber-900', iconColor: 'text-yellow-300', accent: 'yellow', glow: 'group-hover:shadow-yellow-500/25' },
  { key: 'local', icon: 'Globe', gradient: 'from-lime-900 to-green-900', iconColor: 'text-lime-300', accent: 'lime', glow: 'group-hover:shadow-lime-500/25' },
  { key: 'food', icon: 'Utensils', gradient: 'from-orange-900 to-red-900', iconColor: 'text-orange-300', accent: 'orange', glow: 'group-hover:shadow-orange-500/25' },
];

const getInterestStyle = (name: string, type: string): InterestStyle => {
  const lowerName = name.toLowerCase();
  const config = INTEREST_CONFIG.find(c => lowerName.includes(c.key));

  if (config) {
    return {
      Icon: icons[config.icon],
      gradientClass: config.gradient,
      iconColorClass: config.iconColor,
      accentColor: config.accent,
      glowClass: config.glow,
    };
  }

  if (type === 'attraction') {
    return {
      Icon: Star,
      gradientClass: 'from-teal-900 to-cyan-900',
      iconColorClass: 'text-teal-300',
      accentColor: 'teal',
      glowClass: 'group-hover:shadow-teal-500/25',
    };
  }

  return DEFAULT_STYLE;
};

// Background shapes component
const BackgroundShapes = ({ accentColor }: { accentColor: string }) => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Large bubble top-right */}
    <div className={`absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br from-${accentColor}-400/10 to-${accentColor}-600/5 rounded-full blur-sm`} />
    
    {/* Medium bubble bottom-left */}
    <div className={`absolute -bottom-2 -left-2 w-12 h-12 bg-gradient-to-tr from-${accentColor}-500/8 to-transparent rounded-full`} />
    
    {/* Small floating circles */}
    <div className={`absolute top-1/3 right-1/4 w-3 h-3 bg-${accentColor}-400/20 rounded-full animate-pulse`} />
    <div className={`absolute bottom-1/3 left-1/4 w-2 h-2 bg-${accentColor}-300/15 rounded-full animate-pulse delay-1000`} />
    
    {/* Geometric lines */}
    <div className={`absolute top-0 right-0 w-8 h-8 border border-${accentColor}-400/10 rotate-45 translate-x-2 -translate-y-2`} />
    <div className={`absolute bottom-0 left-0 w-6 h-6 border border-${accentColor}-400/8 rotate-12 -translate-x-1 translate-y-1`} />
  </div>
);

// --- SUB-COMPONENTS ---
const InterestCard = ({ interest }: { interest: Interest }) => {
  const { Icon, gradientClass, iconColorClass, accentColor, glowClass } = getInterestStyle(interest.name, interest.type);
  const linkUrl = interest.type === 'attraction' ? `/attraction/${interest.slug}` : `/interests/${interest.slug}`;

  return (
    <Link
      href={linkUrl}
      className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradientClass} border border-white/10 
                 hover:border-white/20 transition-all duration-500 ease-out transform hover:-translate-y-2 
                 hover:shadow-2xl ${glowClass} cursor-pointer backdrop-blur-sm`}
    >
      {/* Background shapes */}
      <BackgroundShapes accentColor={accentColor} />
      
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Content */}
      <div className="relative p-6 flex items-center justify-between z-10">
        <div className="flex items-center space-x-4">
          {/* Icon with glow effect */}
          <div className={`flex-shrink-0 w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center 
                          border border-white/20 group-hover:border-white/30 transition-all duration-300 group-hover:scale-110`}>
            <Icon className={`w-7 h-7 ${iconColorClass} group-hover:scale-110 transition-transform duration-300`} />
          </div>
          
          {/* Text content */}
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-white/95 transition-colors duration-300 leading-tight">
              {interest.name}
            </h3>
            <p className="text-sm text-white/60 group-hover:text-white/70 transition-colors duration-300 mt-1">
              {interest.products} {interest.products === 1 ? 'experience' : 'experiences'}
            </p>
          </div>
        </div>

        {/* Arrow with bounce animation */}
        <div className="flex-shrink-0">
          <ArrowRight className={`w-5 h-5 text-white/60 group-hover:text-white transition-all duration-300 
                                 transform group-hover:translate-x-2 group-hover:scale-110`} />
        </div>
      </div>

      {/* Featured badge */}
      {interest.featured && (
        <div className="absolute -top-1 -right-1 z-20">
          <div className={`px-3 py-1 text-xs font-bold text-white bg-gradient-to-r from-${accentColor}-500 to-${accentColor}-600 
                          rounded-full shadow-lg border border-white/20 backdrop-blur-sm`}>
            <span className="relative z-10">Featured ✨</span>
          </div>
        </div>
      )}

      {/* Subtle inner glow */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent 
                     opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </Link>
  );
};

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="relative rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 overflow-hidden">
        <div className="p-6 flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex-shrink-0"></div>
            <div>
              <div className="h-5 bg-white/20 rounded-lg w-32 mb-2"></div>
              <div className="h-4 bg-white/10 rounded-lg w-20"></div>
            </div>
          </div>
          <div className="w-5 h-5 bg-white/20 rounded-full"></div>
        </div>
      </div>
    ))}
  </div>
);

const InfoState = ({ icon, title, message, children }: { icon: React.ReactNode, title: string, message: string, children?: React.ReactNode }) => (
  <div className="text-center py-20">
    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-900 
                   text-slate-300 rounded-3xl mb-6 border border-white/10">
      {icon}
    </div>
    <h3 className="text-3xl font-bold text-slate-800 mb-4">{title}</h3>
    <p className="text-slate-600 max-w-lg mx-auto mb-8 text-lg leading-relaxed">{message}</p>
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
    if (error) return <InfoState icon={<AlertCircle size={36} />} title="Error Loading Content" message={error} />;
    if (interests.length === 0) return (
      <InfoState icon={<Star size={36} />} title="No Experiences Found" message="We're busy crafting new adventures. Please check back soon for exciting new options!">
        <Link href="/tours" className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-slate-800 to-slate-900 
                                      text-white font-bold rounded-2xl hover:from-slate-700 hover:to-slate-800 transition-all duration-300 
                                      transform hover:-translate-y-1 shadow-xl border border-white/10">
          Browse All Tours <ArrowRight className="w-5 h-5" />
        </Link>
      </InfoState>
    );
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {interests.map((interest) => (
          <InterestCard key={interest._id} interest={interest} />
        ))}
      </div>
    );
  };

  return (
    <section className="relative bg-gradient-to-b from-slate-50 to-white py-24 sm:py-32 overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-r from-emerald-600/5 to-cyan-600/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-gradient-to-r from-rose-600/5 to-pink-600/5 rounded-full blur-2xl -translate-x-1/2" />
      </div>

      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        {/* Header section */}
        <div className="text-center mb-20 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 
                         text-blue-700 font-medium text-sm mb-6 border border-blue-200">
            <Star className="w-4 h-4" />
            <span>Curated Experiences</span>
          </div>
          
          <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-none mb-6">
            Activities based on{' '}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
              popular interests
            </span>
          </h2>
          
          <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Explore curated experiences and discover the best of Egypt tailored to your unique tastes and preferences.
          </p>
          
          {/* Decorative line */}
          <div className="relative w-32 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto mt-8 rounded-full">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-sm opacity-50" />
          </div>
        </div>

        {renderContent()}

        {/* Call-to-action section */}
        {!loading && !error && interests.length > 0 && (
          <div className="mt-24 text-center">
            <div className="relative max-w-4xl mx-auto p-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
                           rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              {/* Background decorative shapes */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-emerald-500/10 to-cyan-500/10 rounded-full blur-2xl" />
              </div>
              
              <div className="relative z-10">
                <h3 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">
                  Need a Custom Itinerary?
                </h3>
                <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
                  Our local travel experts are here to craft your dream Egyptian adventure with personalized recommendations.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                  <Link href="/tours" 
                        className="inline-flex items-center justify-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-600 to-blue-700 
                                  text-white font-bold rounded-2xl shadow-2xl hover:from-blue-700 hover:to-blue-800 
                                  transition-all duration-300 transform hover:-translate-y-1 border border-blue-500/20">
                    <span>View All Experiences</span>
                    <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                  
                  <Link href="/contact" 
                        className="inline-flex items-center justify-center gap-3 px-10 py-5 bg-white/10 backdrop-blur-sm 
                                  border-2 border-white/20 text-white font-bold rounded-2xl hover:bg-white/20 hover:border-white/30 
                                  transition-all duration-300 transform hover:-translate-y-1">
                    <Users className="w-5 h-5" />
                    <span>Contact an Expert</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Global styles */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        .font-sans { 
          font-family: 'Inter', sans-serif; 
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </section>
  );
}