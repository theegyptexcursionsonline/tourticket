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
  MessageSquare,
  CreditCard,
  Download,
  RefreshCw,
  AlertTriangle,
  Package,
  Receipt,
  QrCode,
  Info,
  Save,
  X,
  History,
  Building2,
  Globe,
  Sparkles,
  FileText,
  Shield
} from 'lucide-react';
import Image from 'next/image';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

// Valid booking statuses
type BookingStatus = 'Confirmed' | 'Pending' | 'Cancelled' | 'Refunded' | 'Partial_Refund';

// Edit history entry interface
interface EditHistoryEntry {
  editedAt: string;
  editedBy: string;
  editedByName?: string;
  field: string;
  previousValue: string;
  newValue: string;
  changeType: 'status_change' | 'detail_update' | 'refund';
}

// Enhanced interfaces matching your booking model
interface BookingUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email: string;
  phone?: string;
}

interface BookingOption {
  id?: string;
  _id?: string;
  title: string;
  price: number;
  originalPrice?: number;
  duration?: string;
  badge?: string;
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
  meetingPoint?: string;
  bookingOptions?: BookingOption[];
}

interface BookingDetails {
  _id: string;
  bookingReference?: string;
  source?: 'online' | 'manual';
  tour: BookingTour | null;
  user: BookingUser | null;
  date: string;
  dateString?: string;
  time: string;
  guests: number;
  totalPrice: number;
  currency?: string;
  status: BookingStatus;
  // Payment
  paymentStatus?: 'paid' | 'pending' | 'pay_on_arrival';
  amountPaid?: number;
  // Enhanced fields
  adultGuests?: number;
  childGuests?: number;
  infantGuests?: number;
  paymentId?: string;
  paymentMethod?: string;
  specialRequests?: string;
  emergencyContact?: string;
  // Customer extras
  customerPhone?: string;
  customerCountry?: string;
  // Pickup
  pickupLocation?: string;
  pickupAddress?: string;
  // Internal
  internalNotes?: string;
  // Applied offer
  appliedOffer?: {
    id: string;
    name: string;
    offerType: string;
    discountAmount: number;
    discountValue: number;
    endDate?: string;
  };
  hotelPickupDetails?: string;
  hotelPickupLocation?: {
    address: string;
    lat: number;
    lng: number;
    placeId?: string;
    name?: string;
  };
  selectedAddOns?: { [key: string]: number };
  selectedBookingOption?: {
    _id?: string;
    id?: string;
    title: string;
    price: number;
    originalPrice?: number;
    duration?: string;
    badge?: string;
  };
  selectedAddOnDetails?: {
    [key: string]: {
      title: string;
      price: number;
      perGuest?: boolean;
    };
  };
  // Edit history
  editHistory?: EditHistoryEntry[];
  // Refund tracking
  refundAmount?: number;
  refundDate?: string;
  refundReason?: string;
  // Discount tracking
  discountCode?: string;
  discountAmount?: number;
  createdAt: string;
  updatedAt: string;
}

// Safe toFixed helper - handles undefined/null/NaN values
const safeToFixed = (value: number | undefined | null, digits = 2): string => {
  if (value === undefined || value === null || isNaN(Number(value))) return (0).toFixed(digits);
  return Number(value).toFixed(digits);
};

// Currency symbol mapping
const getCurrencySymbol = (currency?: string): string => {
  const symbols: { [key: string]: string } = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    EGP: 'E£',
    AED: 'د.إ',
    CHF: 'CHF',
    CAD: 'C$',
    AUD: 'A$',
    SEK: 'kr',
    DKK: 'kr',
    NOK: 'kr',
    JPY: '¥',
    KRW: '₩',
    CNY: '¥',
    INR: '₹',
    SAR: '﷼',
    QAR: '﷼',
    KWD: 'د.ك',
    BHD: 'د.ب',
    OMR: 'ر.ع.',
  };
  return symbols[currency?.toUpperCase() || 'USD'] || '$';
};

