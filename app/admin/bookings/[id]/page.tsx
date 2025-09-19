// app/admin/bookings/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import withAuth from '@/components/admin/withAuth';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  Users, 
  Hash, 
  DollarSign, 
  Tag, 
  MapPin,
  Edit,
  Trash2,
  MessageSquare,
  CreditCard,
  Download,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import Image from 'next/image';

// Enhanced interfaces matching your booking model
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
  discountPrice?: number;
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
  // Enhanced fields
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

const BookingDetailPage = () => {
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const fetchBooking = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/bookings/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Booking not found');
        }
        throw new Error('Failed to fetch booking details');
      }
      const data = await response.json();
      setBooking(data);
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
  }, [id]);

  const updateBookingStatus = async (newStatus: string) => {
    if (!booking) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update booking status');
      }

      const updatedBooking = await response.json();
      setBooking(updatedBooking);
    } catch (err) {
      console.error('Error updating booking:', err);
      alert('Failed to update booking status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 text-sm font-semibold rounded-full";
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

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="h-8 w-1/4 bg-gray-200 rounded animate-pulse mb-6"></div>
        <div className="bg-white p-8 rounded-lg shadow-sm animate-pulse">
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
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
            <h3 className="text-red-800 font-semibold text-lg">Error loading booking</h3>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex gap-3">
            <button 
              onClick={fetchBooking}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
            <button 
              onClick={() => router.back()}
              className="px-4 py-2 border border-red-300 text-red-700 rounded hover:bg-red-50 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Booking not found</h3>
          <p className="text-slate-500 mb-4">This booking may have been deleted or the ID is incorrect.</p>
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Helper component for displaying details
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
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button 
            onClick={() => router.back()} 
            className="p-2 rounded-full hover:bg-gray-100 mr-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Booking Details</h1>
            <p className="text-slate-500 text-sm">ID: {booking._id}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <Download size={16} />
            Export
          </button>
          <button 
            onClick={fetchBooking}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {/* Header Section */}
        <div className="p-6 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-slate-800 truncate">
                {booking.tour.title}
              </h2>
              {booking.tour.destination && (
                <div className="flex items-center mt-1 text-slate-500">
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
            
            <div className="flex items-center gap-3 mt-4 sm:mt-0">
              <span className={getStatusBadge(booking.status)}>
                {booking.status}
              </span>
              
              {/* Status Update Dropdown */}
              <div className="relative">
                <select
                  value={booking.status}
                  onChange={(e) => updateBookingStatus(e.target.value)}
                  disabled={updating}
                  className="appearance-none bg-white border border-slate-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Pending">Pending</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Tour Image */}
            <div className="lg:col-span-2">
              <div className="aspect-w-16 aspect-h-12 rounded-lg overflow-hidden bg-slate-100">
                <Image
                  src={booking.tour.image || booking.tour.images?.[0] || '/bg.png'}
                  alt={booking.tour.title}
                  width={500}
                  height={375}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Tour Stats */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-slate-900">${booking.totalPrice.toFixed(2)}</div>
                  <div className="text-sm text-slate-500">Total Price</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-slate-900">{booking.guests}</div>
                  <div className="text-sm text-slate-500">Total Guests</div>
                </div>
              </div>
            </div>
            
            {/* Details Sections */}
            <div className="lg:col-span-3 space-y-8">
              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-500" />
                  Customer Information
                </h3>
                <div className="space-y-4">
                  <DetailItem 
                    icon={User} 
                    label="Name" 
                    value={formatUserName(booking.user)} 
                  />
                  <DetailItem 
                    icon={Mail} 
                    label="Email" 
                    value={
                      <a 
                        href={`mailto:${booking.user.email}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {booking.user.email}
                      </a>
                    }
                  />
                  {booking.emergencyContact && (
                    <DetailItem 
                      icon={Phone} 
                      label="Emergency Contact" 
                      value={booking.emergencyContact} 
                    />
                  )}
                </div>
              </div>

              {/* Booking Details */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-green-500" />
                  Booking Details
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
                      icon={Tag} 
                      label="Duration" 
                      value={booking.tour.duration}
                    />
                  )}
                </div>
              </div>

              {/* Payment Information */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-green-500" />
                  Payment Information
                </h3>
                <div className="space-y-4">
                  <DetailItem 
                    icon={DollarSign} 
                    label="Total Price" 
                    value={
                      <span className="text-lg font-semibold text-green-600">
                        ${booking.totalPrice.toFixed(2)}
                      </span>
                    }
                  />
                  {booking.paymentMethod && (
                    <DetailItem 
                      icon={CreditCard} 
                      label="Payment Method" 
                      value={
                        <span className="capitalize bg-slate-100 px-2 py-1 rounded text-sm">
                          {booking.paymentMethod}
                        </span>
                      }
                    />
                  )}
                  {booking.paymentId && (
                    <DetailItem 
                      icon={Hash} 
                      label="Payment ID" 
                      value={
                        <code className="bg-slate-100 px-2 py-1 rounded text-sm">
                          {booking.paymentId}
                        </code>
                      }
                    />
                  )}
                  <DetailItem 
                    icon={Calendar} 
                    label="Booked On" 
                    value={new Date(booking.createdAt).toLocaleString()}
                  />
                </div>
              </div>

              {/* Special Requests */}
              {booking.specialRequests && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-purple-500" />
                    Special Requests
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-slate-700">{booking.specialRequests}</p>
                  </div>
                </div>
              )}

              {/* Selected Add-ons */}
              {booking.selectedAddOns && Object.keys(booking.selectedAddOns).length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                    Selected Add-ons
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(booking.selectedAddOns).map(([addOnId, quantity]) => (
                      <div key={addOnId} className="flex justify-between items-center bg-slate-50 rounded-lg p-3">
                        <span className="font-medium text-slate-700">{addOnId}</span>
                        <span className="text-slate-600">Qty: {quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default withAuth(BookingDetailPage);