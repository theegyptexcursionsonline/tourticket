'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProtectedRoute from '@/components/Protectedpage'; // Import the protection wrapper
import { Tour, Booking } from '@/types';
import {
  Loader2,
  Calendar,
  Clock,
  MapPin,
  Users,
  Ticket,
  Compass,
  Star,
  ChevronRight,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

// --- Type for a booking with populated tour details ---
interface PopulatedBooking extends Omit<Booking, 'tour'> {
  tour: Tour;
}

// --- (Keep all your existing components like StatCard, BookingCard, SkeletonCard, etc., here) ---
const StatCard = ({ title, value, icon: Icon, subtitle }: { title: string; value: string | number; icon: React.ElementType; subtitle?: string }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="bg-white p-5 rounded-2xl shadow-md border border-slate-100 flex items-center gap-4"
    >
        <div className="p-3 rounded-xl bg-gradient-to-br from-red-50 to-red-100 text-red-600">
            <Icon size={22} />
        </div>
        <div className="flex-1">
            <div className="flex items-baseline gap-3">
                <p className="text-2xl font-extrabold text-slate-900 leading-none">{value}</p>
                {subtitle && <span className="text-sm text-slate-400">{subtitle}</span>}
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-wide mt-1">{title}</p>
        </div>
        <ChevronRight className="text-slate-300" />
    </motion.div>
);

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
            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row hover:shadow-lg transition-shadow"
            aria-label={`Booking: ${booking.tour.title}`}
        >
            <div className="relative w-full md:w-56 h-44 md:h-auto flex-shrink-0">
                <Image src={booking.tour.image} alt={booking.tour.title} fill className="object-cover" />
                <div className="absolute left-3 top-3 px-3 py-1 rounded-lg bg-black/50 text-white text-xs font-semibold">
                    {booking.tour.destination?.name || 'Tour'}
                </div>
                {isPast && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="text-white font-bold text-sm tracking-wider">COMPLETED</span>
                    </div>
                )}
            </div>
            <div className="p-5 flex flex-col flex-grow">
                <h3 className="text-lg font-semibold text-slate-900">{booking.tour.title}</h3>
                <div className="flex items-center gap-4 flex-wrap text-slate-600 text-sm mt-2">
                    <div className="flex items-center gap-2"><Clock size={14} /><span>{booking.time}</span></div>
                    <div className="flex items-center gap-2"><Users size={14} /><span>{booking.guests} guest{booking.guests > 1 ? 's' : ''}</span></div>
                    <div className="flex items-center gap-2"><Calendar size={14} /><span>{bookingDate.toLocaleDateString()}</span></div>
                </div>
                <div className="flex items-center justify-end gap-3 mt-4 flex-grow items-end">
                    <Link href={`/tour/${booking.tour.slug}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition">
                        View Details
                    </Link>
                </div>
            </div>
        </motion.article>
    );
};

const SkeletonCard = () => (
    <div className="animate-pulse bg-white rounded-2xl p-5 border border-slate-100 flex flex-col md:flex-row gap-5">
        <div className="w-full md:w-56 h-44 bg-slate-100 rounded-lg" />
        <div className="flex-1 space-y-4">
            <div className="h-5 bg-slate-100 rounded w-3/4" />
            <div className="h-4 bg-slate-100 rounded w-1/2" />
            <div className="h-4 bg-slate-100 rounded w-full" />
            <div className="flex justify-end pt-4"><div className="h-9 w-28 bg-slate-100 rounded" /></div>
        </div>
    </div>
);


// --- Main Page Component ---
export default function UserDashboardPage() {
  return (
    // Wrap the entire page in your ProtectedRoute component.
    // This handles the loading state and redirects if the user is not logged in.
    <ProtectedRoute>
      <Header startSolid />
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-20 pb-24">
        <div className="container mx-auto px-4">
          <DashboardContent />
        </div>
      </main>
      <Footer />
    </ProtectedRoute>
  );
}

// --- Dashboard Content (rendered only if authenticated) ---
const DashboardContent = () => {
  const { user, token } = useAuth(); // Get the authentication token from your context
  const [bookings, setBookings] = useState<PopulatedBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // We only fetch data if a token exists
    if (!token) {
        setIsLoading(false);
        return;
    }

    const fetchBookings = async () => {
      try {
        const response = await fetch('/api/user/bookings', {
          headers: {
            // Include the JWT in the Authorization header
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
  }, [token]); // This effect will re-run if the user logs in or out (token changes)

  // (The rest of your DashboardContent component remains the same)
    const { upcomingBookings, pastBookings } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return bookings.reduce(
      (acc, booking) => {
        const bdate = new Date(booking.date);
        if (bdate >= now) acc.upcomingBookings.push(booking);
        else acc.pastBookings.push(booking);
        return acc;
      },
      { upcomingBookings: [] as PopulatedBooking[], pastBookings: [] as PopulatedBooking[] }
    );
  }, [bookings]);

  const totalBookings = bookings.length;
  const upcomingCount = upcomingBookings.length;
  const spentTrips = pastBookings.length;

  return (
    <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-4">
                <div className="rounded-full bg-gradient-to-br from-red-600 to-red-400 p-1">
                    <div className="relative w-20 h-20 rounded-full overflow-hidden bg-slate-100">
                        {user?.picture ? (
                            <Image src={user.picture} alt={user.name || 'User avatar'} fill className="object-cover" />
                        ) : (
                            <div className="flex items-center justify-center w-full h-full text-white text-xl font-bold bg-red-500">
                                {user?.firstName?.[0] ?? user?.name?.[0] ?? 'U'}
                            </div>
                        )}
                    </div>
                </div>
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                        Welcome back, {user?.firstName || user?.name || 'Traveler'} 👋
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Manage your bookings, view trips and explore new experiences.</p>
                </div>
            </div>
            <div className="ml-auto w-full md:w-auto grid grid-cols-3 gap-3 mt-4 md:mt-0">
                <StatCard title="Total Bookings" value={totalBookings} subtitle="All time" icon={Ticket} />
                <StatCard title="Upcoming" value={upcomingCount} subtitle="Soon" icon={Calendar} />
                <StatCard title="Past Trips" value={spentTrips} subtitle="History" icon={Compass} />
            </div>
        </div>
        <AnimatePresence>
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
                </div>
            ) : error ? (
                <div className="text-center py-12 bg-red-50 text-red-700 p-6 rounded-xl">{error}</div>
            ) : (
                <div className="space-y-12">
                    <section>
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Upcoming Bookings</h2>
                        {upcomingBookings.length > 0 ? (
                            <div className="grid grid-cols-1 gap-4"><AnimatePresence>{upcomingBookings.map(booking => <BookingCard key={booking._id} booking={booking} />)}</AnimatePresence></div>
                        ) : (
                            <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-100">
                                <h3 className="text-lg font-semibold text-slate-800 mb-2">No upcoming trips</h3>
                                <p className="text-sm text-slate-500 mb-4">Time to find your next getaway.</p>
                                <Link href="/search" className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition">Browse Tours <ChevronRight size={16} /></Link>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};