// Helper to format dates consistently and avoid timezone issues
const formatDisplayDate = (dateString: string | Date | undefined): string => {
  if (!dateString) return '';

  const dateStr = dateString instanceof Date
    ? dateString.toISOString()
    : String(dateString);

  // Extract just the date part (YYYY-MM-DD) to avoid timezone issues
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return localDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  // Fallback
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const BookingDetailPage = () => {
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedDate, setEditedDate] = useState<string>('');
  const [editedTime, setEditedTime] = useState<string>('');
  const [editedBookingOption, setEditedBookingOption] = useState<BookingOption | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // Refund modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('');
  const [refundType, setRefundType] = useState<'Refunded' | 'Partial_Refund'>('Refunded');
  
  const params = useParams();
  const router = useRouter();
  const { token } = useAdminAuth();
  const id = params.id as string;

  // Generate QR Code
  useEffect(() => {
    if (booking?.bookingReference || booking?._id) {
      const bookingId = booking.bookingReference || booking._id;
      const verificationUrl = `${window.location.origin}/booking/verify/${bookingId}`;
      
      QRCode.toDataURL(verificationUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
        .then(setQrCodeUrl)
        .catch((err) => console.error('Error generating QR code:', err));
    }
  }, [booking]);

  const getAuthHeaders = (): HeadersInit => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchBooking = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/bookings/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (response.status === 404) {
          throw new Error('Booking not found');
        }
        throw new Error(errorData?.error || errorData?.message || 'Failed to fetch booking details');
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
    
    // Handle refund statuses
    if (newStatus === 'Refunded' || newStatus === 'Partial_Refund') {
      setRefundType(newStatus as 'Refunded' | 'Partial_Refund');
      setRefundAmount(newStatus === 'Refunded' ? booking.totalPrice.toString() : '');
      setShowRefundModal(true);
      return;
    }
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || errorData?.message || 'Failed to update booking status');
      }

      const updatedBooking = await response.json();
      setBooking(updatedBooking);
      toast.success(`Status updated to ${newStatus}`);
    } catch (err) {
      console.error('Error updating booking:', err);
      toast.error((err as Error).message || 'Failed to update booking status');
    } finally {
      setUpdating(false);
    }
  };

  const handleRefundSubmit = async () => {
    if (!booking) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status: refundType,
          refundAmount: parseFloat(refundAmount) || 0,
          refundReason: refundReason
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || errorData?.message || 'Failed to process refund');
      }

      const updatedBooking = await response.json();
      setBooking(updatedBooking);
      setShowRefundModal(false);
      setRefundAmount('');
      setRefundReason('');
      toast.success(`${refundType === 'Refunded' ? 'Full' : 'Partial'} refund processed successfully`);
    } catch (err) {
      console.error('Error processing refund:', err);
      toast.error((err as Error).message || 'Failed to process refund');
    } finally {
      setUpdating(false);
    }
  };

  const startEditing = () => {
    if (!booking) return;
    setEditedDate(booking.dateString || booking.date.split('T')[0]);
    setEditedTime(booking.time);
    setEditedBookingOption(booking.selectedBookingOption || null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditedDate('');
    setEditedTime('');
    setEditedBookingOption(null);
  };

  const saveEdits = async () => {
    if (!booking) return;
    
    setUpdating(true);
    try {
      const updates: Record<string, any> = {};
      
      // Check what changed
      const currentDate = booking.dateString || booking.date.split('T')[0];
      if (editedDate && editedDate !== currentDate) {
        updates.dateString = editedDate;
      }
      
      if (editedTime && editedTime !== booking.time) {
        updates.time = editedTime;
      }
      
      if (editedBookingOption && editedBookingOption.title !== booking.selectedBookingOption?.title) {
        updates.selectedBookingOption = editedBookingOption;
      }
      
      if (Object.keys(updates).length === 0) {
        toast('No changes to save', { icon: 'ℹ️' });
        setIsEditing(false);
        return;
      }
      
      const response = await fetch(`/api/admin/bookings/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || errorData?.message || 'Failed to save changes');
      }

      const updatedBooking = await response.json();
      setBooking(updatedBooking);
      setIsEditing(false);
      toast.success('Booking details updated successfully');
    } catch (err) {
      console.error('Error saving edits:', err);
      toast.error((err as Error).message || 'Failed to save changes');
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
      case 'Refunded':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'Partial_Refund':
        return `${baseClasses} bg-purple-100 text-purple-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'Partial_Refund') return 'Partial Refund';
    return status;
  };

  const formatUserName = (user: BookingUser | null | undefined) => {
    if (!user) return 'Unknown Customer';
    if (user.name) return user.name;
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.firstName || user.email || 'Unknown';
  };

  const formatGuestBreakdown = (booking: BookingDetails) => {
    const parts = [];
    if (booking.adultGuests) parts.push(`${booking.adultGuests} Adult${booking.adultGuests > 1 ? 's' : ''}`);
    if (booking.childGuests) parts.push(`${booking.childGuests} Child${booking.childGuests > 1 ? 'ren' : ''}`);
    if (booking.infantGuests) parts.push(`${booking.infantGuests} Infant${booking.infantGuests > 1 ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') : `${booking.guests} Guest${booking.guests > 1 ? 's' : ''}`;
  };

  // Calculate pricing breakdown
  const calculatePricing = () => {
    if (!booking) return null;

    const basePrice = booking.selectedBookingOption?.price || 0;
    const adultPrice = basePrice * (booking.adultGuests || 1);
    const childPrice = (basePrice / 2) * (booking.childGuests || 0);
    const tourSubtotal = adultPrice + childPrice;

    let addOnsTotal = 0;
    if (booking.selectedAddOns && booking.selectedAddOnDetails) {
      Object.entries(booking.selectedAddOns).forEach(([addOnId, quantity]) => {
        const addOnDetail = booking.selectedAddOnDetails?.[addOnId];
        if (addOnDetail && quantity > 0) {
          const totalGuests = (booking.adultGuests || 0) + (booking.childGuests || 0);
          const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
          addOnsTotal += addOnDetail.price * addOnQuantity;
        }
      });
    }

    // Subtotal includes tour price + add-ons
    const subtotal = tourSubtotal + addOnsTotal;

    // Service fee and tax are calculated on the full subtotal (including add-ons)
    const serviceFee = subtotal * 0.03;
    const tax = subtotal * 0.05;

    // Get discount amount from booking record
    const discount = booking.discountAmount || 0;

    // Calculate the correct total (subtract discount)
    const preDiscountTotal = subtotal + serviceFee + tax;
    const calculatedTotal = Math.max(0, preDiscountTotal - discount);

    // Prefer stored totalPrice when it already includes discount.
    // For older bookings (before discount was subtracted at save time), totalPrice equals preDiscountTotal.
    let total = booking.totalPrice > 0 ? booking.totalPrice : calculatedTotal;
    const epsilon = 0.02; // tolerate rounding differences
    if (discount > 0 && Math.abs(total - preDiscountTotal) <= epsilon) {
      total = Math.max(0, preDiscountTotal - discount);
    }

    return {
      adultPrice,
      childPrice,
      tourSubtotal,
      subtotal,
      addOnsTotal,
      serviceFee,
      tax,
      discount,
      total
    };
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
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
      <div className="p-6 max-w-7xl mx-auto">
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
      <div className="p-6 max-w-7xl mx-auto">
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

  const pricing = calculatePricing();

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
    <div className="p-6 max-w-7xl mx-auto">
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
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold text-slate-800">Booking Details</h1>
              {booking.source === 'manual' && (
                <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-700 rounded-full">Manual</span>
              )}
            </div>
            <p className="text-slate-500 text-sm">
              {booking.bookingReference ? (
                <>Reference: <span className="font-mono font-semibold">{booking.bookingReference}</span></>
              ) : (
                <>ID: {booking._id}</>
              )}
            </p>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Tour & QR */}
        <div className="lg:col-span-1 space-y-6">
          {/* Tour Card */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <div className="aspect-video rounded-t-lg overflow-hidden bg-slate-100">
              <Image
                src={booking.tour?.image || booking.tour?.images?.[0] || '/bg.png'}
                alt={booking.tour?.title || 'Tour'}
                width={500}
                height={300}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4">
              <h2 className="text-lg font-bold text-slate-900 mb-2">{booking.tour?.title || 'Tour (data unavailable)'}</h2>
              {booking.tour?.destination && (
                <div className="flex items-center text-sm text-slate-600 mb-4">
                  <MapPin size={14} className="mr-1" />
                  {booking.tour.destination.name}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-xl font-bold text-slate-900">
                      {getCurrencySymbol(booking.currency)}{safeToFixed(booking.totalPrice)}
                      {booking.currency && booking.currency !== 'USD' && (
                        <span className="text-sm text-slate-400 ml-1">{booking.currency}</span>
                      )}
                    </div>
                  <div className="text-xs text-slate-500">Total Price</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xl font-bold text-slate-900">{booking.guests}</div>
                  <div className="text-xs text-slate-500">Guests</div>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Card */}
          {qrCodeUrl && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <QrCode className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">QR Code</h3>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <Image 
                  src={qrCodeUrl} 
                  alt="Booking QR Code" 
                  width={300} 
                  height={300}
                  className="w-full h-auto"
                />
              </div>
              <p className="text-xs text-slate-600 text-center">
                Verification code for tour operator
              </p>
            </div>
          )}

          {/* Status Management */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Status Management</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Current Status:</span>
                <span className={getStatusBadge(booking.status)}>
                  {getStatusLabel(booking.status)}
                </span>
              </div>
              
              <select
                value={booking.status}
                onChange={(e) => updateBookingStatus(e.target.value)}
                disabled={updating}
                className="w-full appearance-none bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              >
                <option value="Confirmed">Confirmed</option>
                <option value="Pending">Pending</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Refunded">Refunded</option>
                <option value="Partial_Refund">Partial Refund</option>
              </select>
              
              {/* Refund info if applicable */}
              {(booking.status === 'Refunded' || booking.status === 'Partial_Refund') && booking.refundAmount && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800">
                    Refund Amount: {getCurrencySymbol(booking.currency)}{safeToFixed(booking.refundAmount)}
                  </p>
                  {booking.refundDate && (
                    <p className="text-xs text-blue-600 mt-1">
                      Processed: {new Date(booking.refundDate).toLocaleDateString()}
                    </p>
                  )}
                  {booking.refundReason && (
                    <p className="text-xs text-blue-600 mt-1">
                      Reason: {booking.refundReason}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Edit Booking Button */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Edit Booking</h3>
            {isEditing ? (
              <div className="space-y-3">
                <button
                  onClick={saveEdits}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  Save Changes
                </button>
                <button
                  onClick={cancelEditing}
                  disabled={updating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={startEditing}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit size={16} />
                Edit Details
              </button>
            )}
          </div>
          
          {/* Edit History */}
          {booking.editHistory && booking.editHistory.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <History size={16} />
                Edit History
              </h3>
              <button
                onClick={() => setShowHistoryModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                View {booking.editHistory.length} change{booking.editHistory.length !== 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
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
              {booking.user?.email && (
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
              )}
              {booking.user?.phone && (
                <DetailItem
                  icon={Phone}
                  label="Phone"
                  value={
                    <a
                      href={`tel:${booking.user.phone}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {booking.user.phone}
                    </a>
                  }
                />
              )}
              {booking.customerPhone && !booking.user?.phone && (
                <DetailItem
                  icon={Phone}
                  label="Phone"
                  value={
                    <a
                      href={`tel:${booking.customerPhone}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {booking.customerPhone}
                    </a>
                  }
                />
              )}
              {booking.customerCountry && (
                <DetailItem
                  icon={Globe}
                  label="Country"
                  value={booking.customerCountry}
                />
              )}
              {booking.emergencyContact && (
                <DetailItem
                  icon={Shield}
                  label="Emergency Contact"
                  value={booking.emergencyContact}
                />
              )}
            </div>
          </div>

          {/* Booking Details */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-green-500" />
              Booking Details
              {isEditing && <span className="ml-2 text-sm font-normal text-blue-600">(Editing)</span>}
            </h3>
            <div className="space-y-4">
              {/* Tour Date - Editable */}
              {isEditing ? (
                <div className="flex items-start text-slate-700">
                  <Calendar className="h-5 w-5 mr-3 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-600">Tour Date:</span>
                    <input
                      type="date"
                      value={editedDate}
                      onChange={(e) => setEditedDate(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                    />
                  </div>
                </div>
              ) : (
                <DetailItem
                  icon={Calendar}
                  label="Tour Date"
                  value={formatDisplayDate(booking.dateString || booking.date)}
                />
              )}
              
              {/* Time - Editable */}
              {isEditing ? (
                <div className="flex items-start text-slate-700">
                  <Clock className="h-5 w-5 mr-3 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-600">Time:</span>
                    <input
                      type="time"
                      value={editedTime}
                      onChange={(e) => setEditedTime(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                    />
                  </div>
                </div>
              ) : (
                <DetailItem 
                  icon={Clock} 
                  label="Time" 
                  value={booking.time}
                />
              )}
              
              <DetailItem
                icon={Users}
                label="Participants"
                value={formatGuestBreakdown(booking)}
              />
              
              {/* Booking Option - Editable */}
              {isEditing && booking.tour?.bookingOptions && booking.tour.bookingOptions.length > 0 ? (
                <div className="flex items-start text-slate-700">
                  <Package className="h-5 w-5 mr-3 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-slate-600">Booking Option:</span>
                    <select
                      value={editedBookingOption?.title || booking.selectedBookingOption?.title || ''}
                      onChange={(e) => {
                        const selected = booking.tour?.bookingOptions?.find(o => o.title === e.target.value);
                        if (selected) {
                          setEditedBookingOption({
                            id: selected.id || selected._id || '',
                            title: selected.title,
                            price: selected.price,
                            originalPrice: selected.originalPrice,
                            duration: selected.duration,
                            badge: selected.badge,
                          });
                        }
                      }}
                      className="mt-1 block w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50"
                    >
                      {booking.tour.bookingOptions.map((option) => (
                        <option key={option.id || option._id || option.title} value={option.title}>
                          {option.title} - ${safeToFixed(option.price)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : booking.selectedBookingOption ? (
                <DetailItem
                  icon={Package}
                  label="Booking Option"
                  value={
                    <div>
                      <span className="text-blue-600 font-medium block">
                        {booking.selectedBookingOption.title}
                      </span>
                      {booking.selectedBookingOption.duration && (
                        <span className="text-sm text-slate-500">
                          Duration: {booking.selectedBookingOption.duration}
                        </span>
                      )}
                      {booking.selectedBookingOption.badge && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full ml-2">
                          {booking.selectedBookingOption.badge}
                        </span>
                      )}
                    </div>
                  }
                />
              ) : null}
              
              {booking.tour?.duration && !booking.selectedBookingOption?.duration && (
                <DetailItem
                  icon={Tag}
                  label="Duration"
                  value={booking.tour.duration}
                />
              )}
              {booking.tour?.meetingPoint && (
                <DetailItem
                  icon={MapPin}
                  label="Meeting Point"
                  value={booking.tour.meetingPoint}
                />
              )}
              
              {/* Hotel Pickup - Fixed display */}
              {(booking.hotelPickupDetails || booking.hotelPickupLocation) && (
                <DetailItem
                  icon={Building2}
                  label="Hotel Pickup"
                  value={
                    <div className="space-y-2">
                      {/* Hotel Name - Show hotelPickupDetails first (this is the user-entered hotel name) */}
                      {booking.hotelPickupDetails && (
                        <span className="text-red-600 font-semibold block text-lg">
                          🏨 {booking.hotelPickupDetails}
                        </span>
                      )}
                      {/* Address - Show separately if we have location data */}
                      {booking.hotelPickupLocation?.address && (
                        <div className="text-sm text-slate-600">
                          <span className="font-medium">Address: </span>
                          {booking.hotelPickupLocation.address}
                        </div>
                      )}
                      {booking.hotelPickupLocation && (
                        <>
                          <div className="text-xs text-slate-500">
                            📍 Coordinates: {safeToFixed(booking.hotelPickupLocation.lat, 6)}, {safeToFixed(booking.hotelPickupLocation.lng, 6)}
                          </div>
                          <div className="mt-3">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${booking.hotelPickupLocation.lat},${booking.hotelPickupLocation.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              <MapPin size={14} />
                              View on Google Maps
                            </a>
                          </div>
                          <div className="mt-2 rounded-lg overflow-hidden border border-slate-200">
                            <iframe
                              width="100%"
                              height="200"
                              style={{ border: 0 }}
                              loading="lazy"
                              allowFullScreen
                              referrerPolicy="no-referrer-when-downgrade"
                              src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&q=${booking.hotelPickupLocation.lat},${booking.hotelPickupLocation.lng}&zoom=15`}
                            ></iframe>
                          </div>
                        </>
                      )}
                    </div>
                  }
                />
              )}
              
              <DetailItem 
                icon={Calendar} 
                label="Booked On" 
                value={new Date(booking.createdAt).toLocaleString()}
              />
              <DetailItem 
                icon={Calendar} 
                label="Last Updated" 
                value={new Date(booking.updatedAt).toLocaleString()}
              />
            </div>
          </div>

          {/* Pricing Breakdown */}
          {pricing && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-center">
                <Receipt className="w-5 h-5 mr-2 text-green-500" />
                Pricing Breakdown
              </h3>
              <div className="space-y-3">
                {booking.adultGuests && booking.adultGuests > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>{booking.adultGuests} x Adult{booking.adultGuests > 1 ? 's' : ''} ({getCurrencySymbol(booking.currency)}{safeToFixed(booking.selectedBookingOption?.price)})</span>
                    <span className="font-semibold">{getCurrencySymbol(booking.currency)}{safeToFixed(pricing.adultPrice)}</span>
                  </div>
                )}
                {booking.childGuests && booking.childGuests > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>{booking.childGuests} x Child{booking.childGuests > 1 ? 'ren' : ''} ({getCurrencySymbol(booking.currency)}{safeToFixed((booking.selectedBookingOption?.price || 0) / 2)})</span>
                    <span className="font-semibold">{getCurrencySymbol(booking.currency)}{safeToFixed(pricing.childPrice)}</span>
                  </div>
                )}
                {booking.infantGuests && booking.infantGuests > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>{booking.infantGuests} x Infant{booking.infantGuests > 1 ? 's' : ''}</span>
                    <span className="font-semibold text-green-600">FREE</span>
                  </div>
                )}

                {pricing.addOnsTotal > 0 && (
                  <>
                    <div className="border-t pt-3 mt-3"></div>
                    <div className="flex justify-between text-slate-700">
                      <span>Add-ons</span>
                      <span className="font-semibold">{getCurrencySymbol(booking.currency)}{safeToFixed(pricing.addOnsTotal)}</span>
                    </div>
                  </>
                )}

                <div className="border-t pt-3 mt-3"></div>
                <div className="flex justify-between text-slate-700">
                  <span>Subtotal</span>
                  <span className="font-semibold">{getCurrencySymbol(booking.currency)}{safeToFixed(pricing.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-sm">
                  <span>Service Fee (3%)</span>
                  <span>{getCurrencySymbol(booking.currency)}{safeToFixed(pricing.serviceFee)}</span>
                </div>
                <div className="flex justify-between text-slate-600 text-sm">
                  <span>Tax (5%)</span>
                  <span>{getCurrencySymbol(booking.currency)}{safeToFixed(pricing.tax)}</span>
                </div>
                
                {booking.discountAmount && booking.discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-2">
                      Discount
                      {booking.discountCode && (
                        <span className="text-xs bg-green-100 px-2 py-0.5 rounded-full font-medium">
                          {booking.discountCode}
                        </span>
                      )}
                    </span>
                    <span className="font-semibold">-{getCurrencySymbol(booking.currency)}{safeToFixed(booking.discountAmount)}</span>
                  </div>
                )}

                <div className="border-t-2 border-slate-300 pt-3 mt-3 flex justify-between">
                  <span className="text-lg font-bold text-slate-900">Total Paid</span>
                  <span className="text-lg font-bold text-green-600">
                    {getCurrencySymbol(booking.currency)}{safeToFixed(pricing.total)}
                    {booking.currency && booking.currency !== 'USD' && (
                      <span className="text-sm text-slate-400 ml-1">{booking.currency}</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Payment Information */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-green-500" />
              Payment Information
            </h3>
            <div className="space-y-4">
              {booking.paymentStatus && (
                <DetailItem
                  icon={DollarSign}
                  label="Payment Status"
                  value={
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                      booking.paymentStatus === 'pay_on_arrival' ? 'bg-amber-100 text-amber-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {booking.paymentStatus === 'pay_on_arrival' ? 'Pay on Arrival' : booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1)}
                    </span>
                  }
                />
              )}
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
              {booking.amountPaid !== undefined && booking.amountPaid > 0 && (
                <DetailItem
                  icon={DollarSign}
                  label="Amount Paid"
                  value={`${getCurrencySymbol(booking.currency)}${safeToFixed(booking.amountPaid)}`}
                />
              )}
              {booking.paymentId && (
                <DetailItem
                  icon={Hash}
                  label="Payment ID"
                  value={
                    <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono">
                      {booking.paymentId}
                    </code>
                  }
                />
              )}
              {booking.discountCode && (
                <DetailItem 
                  icon={Tag} 
                  label="Promo Code Applied" 
                  value={
                    <div className="flex items-center gap-2">
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                        {booking.discountCode}
                      </span>
                      {booking.discountAmount && booking.discountAmount > 0 && (
                        <span className="text-green-600 font-medium">
                          (-{getCurrencySymbol(booking.currency)}{safeToFixed(booking.discountAmount)})
                        </span>
                      )}
                    </div>
                  }
                />
              )}
            </div>
          </div>

          {/* Selected Add-ons */}
          {booking.selectedAddOns && Object.keys(booking.selectedAddOns).length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-center">
                <Package className="w-5 h-5 mr-2 text-blue-500" />
                Selected Add-ons
              </h3>
              <div className="space-y-3">
                {Object.entries(booking.selectedAddOns).map(([addOnId, quantity]) => {
                  const addOnDetail = booking.selectedAddOnDetails?.[addOnId];
                  if (!addOnDetail || quantity === 0) return null;
                  
                  const totalGuests = (booking.adultGuests || 0) + (booking.childGuests || 0);
                  const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
                  const addOnTotal = addOnDetail.price * addOnQuantity;
                  
                  return (
                    <div
                      key={addOnId}
                      className="flex items-center justify-between bg-slate-50 rounded-lg p-4 border border-slate-200"
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                        <div>
                          <div className="font-medium text-slate-800">
                            {addOnDetail.title}
                          </div>
                          <div className="text-sm text-slate-500">
                            {addOnDetail.perGuest ? `Per guest (${totalGuests} guests)` : 'Per booking'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-slate-700">
                                          {getCurrencySymbol(booking.currency)}{safeToFixed(addOnTotal)}
                        </div>
                        <div className="text-xs text-slate-500">
                                          {getCurrencySymbol(booking.currency)}{safeToFixed(addOnDetail.price)} {addOnDetail.perGuest ? 'per guest' : 'total'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pickup Details */}
          {(booking.pickupLocation || booking.pickupAddress) && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-orange-500" />
                Pickup Details
              </h3>
              <div className="space-y-4">
                {booking.pickupLocation && (
                  <DetailItem icon={MapPin} label="Location" value={booking.pickupLocation} />
                )}
                {booking.pickupAddress && (
                  <DetailItem icon={Building2} label="Address" value={booking.pickupAddress} />
                )}
              </div>
            </div>
          )}

          {/* Applied Offer */}
          {booking.appliedOffer && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h3 className="font-bold text-amber-900 mb-3 flex items-center">
                <Sparkles className="w-5 h-5 mr-2" />
                Applied Offer
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-amber-800">{booking.appliedOffer.name}</p>
                  <p className="text-sm text-amber-700 capitalize">{booking.appliedOffer.offerType.replace(/_/g, ' ')}</p>
                </div>
                <span className="text-lg font-bold text-green-700">
                  -{getCurrencySymbol(booking.currency)}{safeToFixed(booking.appliedOffer.discountAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Special Requests */}
          {booking.specialRequests && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
              <h3 className="font-bold text-amber-900 mb-3 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Special Requests
              </h3>
              <p className="text-amber-800">{booking.specialRequests}</p>
            </div>
          )}

          {/* Internal Notes */}
          {booking.internalNotes && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-slate-500" />
                Internal Notes
              </h3>
              <p className="text-slate-700 whitespace-pre-wrap">{booking.internalNotes}</p>
            </div>
          )}

          {/* Admin Notes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-blue-900 mb-3 flex items-center">
              <Info className="w-5 h-5 mr-2" />
              Important Notes
            </h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Customer should arrive 15 minutes before departure</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Verify booking reference or QR code before tour starts</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Contact customer: {booking.user?.email || 'N/A'}</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Support hotline: +20 11 42255624</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => !updating && setShowRefundModal(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-center text-slate-900 mb-2">
                Process {refundType === 'Refunded' ? 'Full' : 'Partial'} Refund
              </h3>
              <p className="text-sm text-slate-600 text-center mb-6">
                Original booking amount: {getCurrencySymbol(booking.currency)}{safeToFixed(booking.totalPrice)} {booking.currency || 'USD'}
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Refund Type
                  </label>
                  <select
                    value={refundType}
                    onChange={(e) => {
                      setRefundType(e.target.value as 'Refunded' | 'Partial_Refund');
                      if (e.target.value === 'Refunded') {
                        setRefundAmount(booking.totalPrice.toString());
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Refunded">Full Refund</option>
                    <option value="Partial_Refund">Partial Refund</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Refund Amount ({getCurrencySymbol(booking.currency)}{booking.currency || 'USD'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={booking.totalPrice}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    disabled={refundType === 'Refunded'}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Reason (optional)
                  </label>
                  <textarea
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter reason for refund..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowRefundModal(false)}
                  disabled={updating}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRefundSubmit}
                  disabled={updating || !refundAmount || parseFloat(refundAmount) <= 0}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {updating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      Process Refund
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit History Modal */}
      {showHistoryModal && booking.editHistory && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setShowHistoryModal(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Edit History
                </h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                {booking.editHistory
                  .slice()
                  .reverse()
                  .map((entry, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        entry.changeType === 'status_change'
                          ? 'bg-blue-50 border-blue-200'
                          : entry.changeType === 'refund'
                          ? 'bg-purple-50 border-purple-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            entry.changeType === 'status_change'
                              ? 'bg-blue-100 text-blue-800'
                              : entry.changeType === 'refund'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}>
                            {entry.changeType === 'status_change' ? 'Status Change' :
                             entry.changeType === 'refund' ? 'Refund' : 'Detail Update'}
                          </span>
                          <p className="mt-2 font-medium text-slate-900">
                            {entry.field.charAt(0).toUpperCase() + entry.field.slice(1)}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-sm">
                            <span className="text-red-600 line-through">{entry.previousValue}</span>
                            <span className="text-slate-400">→</span>
                            <span className="text-green-600 font-medium">{entry.newValue}</span>
                          </div>
                        </div>
                        <div className="text-right text-xs text-slate-500">
                          <p className="font-medium">{entry.editedByName || entry.editedBy}</p>
                          <p>{new Date(entry.editedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                {booking.editHistory.length === 0 && (
                  <p className="text-center text-slate-500 py-8">No edit history available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default withAuth(BookingDetailPage, { permissions: ['manageBookings'] });
