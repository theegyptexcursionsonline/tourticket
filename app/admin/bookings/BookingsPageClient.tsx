// app/admin/bookings/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import withAuth from '@/components/admin/withAuth';
import { useRouter } from 'next/navigation';
import { Search, Calendar, Users, RefreshCw, Eye, Download, AlertTriangle, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import {
  ADMIN_BOOKING_STATUS_OPTIONS,
  isFinancialBookingStatus,
} from '@/lib/bookings/statusTransitions';
import { toSafeCsvCell } from '@/lib/admin/csv';

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
  duration?: string;
  destination?: {
    _id?: string;
    name?: string;
    slug?: string;
  } | null;
}

interface Booking {
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
  status: string;
  adultGuests?: number;
  childGuests?: number;
  infantGuests?: number;
  paymentMethod?: string;
  paymentDetails?: {
    provider?: 'stripe';
    mode?: 'test' | 'live';
    source?: 'eeo-mobile' | 'eeo-web' | 'unknown';
    transactionId?: string;
  };
  confirmationDeliveries?: Array<{
    channel: 'email-customer' | 'email-admin' | 'push';
    state: 'pending' | 'processing' | 'delivered' | 'suppressed' | 'failed';
  }>;
  confirmationSentAt?: string;
  confirmationEmailFailedAt?: string;
  paymentReconciliationState?: 'verified_primary' | 'duplicate_suppressed';
  duplicateOf?: string;
  createdAt: string;
  updatedAt: string;
}

