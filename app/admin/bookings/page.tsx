// app/admin/bookings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import withAuth from '@/components/admin/withAuth';
import { useRouter } from 'next/navigation';
import { Search, Calendar, Users, DollarSign, Filter, RefreshCw, Eye, Download } from 'lucide-react';

// Define interfaces matching your enhanced booking model
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
    name: string;
  };
}

interface Booking {
  _id: string;
  tour: BookingTour;
  user: BookingUser;
  date: string;
  time: string;
  guests: number;
  totalPrice: number;
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  // Enhanced fields from your model
  adultGuests?: number;
  childGuests?: number;
  infantGuests?: number;
  paymentMethod?: string;
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
}

const BookingsPage = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  
  const router = useRouter();

  // Fetch bookings from API
  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/bookings');
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      const data = await response.json();
      setBookings(data);
      setFilteredBookings(data);
    } catch (err) {
      setError((err as Error).message);
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Filter bookings based on search and filters
  useEffect(() => {
    let filtered = bookings;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(booking => 
        booking.tour.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking._id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const bookingDate = new Date(filtered[0]?.createdAt || now);
      
      switch (dateFilter) {
        case 'today':
          filtered = filtered.filter(booking => {
            const createdDate = new Date(booking.createdAt);
            return createdDate.toDateString() === now.toDateString();
          });
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(booking => 
            new Date(booking.createdAt) >= weekAgo
          );
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          filtered = filtered.filter(booking => 
            new Date(booking.createdAt) >= monthAgo
          );
          break;
      }
    }

    setFilteredBookings(filtered);
  }, [bookings, searchTerm, statusFilter, dateFilter]);

  const handleRowClick = (id: string) => {
    router.push(`/admin/bookings/${id}`);
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
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

  const formatGuestBreakdown = (booking: Booking) => {
    const parts = [];
    if (booking.adultGuests) parts.push(`${booking.adultGuests}A`);
    if (booking.childGuests) parts.push(`${booking.childGuests}C`);
    if (booking.infantGuests) parts.push(`${booking.infantGuests}I`);
    
    if (parts.length > 0) {
      return `${booking.guests} (${parts.join(', ')})`;
    }
    return booking.guests.toString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-9 w-1/4 bg-gray-200 rounded animate-pulse mb-6"></div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold">Error loading bookings</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button 
            onClick={fetchBookings}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
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
            {filteredBookings.length} of {bookings.length} bookings
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <button
            onClick={fetchBookings}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search bookings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Status</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(searchTerm || statusFilter !== 'all' || dateFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDateFilter('all');
              }}
              className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No bookings found</h3>
            <p className="text-slate-500">
              {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No bookings have been made yet'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tour & Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Guests
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredBookings.map((booking) => (
                  <tr
                    key={booking._id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(booking._id)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-slate-900 truncate max-w-xs">
                          {booking.tour.title}
                        </div>
                        <div className="text-sm text-slate-500">
                          {formatUserName(booking.user)}
                        </div>
                        {booking.tour.destination && (
                          <div className="text-xs text-slate-400">
                            {booking.tour.destination.name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-900">
                        {new Date(booking.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-sm text-slate-500">{booking.time}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-slate-900">
                        <Users size={14} className="mr-1 text-slate-400" />
                        {formatGuestBreakdown(booking)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={getStatusBadge(booking.status)}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm font-semibold text-slate-900">
                        <DollarSign size={14} className="mr-1 text-green-600" />
                        {booking.totalPrice.toFixed(2)}
                      </div>
                      {booking.paymentMethod && (
                        <div className="text-xs text-slate-500 capitalize">
                          {booking.paymentMethod}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(booking._id);
                        }}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        <Eye size={12} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {bookings.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Bookings</p>
                <p className="text-2xl font-bold text-slate-900">{bookings.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">
                  {bookings.filter(b => b.status === 'Confirmed').length}
                </p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Revenue</p>
                <p className="text-2xl font-bold text-slate-900">
                  ${bookings.reduce((sum, b) => sum + b.totalPrice, 0).toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Guests</p>
                <p className="text-2xl font-bold text-slate-900">
                  {bookings.reduce((sum, b) => sum + b.guests, 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default withAuth(BookingsPage);