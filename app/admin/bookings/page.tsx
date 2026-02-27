// app/admin/bookings/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import withAuth from '@/components/admin/withAuth';
import { useRouter } from 'next/navigation';
import { Search, Calendar, Users, DollarSign, RefreshCw, Eye, Download, AlertTriangle, Loader2, Trash2, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

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

const BookingsPage = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
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

  // Bulk selection
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    setLoading(true);
    setError(null);
    try {
      const url = buildBookingsUrl(effectiveSearch);
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const data: BookingsResponse = await response.json();
      if (!data?.success) throw new Error('Failed to fetch bookings');

      setBookings(data.data || []);
      setTotalBookings(data.meta?.total || 0);
      setTotalPages(data.meta?.totalPages || 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildBookingsUrl, token]);

  useEffect(() => { fetchTourOptions(); }, [fetchTourOptions]);

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
    setPage(1);
    setSelectedBookings(new Set());
  }, [filtersKey]);

  useEffect(() => { setSelectedBookings(new Set()); }, [page]);

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

  const StatusDropdown = ({ booking, onStatusChange }: {
    booking: Booking;
    onStatusChange: (bookingId: string, newStatus: string) => void;
  }) => {
    const [isUpdating, setIsUpdating] = useState(false);

    const handleChange = async (newStatus: string) => {
      setIsUpdating(true);
      await onStatusChange(booking._id, newStatus);
      setIsUpdating(false);
    };

    const getDropdownStyle = (status: string) => {
      switch (status) {
        case 'Confirmed': return 'bg-green-100 text-green-800';
        case 'Pending': return 'bg-yellow-100 text-yellow-800';
        case 'Cancelled': return 'bg-red-100 text-red-800';
        case 'Refunded': return 'bg-blue-100 text-blue-800';
        case 'Partial_Refund': return 'bg-purple-100 text-purple-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };

    return (
      <div className="relative">
        <select
          value={booking.status}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isUpdating}
          className={`appearance-none text-xs font-semibold px-3 py-2 pr-8 rounded-full border-0 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${getDropdownStyle(booking.status)}`}
        >
          <option value="Confirmed">Confirmed</option>
          <option value="Pending">Pending</option>
          <option value="Cancelled">Cancelled</option>
          <option value="Refunded">Refunded</option>
          <option value="Partial_Refund">Partial Refund</option>
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
      if (!response.ok) throw new Error('Failed to update booking status');

      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: newStatus } : b));
      const statusLabel = newStatus === 'Partial_Refund' ? 'Partial Refund' : newStatus;
      toast.success(`Booking status updated to ${statusLabel}`);
    } catch {
      toast.error('Failed to update booking status');
    }
  };

  const handleSelectAll = () => {
    setSelectedBookings(
      selectedBookings.size === bookings.length ? new Set() : new Set(bookings.map(b => b._id))
    );
  };

  const handleSelectBooking = (bookingId: string) => {
    const newSelected = new Set(selectedBookings);
    if (newSelected.has(bookingId)) newSelected.delete(bookingId);
    else newSelected.add(bookingId);
    setSelectedBookings(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedBookings.size === 0) return;
    setIsDeleting(true);
    try {
      const response = await fetch('/api/admin/bookings/bulk-delete', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ bookingIds: Array.from(selectedBookings) }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete bookings');
      }
      const data = await response.json();
      setBookings(prev => prev.filter(b => !selectedBookings.has(b._id)));
      setSelectedBookings(new Set());
      setShowDeleteModal(false);
      toast.success(`Successfully deleted ${data.deletedCount} booking(s)`);
    } catch (error) {
      toast.error((error as Error).message || 'Failed to delete bookings');
    } finally {
      setIsDeleting(false);
    }
  };

  const isAllSelected = bookings.length > 0 && selectedBookings.size === bookings.length;
  const isSomeSelected = selectedBookings.size > 0 && selectedBookings.size < bookings.length;
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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Bookings Management</h1>
          <p className="text-slate-600 mt-1">
            Showing <span className="font-semibold text-slate-700">{showingFrom}-{showingTo}</span> of{' '}
            <span className="font-semibold text-slate-700">{totalBookings}</span> bookings
            {selectedBookings.size > 0 && (
              <span className="ml-2 text-blue-600 font-medium">({selectedBookings.size} selected)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <button
            onClick={() => router.push('/admin/bookings/create')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
          >
            <Plus size={16} />
            Add Booking
          </button>
          {selectedBookings.size > 0 && (
            <>
              <button
                onClick={() => setSelectedBookings(new Set())}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 border border-slate-300 rounded-full hover:bg-slate-50 transition-colors"
              >
                <X size={16} /> Clear Selection
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
              >
                <Trash2 size={16} /> Delete Selected ({selectedBookings.size})
              </button>
            </>
          )}
          <button
            onClick={() => fetchBookings(searchTerm.trim())}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-full hover:bg-slate-50 transition-colors">
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
            <div className="flex items-center gap-2">
              <input type="date" value={purchaseFrom} onChange={(e) => setPurchaseFrom(e.target.value)}
                className="flex-1 h-10 px-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <span className="text-slate-400 text-sm shrink-0">to</span>
              <input type="date" value={purchaseTo} onChange={(e) => setPurchaseTo(e.target.value)}
                className="flex-1 h-10 px-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Activity date</label>
            <div className="flex items-center gap-2">
              <input type="date" value={activityFrom} onChange={(e) => setActivityFrom(e.target.value)}
                className="flex-1 h-10 px-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <span className="text-slate-400 text-sm shrink-0">to</span>
              <input type="date" value={activityTo} onChange={(e) => setActivityTo(e.target.value)}
                className="flex-1 h-10 px-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>
        </div>

        {/* Row 4: Sort, Per page, Clear */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="h-9 px-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer">
              <option value="createdAt_desc">Purchase date (newest)</option>
              <option value="createdAt_asc">Purchase date (oldest)</option>
              <option value="activityDate_desc">Activity date (newest)</option>
              <option value="activityDate_asc">Activity date (oldest)</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Per page</span>
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); setSelectedBookings(new Set()); }}
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
                  <th className="px-4 py-3 text-left">
                    <input type="checkbox" checked={isAllSelected}
                      ref={(el) => { if (el) el.indeterminate = isSomeSelected; }}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer" />
                  </th>
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
                    <tr key={booking._id} className={`hover:bg-slate-50 transition-colors ${selectedBookings.has(booking._id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-4 py-4">
                        <input type="checkbox" checked={selectedBookings.has(booking._id)}
                          onChange={() => handleSelectBooking(booking._id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer" />
                      </td>
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
                            Booked: {new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
                          {booking.totalPrice.toFixed(2)}
                          {booking.currency && booking.currency !== 'USD' && (
                            <span className="ml-1 text-xs text-slate-400 font-normal">{booking.currency}</span>
                          )}
                        </div>
                        {booking.paymentMethod && (
                          <div className="text-xs text-slate-500 capitalize">{booking.paymentMethod}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleRowClick(booking._id)}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors">
                          <Eye size={12} /> View
                        </button>
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={() => !isDeleting && setShowDeleteModal(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-center text-slate-900 mb-2">
                Delete {selectedBookings.size} Booking{selectedBookings.size !== 1 ? 's' : ''}?
              </h3>
              <p className="text-sm text-slate-600 text-center mb-6">
                This action cannot be undone. The selected booking{selectedBookings.size !== 1 ? 's' : ''} will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={handleBulkDelete} disabled={isDeleting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {isDeleting ? (<><Loader2 className="w-4 h-4 animate-spin" /> Deleting...</>) : (<><Trash2 className="w-4 h-4" /> Delete</>)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default withAuth(BookingsPage, { permissions: ['manageBookings'] });