interface BookingsResponse {
  success: boolean;
  data: Booking[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface TourOption {
  id: string;
  title: string;
}

// Safe toFixed helper - handles undefined/null/NaN values
const safeToFixed = (value: number | undefined | null, digits = 2): string => {
  if (value === undefined || value === null || isNaN(Number(value))) return (0).toFixed(digits);
  return Number(value).toFixed(digits);
};

// Currency symbol mapping
const getCurrencySymbol = (currency?: string): string => {
  const symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', EGP: 'E£', AED: 'د.إ', CHF: 'CHF',
    CAD: 'C$', AUD: 'A$', SEK: 'kr', DKK: 'kr', NOK: 'kr', JPY: '¥',
    KRW: '₩', CNY: '¥', INR: '₹', SAR: '﷼', QAR: '﷼',
  };
  return symbols[currency?.toUpperCase() || 'USD'] || '$';
};

// Format dates avoiding timezone issues
const formatDisplayDate = (dateString: string | undefined, options?: Intl.DateTimeFormatOptions): string => {
  if (!dateString) return '';
  const match = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return localDate.toLocaleDateString('en-US', options || { weekday: 'short', month: 'short', day: 'numeric' });
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', options || { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatBookedDate = (dateString: string | undefined): string => {
  return formatDisplayDate(dateString, { month: 'short', day: 'numeric' });
};

const BookingsPage = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tourId, setTourId] = useState<string>('all');
  const [purchaseFrom, setPurchaseFrom] = useState<string>('');
  const [purchaseTo, setPurchaseTo] = useState<string>('');
  const [activityFrom, setActivityFrom] = useState<string>('');
  const [activityTo, setActivityTo] = useState<string>('');
  const [sort, setSort] = useState<string>('createdAt_desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(10);

  // Tour options for filter dropdown
  const [tourOptions, setTourOptions] = useState<TourOption[]>([]);
  const [tourOptionsLoading, setTourOptionsLoading] = useState(false);

  const router = useRouter();
  const { token } = useAdminAuth();

  const getAuthHeaders = (): HeadersInit => {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const fetchTourOptions = useCallback(async () => {
    if (!token) return;
    setTourOptionsLoading(true);
    try {
      const response = await fetch('/api/admin/tours/options', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data?.success) setTourOptions(data.data || []);
    } catch {
      console.warn('Failed to load tour options');
    } finally {
      setTourOptionsLoading(false);
    }
  }, [token]);

  const buildBookingsUrl = useCallback((effectiveSearch: string) => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(perPage));
    if (effectiveSearch) params.set('search', effectiveSearch);
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
    if (tourId && tourId !== 'all') params.set('tourId', tourId);
    if (purchaseFrom) params.set('purchaseFrom', purchaseFrom);
    if (purchaseTo) params.set('purchaseTo', purchaseTo);
    if (activityFrom) params.set('activityFrom', activityFrom);
    if (activityTo) params.set('activityTo', activityTo);
    if (sort) params.set('sort', sort);
    return `/api/admin/bookings?${params.toString()}`;
  }, [activityFrom, activityTo, page, perPage, purchaseFrom, purchaseTo, sort, statusFilter, tourId]);

  const fetchBookings = useCallback(async (effectiveSearch: string) => {
    if (!token) return;
    const requestUrl = buildBookingsUrl(effectiveSearch);
    // Stale-while-revalidate keyed by the exact filter view: revisiting the
    // page (sidebar navigation) paints the last-known rows instantly while
    // the fresh list loads behind it. sessionStorage: per tab, contains
    // customer names so it must not outlive the browser session.
    const cacheKey = `admin-bookings-cache:${requestUrl}`;
    let hasCached = false;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        setBookings(parsed.bookings || []);
        setTotalBookings(parsed.total || 0);
        setTotalPages(parsed.totalPages || 1);
        hasCached = true;
      }
    } catch { /* ignore corrupt cache */ }
    setLoading(!hasCached);
    setError(null);
    try {
      // Cache-buster + no-store: the admin list must never serve a stale
      // (edge-cached) page, otherwise a just-deleted booking reappears.
      const url = `${requestUrl}&_t=${Date.now()}`;
      const response = await fetch(url, { headers: getAuthHeaders(), cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data: BookingsResponse = await response.json();
      if (!data?.success) throw new Error('Failed to fetch bookings');

      setBookings(data.data || []);
      setTotalBookings(data.meta?.total || 0);
      setTotalPages(data.meta?.totalPages || 1);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          bookings: data.data || [],
          total: data.meta?.total || 0,
          totalPages: data.meta?.totalPages || 1,
        }));
      } catch { /* ignore storage quota */ }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildBookingsUrl, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void fetchTourOptions(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchTourOptions]);

  // Debounced fetch when filters change
  useEffect(() => {
    const t = setTimeout(() => fetchBookings(searchTerm.trim()), 250);
    return () => clearTimeout(t);
  }, [fetchBookings, searchTerm]);

  // Reset page when filters change
  const filtersKey = useMemo(
    () => [statusFilter, tourId, purchaseFrom, purchaseTo, activityFrom, activityTo, sort, searchTerm.trim()].join('|'),
    [activityFrom, activityTo, purchaseFrom, purchaseTo, searchTerm, sort, statusFilter, tourId]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(1);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [filtersKey]);

  const handleRowClick = (id: string) => router.push(`/admin/bookings/${id}`);

  const formatUserName = (user: BookingUser | null | undefined) => {
    if (!user) return 'Deleted User';
    if (user.name) return user.name;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    return user.firstName || user.email || 'Unknown User';
  };

  const formatGuestBreakdown = (booking: Booking) => {
    const parts = [];
    if (booking.adultGuests) parts.push(`${booking.adultGuests}A`);
    if (booking.childGuests) parts.push(`${booking.childGuests}C`);
    if (booking.infantGuests) parts.push(`${booking.infantGuests}I`);
    return parts.length > 0 ? `${booking.guests} (${parts.join(', ')})` : booking.guests.toString();
  };

  const getTourTitle = (booking: Booking): string => booking.tour?.title || 'Deleted Tour';
  const getDestinationName = (booking: Booking): string | null => booking.tour?.destination?.name || null;

  const handleExport = () => {
    if (bookings.length === 0) return;

    const headers = [
      'Booking reference',
      'Tour',
      'Customer',
      'Customer email',
      'Activity date',
      'Activity time',
      'Guests',
      'Status',
      'Total',
      'Currency',
      'Payment method',
      'Payment provider',
      'Payment mode',
      'Payment source',
      'Customer email delivery',
      'Booking source',
      'Booked at',
    ];
    const rows = bookings.map((booking) => [
      booking.bookingReference || booking._id,
      getTourTitle(booking),
      formatUserName(booking.user),
      booking.user?.email || '',
      booking.dateString || booking.date,
      booking.time,
      formatGuestBreakdown(booking),
      booking.status,
      safeToFixed(booking.totalPrice),
      booking.currency || 'USD',
      booking.paymentMethod || '',
      booking.paymentDetails?.provider || 'Not recorded',
      booking.paymentDetails?.mode || 'Not recorded',
      booking.paymentDetails?.source || 'Not recorded',
      booking.confirmationDeliveries?.find((delivery) => delivery.channel === 'email-customer')?.state ||
        (booking.confirmationSentAt ? 'delivered' : booking.confirmationEmailFailedAt ? 'failed' : 'Not recorded'),
      booking.source || 'online',
      booking.createdAt,
    ]);
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(toSafeCsvCell).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookings-page-${page}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${bookings.length} booking${bookings.length === 1 ? '' : 's'} from this page`);
  };

  const StatusDropdown = ({ booking, onStatusChange }: {
    booking: Booking;
    onStatusChange: (bookingId: string, newStatus: string) => Promise<void>;
  }) => {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleChange = async (newStatus: string) => {
      if (isFinancialBookingStatus(newStatus)) {
        router.push(`/admin/bookings/${booking._id}#financial-actions`);
        return;
      }
      if (newStatus === 'Confirmed' && booking.status === 'Pending') {
        const method = String(booking.paymentMethod || '').toLowerCase();
        if (!['cash', 'bank'].includes(method)) {
          toast.error('Card bookings are confirmed only after Stripe verifies payment.');
          return;
        }
        if (!window.confirm(`Confirm that the ${method} payment was received in full?`)) return;
      }
      setIsUpdating(true);
      await onStatusChange(booking._id, newStatus);
      setIsUpdating(false);
    };

    const getDropdownStyle = (status: string) => {
      switch (status) {
        case 'Confirmed': return 'bg-green-100 text-green-800';
        case 'Pending': return 'bg-yellow-100 text-yellow-800';
        case 'Completed': return 'bg-indigo-100 text-indigo-800';
        case 'Cancelled': return 'bg-red-100 text-red-800';
        case 'Refunded': return 'bg-blue-100 text-blue-800';
        case 'Partial_Refund': return 'bg-purple-100 text-purple-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <div className="relative">
        <select
          aria-label={`Change status for booking ${booking.bookingReference || booking._id}`}
          value={booking.status}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isUpdating || ['Completed', 'Cancelled', 'Refunded', 'Partial_Refund'].includes(booking.status)}
          className={`appearance-none text-xs font-semibold px-3 py-2 pr-8 rounded-full border-0 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${getDropdownStyle(booking.status)}`}
        >
          {ADMIN_BOOKING_STATUS_OPTIONS.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={
                (option.value === 'Confirmed' && booking.status === 'Pending'
                  && !['cash', 'bank'].includes(String(booking.paymentMethod || '').toLowerCase()))
                || (option.value === 'Pending' && booking.status === 'Confirmed')
                || (option.value === 'Completed' && booking.status !== 'Confirmed')
              }
            >
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
          ) : (
            <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>
    );
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || data?.error || 'Failed to update booking status');
      }
      const result = await response.json().catch(() => null);
      // "Nothing silent": tell the admin when a notification email failed.
      if (result?.notifications?.customer === 'failed') {
        toast.error('Status saved, but the CUSTOMER email failed to send — notify them manually.', { duration: 8000 });
      }
      if (result?.notifications?.operator === 'failed') {
        toast.error('Status saved, but the operator notification email failed to send.', { duration: 8000 });
      }

      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: newStatus } : b));
      // Cached list views are stale after a mutation — drop them so the old
      // status can't flash back on the next visit.
      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith('admin-bookings-cache:')) sessionStorage.removeItem(key);
        }
      } catch { /* storage unavailable */ }
      const statusLabel = newStatus === 'Partial_Refund' ? 'Partial Refund' : newStatus;
      toast.success(`Booking status updated to ${statusLabel}`);
    } catch (error) {
      toast.error((error as Error).message || 'Failed to update booking status');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchBookings(searchTerm.trim());
      toast.success('Bookings refreshed');
    } finally {
      setRefreshing(false);
    }
  };
  const showingFrom = totalBookings === 0 ? 0 : (page - 1) * perPage + 1;
  const showingTo = Math.min(totalBookings, (page - 1) * perPage + bookings.length);

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-9 w-48 bg-gray-200 rounded-lg animate-pulse mb-6" />
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h3 className="text-red-800 font-semibold">Error loading bookings</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={() => fetchBookings(searchTerm.trim())}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Bookings Management</h1>
          <p className="text-slate-600 mt-1">
            Showing <span className="font-semibold text-slate-700">{showingFrom}-{showingTo}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalBookings}</span> bookings
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 mt-4 sm:mt-0 sm:ml-4 sm:flex sm:w-auto sm:items-center sm:gap-3">
          <button
            onClick={() => router.push('/admin/bookings/create')}
            className="col-span-2 flex min-h-11 items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors sm:col-span-1 sm:min-h-0"
          >
            <Plus size={16} />
            Add Booking
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex min-h-11 items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors sm:min-h-0"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={bookings.length === 0}
            title={bookings.length === 0 ? 'No bookings to export' : 'Export the bookings shown on this page as CSV'}
            className="flex min-h-11 items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-full hover:bg-slate-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 mb-6">
        {/* Row 1: Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search bookings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 pl-10 pr-4 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Row 2: Status, Tour */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
            >
              <option value="all">All</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Refunded">Refunded</option>
              <option value="Partial_Refund">Partial Refund</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Tour</label>
            <select
              value={tourId}
              onChange={(e) => setTourId(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
            >
              <option value="all">All tours</option>
              {tourOptionsLoading && <option value="loading" disabled>Loading…</option>}
              {tourOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: Date Ranges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Purchase date</label>
            <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] min-[480px]:items-center">
              <input type="date" value={purchaseFrom} onChange={(e) => setPurchaseFrom(e.target.value)}
                aria-label="Purchase date from"
                className="min-w-0 h-10 px-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <span className="sr-only text-slate-400 text-sm shrink-0 min-[480px]:not-sr-only">to</span>
              <input type="date" value={purchaseTo} onChange={(e) => setPurchaseTo(e.target.value)}
                aria-label="Purchase date to"
                className="min-w-0 h-10 px-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Activity date</label>
            <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] min-[480px]:items-center">
              <input type="date" value={activityFrom} onChange={(e) => setActivityFrom(e.target.value)}
                aria-label="Activity date from"
                className="min-w-0 h-10 px-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <span className="sr-only text-slate-400 text-sm shrink-0 min-[480px]:not-sr-only">to</span>
              <input type="date" value={activityTo} onChange={(e) => setActivityTo(e.target.value)}
                aria-label="Activity date to"
                className="min-w-0 h-10 px-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
        </div>

        {/* Row 4: Sort, Per page, Clear */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
          <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
            <span className="text-xs font-medium text-slate-500">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="h-9 min-w-0 flex-1 px-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer sm:flex-none">
              <option value="createdAt_desc">Purchase date (newest)</option>
              <option value="createdAt_asc">Purchase date (oldest)</option>
              <option value="activityDate_desc">Activity date (newest)</option>
              <option value="activityDate_asc">Activity date (oldest)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Per page</span>
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="h-9 px-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex-1" />
          {(searchTerm || statusFilter !== 'all' || tourId !== 'all' || purchaseFrom || purchaseTo || activityFrom || activityTo) && (
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); setTourId('all'); setPurchaseFrom(''); setPurchaseTo(''); setActivityFrom(''); setActivityTo(''); }}
              className="h-9 px-4 text-sm font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {bookings.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No bookings found</h3>
            <p className="text-slate-500">
              {searchTerm || statusFilter !== 'all' || tourId !== 'all' || purchaseFrom || purchaseTo || activityFrom || activityTo
                ? 'Try adjusting your filters'
                : 'No bookings have been made yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tour & Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tour Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Guests</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {bookings.map((booking) => {
                  const tourTitle = getTourTitle(booking);
                  const userName = formatUserName(booking.user);
                  const destinationName = getDestinationName(booking);
                  const isDeleted = !booking.tour;

                  return (
                    <tr key={booking._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className={`text-sm font-medium truncate max-w-xs flex items-center gap-2 ${isDeleted ? 'text-orange-600' : 'text-slate-900'}`}>
                            {isDeleted && <AlertTriangle size={14} />}
                            {tourTitle}
                            {booking.source === 'manual' && (
                              <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">Manual</span>
                            )}
                          </div>
                          <div className="text-sm text-slate-500">{userName}</div>
                          {destinationName && <div className="text-xs text-slate-400">{destinationName}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-900">{formatDisplayDate(booking.dateString || booking.date)}</div>
                        <div className="text-sm text-slate-500">{booking.time}</div>
                        {booking.createdAt && (
                          <div className="text-xs text-slate-400 mt-1">
                            Booked: {formatBookedDate(booking.createdAt)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-slate-900">
                          <Users size={14} className="mr-1 text-slate-400" />
                          {formatGuestBreakdown(booking)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusDropdown booking={booking} onStatusChange={handleStatusChange} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm font-semibold text-slate-900">
                          <span className="mr-1 text-green-600 font-bold">{getCurrencySymbol(booking.currency)}</span>
                          {safeToFixed(booking.totalPrice)}
                          {booking.currency && booking.currency !== 'USD' && (
                            <span className="ml-1 text-xs text-slate-400 font-normal">{booking.currency}</span>
                          )}
                        </div>
                        {booking.paymentMethod && (
                          <div className="text-xs text-slate-500 capitalize">{booking.paymentMethod}</div>
                        )}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {booking.paymentReconciliationState === 'duplicate_suppressed' && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800">
                              Duplicate suppressed
                            </span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            booking.paymentDetails?.mode === 'test'
                              ? 'bg-amber-100 text-amber-900'
                              : booking.paymentDetails?.mode === 'live'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-slate-100 text-slate-600'
                          }`}>
                            {booking.paymentDetails?.mode === 'test' ? 'TEST' : booking.paymentDetails?.mode === 'live' ? 'LIVE' : 'Mode not recorded'}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            {booking.paymentDetails?.source === 'eeo-mobile' ? 'Mobile app' : booking.paymentDetails?.source === 'eeo-web' ? 'Website' : 'Source not recorded'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleRowClick(booking._id)}
                            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors">
                            <Eye size={12} /> View
                          </button>
                          {!['Refunded', 'Partial_Refund'].includes(booking.status) && (
                            <button
                              onClick={() => router.push(`/admin/bookings/${booking._id}#financial-actions`)}
                              className="px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
                            >
                              Cancel / refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalBookings > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-700">{showingFrom}-{showingTo}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalBookings}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(1)} disabled={page <= 1}
              className="h-10 w-10 rounded-full border border-slate-300 flex items-center justify-center hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="First page">
              <ChevronsLeft size={16} />
            </button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="h-10 w-10 rounded-full border border-slate-300 flex items-center justify-center hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page">
              <ChevronLeft size={16} />
            </button>
            <div className="px-3 text-sm text-slate-700">
              Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span>
            </div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="h-10 w-10 rounded-full border border-slate-300 flex items-center justify-center hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page >= totalPages}
              className="h-10 w-10 rounded-full border border-slate-300 flex items-center justify-center hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Last page">
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default withAuth(BookingsPage, { permissions: ['manageBookings'] });
