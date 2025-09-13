// app/user/dashboard/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Tour, Booking } from '@/types';
import { Loader2, Calendar, Clock, MapPin, Users, Ticket, Compass, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// --- Type for a booking with populated tour details ---
interface PopulatedBooking extends Omit<Booking, 'tour'> {
  tour: Tour;
}

// --- Stat Card Component ---
const StatCard = ({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex items-center gap-4">
        <div className="p-3 bg-red-100 text-red-600 rounded-full">
            <Icon size={24} />
        </div>
        <div>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            <h3 className="text-sm font-semibold text-slate-500">{title}</h3>
        </div>
    </div>
);

// --- Booking Card Component ---
const BookingCard = ({ booking }: { booking: PopulatedBooking }) => {
    const bookingDate = new Date(booking.date);
    const isPast = bookingDate < new Date();
    
    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-shadow">
            <div className="relative w-full md:w-48 h-48 md:h-auto flex-shrink-0">
                <Image src={booking.tour.image} alt={booking.tour.title} fill className="object-cover" />
                {isPast && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="text-white font-bold text-lg">Completed</span></div>}
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <p className="text-sm text-slate-500">{bookingDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <h3 className="font-bold text-lg text-slate-800 my-1 flex-grow">{booking.tour.title}</h3>
                <div className="flex items-center gap-4 text-sm text-slate-600 border-t pt-3 mt-3">
                    <div className="flex items-center gap-1.5"><Clock size={14} /><span>{booking.time}</span></div>
                    <div className="flex items-center gap-1.5"><Users size={14} /><span>{booking.guests} Guest(s)</span></div>
                </div>
                <div className="mt-4 flex justify-end">
                    <Link href={`/tour/${booking.tour.slug}`} className="text-red-600 font-semibold text-sm hover:underline">View Tour Details</Link>
                </div>
            </div>
        </div>
    );
};

export default function UserDashboardPage() {
  return (
    <ProtectedRoute>
      <Header startSolid />
      <main className="min-h-screen bg-slate-50 pt-20">
        <div className="container mx-auto px-4 py-8">
          <DashboardContent />
        </div>
      </main>
      <Footer />
    </ProtectedRoute>
  );
}

const DashboardContent = () => {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<PopulatedBooking[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const response = await fetch('/api/user/bookings');
                if (!response.ok) {
                    throw new Error('Failed to fetch your bookings.');
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
    }, []);

    const { upcomingBookings, pastBookings } = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Compare dates only
        return bookings.reduce(
            (acc, booking) => {
                const bookingDate = new Date(booking.date);
                if (bookingDate >= now) {
                    acc.upcomingBookings.push(booking);
                } else {
                    acc.pastBookings.push(booking);
                }
                return acc;
            },
            { upcomingBookings: [] as PopulatedBooking[], pastBookings: [] as PopulatedBooking[] }
        );
    }, [bookings]);

    if (isLoading) {
        return <div className="text-center py-20"><Loader2 className="animate-spin mx-auto text-red-600" size={48} /></div>;
    }
    
    if (error) {
        return <div className="text-center py-20 bg-red-50 text-red-700 p-6 rounded-lg">{error}</div>;
    }

    return (
        <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">Welcome back, {user?.firstName || user?.name}!</h1>
            <p className="text-slate-600 mb-8">Here is your travel dashboard.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Bookings" value={bookings.length} icon={Ticket} />
                <StatCard title="Upcoming Trips" value={upcomingBookings.length} icon={Calendar} />
                <Link href="/user/profile" className="block"><StatCard title="My Profile" value="View" icon={UserIcon} /></Link>
                <Link href="/search" className="block"><StatCard title="Explore Tours" value="Find" icon={Compass} /></Link>
            </div>
            
            <div className="space-y-12">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">Upcoming Bookings</h2>
                    {upcomingBookings.length > 0 ? (
                        <div className="space-y-6">
                            {upcomingBookings.map(booking => <BookingCard key={booking._id} booking={booking} />)}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">No upcoming trips</h3>
                            <p className="text-slate-500 mb-4">Time to book your next adventure!</p>
                            <Link href="/search" className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors">
                                Browse Tours
                            </Link>
                        </div>
                    )}
                </div>
                
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-6">Past Bookings</h2>
                    {pastBookings.length > 0 ? (
                         <div className="space-y-6">
                            {pastBookings.slice(0, 3).map(booking => <BookingCard key={booking._id} booking={booking} />)}
                         </div>
                    ) : (
                        <p className="text-slate-500 bg-white p-8 text-center rounded-lg shadow-sm border">You have no past bookings to show.</p>
                    )}
                    {pastBookings.length > 3 && (
                        <div className="text-center mt-6">
                            <Link href="/user/bookings" className="font-semibold text-red-600 hover:underline">View all past bookings</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
