'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, Clock, Users, MapPin, ChevronRight, Loader2, AlertCircle, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Tour, Booking } from '@/types';
import toast from 'react-hot-toast';

interface PopulatedBooking extends Omit<Booking, 'tour' | 'user'> {
  tour: Tour & {
    destination?: {
      name: string;
    };
  };
}

const BookingCard = ({ booking, onCancelSuccess }: { booking: PopulatedBooking; onCancelSuccess: () => void }) => {
  const bookingDate = new Date(booking.date);
  const isPast = bookingDate < new Date();
  const isUpcoming = bookingDate >= new Date();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const handleCancelBooking = async () => {
    if (!cancellationReason.trim()) {
      toast.error('Please provide a cancellation reason');
      return;
    }

    setIsCancelling(true);
    try {
      const { token } = useAuth.getState();
      const response = await fetch(`/api/admin/bookings/${booking._id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: cancellationReason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel booking');
      }

      const data = await response.json();
      toast.success(`Booking cancelled successfully! ${data.refundAmount > 0 ? `Refund: $${data.refundAmount.toFixed(2)}` : ''}`);
      setShowCancelModal(false);
      onCancelSuccess();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      toast.error((err as Error).message);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800">Cancel Booking</h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-slate-600 mb-4">
              Are you sure you want to cancel your booking for <strong>{booking.tour.title}</strong>?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason for cancellation *
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={3}
                placeholder="Please tell us why you're cancelling..."
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
              <p className="text-xs text-yellow-800">
                <strong>Refund Policy:</strong> Cancellations 7+ days before: 100% refund. 3-6 days: 50% refund. Less than 3 days: No refund.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-full hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={isCancelling || !cancellationReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isCancelling ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  'Cancel Booking'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Card */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-lg transition-all duration-300">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="relative w-full h-48 sm:w-64 sm:h-40 flex-shrink-0">
            <Image 
              src={booking.tour.image} 
              alt={booking.tour.title} 
              fill 
              className="object-cover" 
              sizes="(max-width: 640px) 100vw, 256px"
            />
            
            {/* Status Badge */}
            <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(booking.status)}`}>
              {booking.status}
            </div>
            
            {/* Past/Upcoming Indicator */}
            {isPast && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <span className="bg-black/60 text-white text-sm font-medium px-3 py-1 rounded-full">
                  Completed
                </span>
              </div>
            )}
            
            {isUpcoming && (
              <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-medium px-2 py-1 rounded-full">
                Upcoming
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            <div className="flex flex-col h-full">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-2 line-clamp-2">
                  {booking.tour.title}
                </h3>
                
                <div className="space-y-2 mb-4">
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
                  
                  {booking.tour.destination && (
                    <div className="flex items-center gap-2 text-slate-600 text-sm">
                      <MapPin size={14} className="flex-shrink-0" />
                      <span>{booking.tour.destination.name}</span>
                    </div>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-500">Total Paid</span>
                  <span className="text-lg font-bold text-slate-900">
                    ${booking.totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-100 gap-3">
                {isUpcoming && booking.status !== 'Cancelled' && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-full hover:bg-red-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <Link 
                  href={`/tour/${booking.tour.slug}`} 
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-full hover:bg-red-700 transition-colors ml-auto"
                >
                  View Tour
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const BookingSkeleton = () => (
  <div className="animate-pulse bg-white rounded-2xl border border-slate-100 overflow-hidden">
    <div className="flex flex-col sm:flex-row">
      <div className="w-full h-48 sm:w-64 sm:h-40 bg-slate-200 flex-shrink-0" />
      <div className="flex-1 p-6 space-y-4">
        <div className="h-5 bg-slate-200 rounded w-3/4" />
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-4 bg-slate-200 rounded w-2/3" />
          <div className="h-4 bg-slate-200 rounded w-1/3" />
        </div>
        <div className="flex justify-between items-center pt-4">
          <div className="h-4 bg-slate-200 rounded w-16" />
          <div className="h-9 w-24 bg-slate-200 rounded" />
        </div>
      </div>
    </div>
  </div>
);

export default function BookingsPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState<PopulatedBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/user/bookings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch bookings' }));
        throw new Error(errorData.error || 'Failed to fetch bookings');
      }

      const data = await response.json();
      if (data.success) {
        setBookings(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch bookings');
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [token]);

  const upcomingBookings = bookings.filter(booking => new Date(booking.date) >= new Date());
  const pastBookings = bookings.filter(booking => new Date(booking.date) < new Date());

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="h-8 bg-slate-200 rounded w-48 mb-2 animate-pulse" />
          <div className="h-5 bg-slate-200 rounded w-96 animate-pulse" />
        </div>
        <div className="space-y-6">
          <BookingSkeleton />
          <BookingSkeleton />
          <BookingSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Bookings</h2>
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">My Bookings</h1>
        <p className="text-slate-600">
          View and manage all your tour bookings. Total bookings: {bookings.length}
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar size={32} className="text-slate-400" />
          </div>
          <h2 className="text-2xl font-semibold text-slate-700 mb-2">No bookings yet</h2>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            You haven't booked any tours yet. Start exploring our amazing destinations and create unforgettable memories!
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-full hover:bg-red-700 transition-colors font-medium"
          >
            Browse Tours
            <ChevronRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Bookings */}
          {upcomingBookings.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                Upcoming Bookings ({upcomingBookings.length})
              </h2>
              <div className="space-y-6">
                {upcomingBookings.map((booking) => (
                  <BookingCard key={booking._id} booking={booking} onCancelSuccess={fetchBookings} />
                ))}
              </div>
            </section>
          )}

          {/* Past Bookings */}
          {pastBookings.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full" />
                Past Bookings ({pastBookings.length})
              </h2>
              <div className="space-y-6">
                {pastBookings.map((booking) => (
                  <BookingCard key={booking._id} booking={booking} onCancelSuccess={fetchBookings} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}