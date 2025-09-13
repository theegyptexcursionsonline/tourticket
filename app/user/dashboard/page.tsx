'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tour, Booking as BookingType } from '@/types';
import {
  Calendar,
  Clock,
  Users,
  Ticket,
  Compass,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface PopulatedBooking extends Omit<BookingType, 'tour'> {
  tour: Tour;
}

/* ---------- StatCard (mobile-optimized) ---------- */
const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.28 }}
    className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-2 flex-1 min-w-0"
  >
    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center bg-rose-50 border border-rose-100 text-rose-600 flex-shrink-0">
      <Icon size={14} className="sm:w-4 sm:h-4" />
    </div>

    <div className="flex-1 min-w-0">
      <p className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 leading-tight truncate">{value}</p>
      <p className="text-[10px] sm:text-[11px] text-slate-500 uppercase tracking-wider mt-0.5 leading-tight">{title}</p>
    </div>
  </motion.div>
);

/* ---------- Booking Card (mobile-first) ---------- */
const BookingCard = ({ booking }: { booking: PopulatedBooking }) => {
  const bookingDate = new Date(booking.date);
  const isPast = bookingDate < new Date();

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.995 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.995 }}
      transition={{ duration: 0.25 }}
      className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all duration-300"
      aria-label={`Booking for ${booking.tour.title}`}
    >
      {/* Mobile: Image on top, Desktop: Image on left */}
      <div className="flex flex-col sm:flex-row">
        <div className="relative w-full h-48 sm:h-40 md:w-64 md:h-auto flex-shrink-0">
          <Image 
            src={booking.tour.image} 
            alt={booking.tour.title} 
            fill 
            className="object-cover" 
            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 256px"
          />
          
          {/* Destination badge */}
          <div className="absolute left-3 top-3 px-2 py-1 sm:px-3 rounded-lg bg-black/70 text-white text-xs font-semibold backdrop-blur-sm">
            {booking.tour.destination?.name || 'Tour'}
          </div>
          
          {/* Past booking overlay */}
          {isPast && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <span className="text-white font-bold text-sm tracking-wider px-3 py-1 rounded-lg bg-black/40">
                COMPLETED
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 flex flex-col flex-grow min-w-0">
          <h3 className="text-lg sm:text-xl font-semibold text-slate-900 leading-tight mb-3 line-clamp-2">
            {booking.tour.title}
          </h3>

          {/* Booking details - stack on mobile */}
          <div className="space-y-2 sm:space-y-1 mb-4 flex-grow">
            <div className="flex items-center gap-2 text-slate-600 text-sm">
              <Calendar size={14} className="flex-shrink-0" />
              <span className="font-medium">{bookingDate.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}</span>
            </div>
            
            <div className="flex items-center gap-2 text-slate-600 text-sm">
              <Clock size={14} className="flex-shrink-0" />
              <span>{booking.time}</span>
            </div>
            
            <div className="flex items-center gap-2 text-slate-600 text-sm">
              <Users size={14} className="flex-shrink-0" />
              <span>{booking.guests} guest{booking.guests > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Action button */}
          <div className="flex justify-end pt-2 border-t border-slate-100 sm:border-0 sm:pt-0">
            <Link 
              href={`/tour/${booking.tour.slug}`} 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 active:bg-red-800 transition-colors touch-manipulation"
            >
              View Details
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

/* ---------- Skeleton (responsive) ---------- */
const SkeletonCard = () => (
  <div className="animate-pulse bg-white rounded-xl sm:rounded-2xl border border-slate-100 overflow-hidden">
    <div className="flex flex-col sm:flex-row">
      <div className="w-full h-48 sm:h-40 md:w-64 bg-slate-200 flex-shrink-0" />
      <div className="p-4 sm:p-5 flex-1 space-y-3">
        <div className="h-5 bg-slate-200 rounded w-3/4" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-4 bg-slate-200 rounded w-2/3" />
          <div className="h-4 bg-slate-200 rounded w-1/3" />
        </div>
        <div className="flex justify-end pt-2">
          <div className="h-9 w-28 bg-slate-200 rounded" />
        </div>
      </div>
    </div>
  </div>
);

/* ---------- Page ---------- */
export default function UserDashboardPage() {
  return <DashboardContent />;
}

const DashboardContent = () => {
  const { user, token } = useAuth();
  const [bookings, setBookings] = useState<PopulatedBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    const fetchBookings = async () => {
      try {
        const response = await fetch('/api/user/bookings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({ error: `Server responded with status ${response.status}` }));
          throw new Error(body.error || 'Failed to fetch your bookings.');
        }

        const data = await response.json();
        if (data.success) {
          setBookings(data.data);
        } else {
          throw new Error(data.error || 'Could not load bookings.');
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [token]);

  const { upcomingBookings } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return bookings.reduce(
      (acc, booking) => {
        const bdate = new Date(booking.date);
        if (bdate >= now) acc.upcomingBookings.push(booking);
        return acc;
      },
      { upcomingBookings: [] as PopulatedBooking[] }
    );
  }, [bookings]);

  const totalBookings = bookings.length;
  const upcomingCount = upcomingBookings.length;
  const pastCount = totalBookings - upcomingCount;

  return (
    <div className="w-full min-h-screen bg-slate-50 sm:bg-transparent">
      {/* HERO / SUMMARY - mobile-first layout */}
      <div className="bg-white rounded-xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-sm border border-slate-100 mb-6 sm:mb-8 mx-4 sm:mx-0">
        {/* Mobile: Stack vertically, Desktop: Side by side */}
        <div className="space-y-6 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-8">
          
          {/* Avatar + Greeting */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 ring-2 ring-slate-100">
              {user?.picture ? (
                <Image 
                  src={user.picture} 
                  alt={user.name || 'User avatar'} 
                  fill 
                  className="object-cover" 
                  sizes="80px"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-white text-lg sm:text-xl font-bold bg-rose-500">
                  {user?.name?.[0] ?? 'U'}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 leading-tight">
                Welcome back, {user?.name?.split(' ')[0] || 'Traveler'}!
              </h1>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Here's a summary of your adventures.
              </p>
            </div>
          </div>

          {/* Stats - horizontal on mobile, right-aligned on desktop */}
          <div className="flex gap-3 sm:gap-4 sm:flex-shrink-0">
            <StatCard title="Total" value={totalBookings} icon={Ticket} />
            <StatCard title="Upcoming" value={upcomingCount} icon={Calendar} />
            <StatCard title="Past" value={pastCount} icon={Compass} />
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 sm:px-0">
        <AnimatePresence>
          {isLoading ? (
            <div className="space-y-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : error ? (
            <div className="text-center py-8 sm:py-12 bg-red-50 text-red-700 p-4 sm:p-6 rounded-xl mx-4 sm:mx-0">
              <p className="font-medium">{error}</p>
            </div>
          ) : (
            <div className="space-y-8 sm:space-y-12">
              <section>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-4 sm:mb-6 px-1 sm:px-0">
                  Upcoming Bookings
                </h2>
                
                {upcomingBookings.length > 0 ? (
                  <div className="space-y-4 sm:space-y-6">
                    <AnimatePresence>
                      {upcomingBookings.map((booking) => (
                        <BookingCard key={booking._id} booking={booking} />
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12 bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-100">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                      <Compass size={24} className="text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      No upcoming trips
                    </h3>
                    <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">
                      Ready for your next adventure? Discover amazing destinations and create new memories.
                    </p>
                    <Link 
                      href="/search" 
                      className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors font-medium touch-manipulation"
                    >
                      Browse Tours 
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                )}
              </section>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};