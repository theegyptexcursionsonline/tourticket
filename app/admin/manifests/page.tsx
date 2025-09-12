// app/admin/manifests/page.tsx
'use client';

import { useState, useEffect } from 'react';
import withAuth from '@/components/admin/withAuth';
import { ListPlus, Printer, User, Mail, Users, Clock } from 'lucide-react';

// --- Type Definitions ---
interface Tour {
  _id: string;
  title: string;
}

interface ManifestBooking {
  _id: string;
  user: {
    name: string;
    email: string;
  };
  time: string;
  guests: number;
}

interface ManifestData {
  tour: {
    title: string;
  };
  date: string;
  bookings: ManifestBooking[];
}

const ManifestsPage = () => {
  const [tours, setTours] = useState<Tour[]>([]);
  const [selectedTour, setSelectedTour] = useState('');
  // Set default date to today in YYYY-MM-DD format
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [manifestData, setManifestData] = useState<ManifestData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all tours for the dropdown selector
  useEffect(() => {
    const fetchTours = async () => {
      try {
        const response = await fetch('/api/admin/tours');
        if (!response.ok) throw new Error('Failed to fetch tours');
        const data = await response.json();
        
        // FIX: Access the 'data' property which contains the array
        if (data.success && Array.isArray(data.data)) {
          setTours(data.data);
          if (data.data.length > 0) {
            setSelectedTour(data.data[0]._id); // Select the first tour by default
          }
        } else {
            throw new Error('Fetched data for tours is not in the expected format.');
        }

      } catch (err) {
        console.error("Error fetching tours:", err);
      }
    };
    fetchTours();
  }, []);

  const handleGenerateManifest = async () => {
    if (!selectedTour || !selectedDate) {
      setError('Please select a tour and a date.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setManifestData(null);

    try {
      const response = await fetch(`/api/admin/manifests?tourId=${selectedTour}&date=${selectedDate}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate manifest');
      }
      const data = await response.json();
      setManifestData(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const totalGuests = manifestData?.bookings.reduce((sum, booking) => sum + booking.guests, 0) || 0;

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <ListPlus className="h-8 w-8 mr-3 text-slate-600" />
        <h1 className="text-3xl font-bold text-slate-800">Tour Manifests</h1>
      </div>

      {/* --- Filter Section --- */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="tour-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Tour
            </label>
            <select
              id="tour-select"
              value={selectedTour}
              onChange={(e) => setSelectedTour(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
            >
              {tours.map(tour => (
                <option key={tour._id} value={tour._id}>{tour.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="date-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Date
            </label>
            <input
              type="date"
              id="date-select"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <button
            onClick={handleGenerateManifest}
            disabled={isLoading}
            className="w-full md:w-auto justify-center px-6 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 disabled:bg-red-300 transition-colors shadow-sm"
          >
            {isLoading ? 'Generating...' : 'Generate Manifest'}
          </button>
        </div>
        {error && <p className="text-red-500 mt-4">{error}</p>}
      </div>

      {/* --- Manifest Display Section --- */}
      {manifestData && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">{manifestData.tour.title}</h2>
                <p className="text-slate-600 font-semibold">
                    Passenger List for {new Date(manifestData.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
            </div>
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
          
          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-md mb-4 border">
            <div className="text-lg font-bold text-slate-800">Total Guests: <span className="text-red-600">{totalGuests}</span></div>
            <div className="text-lg font-bold text-slate-800">Total Bookings: <span className="text-red-600">{manifestData.bookings.length}</span></div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead Guest Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Guests</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Check-in</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {manifestData.bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center"><User className="h-4 w-4 mr-2 text-slate-400" />{booking.user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center"><Mail className="h-4 w-4 mr-2 text-slate-400" />{booking.user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center"><Clock className="h-4 w-4 mr-2 text-slate-400" />{booking.time}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-bold text-center">{booking.guests}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <div className="w-16 h-8 border-b-2 border-gray-300 mx-auto"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {manifestData.bookings.length === 0 && (
                <div className="text-center py-10 text-slate-500">
                    <p>No bookings found for this tour on the selected date.</p>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default withAuth(ManifestsPage);