'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  Users, 
  DollarSign, 
  MapPin,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  XCircle,
  CheckCircle,
  Download
} from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface BookingUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
}

interface BookingTour {
  _id: string;
  title: string;
  image?: string;
  images?: string[];
  duration?: string;
  destination?: {
    _id: string;
    name: string;
    slug?: string;
  };
  rating?: number;
  slug?: string;
}

interface BookingDetails {
  _id: string;
  tour: BookingTour;
  user: BookingUser;
  date: string;
  time: string;
  guests: number;
  totalPrice: number;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  adultGuests?: number;
  childGuests?: number;
  infantGuests?: number;
  paymentId?: string;
  paymentMethod?: string;
  specialRequests?: string;
  emergencyContact?: string;
  selectedAddOns?: { [key: string]: number };
  createdAt: string;
  updatedAt: string;
}

const UserBookingDetailPage = () => {
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const id = params.id as string;

  const fetchBooking = async () => {
    if (!token) {
      router.push('/login?redirect=/user/bookings');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/bookings/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Session expired. Please log in again.');
          router.push('/login?redirect=/user/bookings');
          return;
        }
        if (response.status === 404) {
          throw new Error('Booking not found');
        }
        throw new Error('Failed to fetch booking details');
      }

      const data = await response.json();
      setBooking(data.data || data);
    } catch (err) {
      setError((err as Error).message);
      console.error('Error fetching booking:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchBooking();
    }
  }, [id, token]);

  const handleCancelBooking = async () => {
    if (!booking || !token) return;
    
    setCancelling(true);
    try {
      const response = await fetch(`/api/bookings/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: cancelReason }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel booking');
      }

      const result = await response.json();
      
      toast.success(
        result.refundAmount > 0 
          ? `Booking cancelled. You'll receive a refund of $${result.refundAmount.toFixed(2)}`
          : 'Booking cancelled successfully'
      );
      
      setShowCancelModal(false);
      fetchBooking();
    } catch (err) {
      console.error('Error cancelling booking:', err);
      toast.error((err as Error).message);
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-4 py-2 text-sm font-semibold rounded-full inline-flex items-center gap-2";
    switch (status) {
      case 'Confirmed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'Pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'Cancelled':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatUserName = (user: BookingUser) => {
    if (user.name) return user.name;
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.firstName || user.email;
  };

  const formatGuestBreakdown = (booking: BookingDetails) => {
    const parts = [];
    if (booking.adultGuests) parts.push(`${booking.adultGuests} Adult${booking.adultGuests > 1 ? 's' : ''}`);
    if (booking.childGuests) parts.push(`${booking.childGuests} Child${booking.childGuests > 1 ? 'ren' : ''}`);
    if (booking.infantGuests) parts.push(`${booking.infantGuests} Infant${booking.infantGuests > 1 ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') : `${booking.guests} Guest${booking.guests > 1 ? 's' : ''}`;
  };

  const canCancelBooking = () => {
    if (!booking) return false;
    if (booking.status === 'Cancelled') return false;
    
    const bookingDate = new Date(booking.date);
    const now = new Date();
    const hoursUntilBooking = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilBooking > 24;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="h-8 w-1/4 bg-gray-200 rounded animate-pulse mb-6"></div>
          <div className="bg-white p-8 rounded-2xl shadow-sm animate-pulse">
            <div className="h-6 w-1/2 bg-gray-300 rounded mb-4"></div>
            <div className="h-4 w-1/3 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="h-64 w-full bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-5 w-3/4 bg-gray-300 rounded"></div>
              </div>
              <div>
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-red-800 font-semibold text-lg">Error loading booking</h3>
            </div>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex gap-3">
              <button 
                onClick={fetchBooking}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              <button 
                onClick={() => router.back()}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-full hover:bg-red-50 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Booking not found</h3>
            <p className="text-slate-500 mb-4">This booking may have been deleted or you don't have access to it.</p>
            <button 
              onClick={() => router.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const DetailItem = ({ 
    icon: Icon, 
    label, 
    value, 
    className = "" 
  }: { 
    icon: React.ElementType; 
    label: string; 
    value: string | number | React.ReactNode; 
    className?: string;
  }) => (
    <div className={`flex items-start text-slate-700 ${className}`}>
      <Icon className="h-5 w-5 mr-3 text-slate-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <span className="font-semibold text-slate-600">{label}:</span>
        <div className="mt-1">{value}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button 
              onClick={() => router.back()} 
              className="p-2 rounded-full hover:bg-white/50 mr-4 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Booking Details</h1>
              <p className="text-slate-600 text-sm">Booking ID: {booking._id}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchBooking}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header Section */}
          <div className="p-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold text-slate-900 truncate mb-2">
                  {booking.tour.title}
                </h2>
                {booking.tour.destination && (
                  <div className="flex items-center mt-1 text-slate-600">
                    <MapPin size={14} className="mr-1" />
                    {booking.tour.destination.name}
                  </div>
                )}
                <div className="flex items-center mt-2 text-sm text-slate-500">
                  <Calendar size={14} className="mr-1" />
                  Booked on {new Date(booking.createdAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-3 mt-4 sm:mt-0">
                <span className={getStatusBadge(booking.status)}>
                  {booking.status === 'Confirmed' && <CheckCircle size={16} />}
                  {booking.status === 'Cancelled' && <XCircle size={16} />}
                  {booking.status}
                </span>
                
                {canCancelBooking() && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm border border-red-300 text-red-600 rounded-full hover:bg-red-50 transition-colors"
                  >
                    <XCircle size={16} />
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Tour Image */}
              <div className="lg:col-span-2">
                <div className="aspect-w-16 aspect-h-12 rounded-lg overflow-hidden bg-slate-100 mb-4">
                  <Image
                    src={booking.tour.image || booking.tour.images?.[0] || '/bg.png'}
                    alt={booking.tour.title}
                    width={500}
                    height={375}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-slate-900">${booking.totalPrice.toFixed(2)}</div>
                    <div className="text-sm text-slate-500">Total Price</div>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-slate-900">{booking.guests}</div>
                    <div className="text-sm text-slate-500">Total Guests</div>
                  </div>
                </div>

                {/* View Tour Button */}
                {booking.tour.slug && (
                  <button
                    onClick={() => router.push(`/tour/${booking.tour.slug}`)}
                    className="w-full mt-4 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    View Tour Details
                  </button>
                )}
              </div>
              
              {/* Details Sections */}
              <div className="lg:col-span-3 space-y-8">
                {/* Booking Details */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                    Booking Information
                  </h3>
                  <div className="space-y-4">
                    <DetailItem 
                      icon={Calendar} 
                      label="Date" 
                      value={new Date(booking.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    />
                    <DetailItem 
                      icon={Clock} 
                      label="Time" 
                      value={booking.time}
                    />
                    <DetailItem 
                      icon={Users} 
                      label="Guests" 
                      value={formatGuestBreakdown(booking)}
                    />
                    {booking.tour.duration && (
                      <DetailItem 
                        icon={Clock} 
                        label="Duration" 
                        value={booking.tour.duration}
                      />
                    )}
                  </div>
                </div>

                {/* Payment Information */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center">
                    <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                    Payment Information
                  </h3>
                  <div className="space-y-4">
                    <DetailItem 
                      icon={DollarSign} 
                      label="Total Paid" 
                      value={
                        <span className="text-xl font-semibold text-green-600">
                          ${booking.totalPrice.toFixed(2)}
                        </span>
                      }
                    />
                    {booking.paymentMethod && (
                      <DetailItem 
                        icon={DollarSign} 
                        label="Payment Method" 
                        value={
                          <span className="capitalize bg-slate-100 px-3 py-1 rounded-full text-sm">
                            {booking.paymentMethod}
                          </span>
                        }
                      />
                    )}
                    {booking.paymentId && (
                      <DetailItem 
                        icon={DollarSign} 
                        label="Payment ID" 
                        value={
                          <code className="bg-slate-100 px-2 py-1 rounded text-sm">
                            {booking.paymentId}
                          </code>
                        }
                      />
                    )}
                  </div>
                </div>

                {/* Special Requests */}
                {booking.specialRequests && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center">
                      <MessageSquare className="w-5 h-5 mr-2 text-purple-600" />
                      Special Requests
                    </h3>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-slate-700">{booking.specialRequests}</p>
                    </div>
                  </div>
                )}

                {/* Emergency Contact */}
                {booking.emergencyContact && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200 flex items-center">
                      <Phone className="w-5 h-5 mr-2 text-red-600" />
                      Emergency Contact
                    </h3>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-slate-700">{booking.emergencyContact}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cancellation Policy Notice */}
        {booking.status !== 'Cancelled' && (
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <h3 className="font-semibold text-amber-900 mb-2">Cancellation Policy</h3>
            <p className="text-amber-800 text-sm">
              • Free cancellation up to 24 hours before the tour<br />
              • Cancellations within 24 hours may not be eligible for refund<br />
              • No-shows are not eligible for refunds
            </p>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Cancel Booking</h3>
            <p className="text-slate-600 mb-4">
              Are you sure you want to cancel this booking? This action cannot be undone.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason for cancellation (optional)
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Let us know why you're cancelling..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelling}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-full hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
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
    </div>
  );
};

export default UserBookingDetailPage;