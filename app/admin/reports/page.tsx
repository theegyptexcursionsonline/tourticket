// app/admin/reports/page.tsx
'use client';

import { useState, useEffect } from 'react';
import withAuth from '@/components/admin/withAuth';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DollarSign, BookOpen, Percent, TrendingUp, Crown } from 'lucide-react';
import toast from 'react-hot-toast';

// --- Type Definitions for Report Data ---
interface KpiData {
  totalRevenue: number;
  totalBookings: number;
  averageBookingValue: number;
}
interface MonthlyRevenue {
  name: string;
  revenue: number;
}
interface TopTour {
  tourId: string;
  title: string;
  totalBookings: number;
  totalRevenue: number;
}
interface ReportData {
  kpis: KpiData;
  monthlyRevenue: MonthlyRevenue[];
  topTours: TopTour[];
}

// --- Reusable Component for KPI Cards ---
const KpiCard = ({ title, value, icon: Icon, format = "number" }: { title: string, value: number, icon: React.ElementType, format?: "number" | "currency" }) => {
    const formattedValue = format === 'currency'
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
        : new Intl.NumberFormat('en-US').format(value);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md flex items-start justify-between">
            <div>
                <h3 className="text-md font-semibold text-gray-600">{title}</h3>
                <p className="text-3xl font-bold text-slate-800 mt-2">{formattedValue}</p>
            </div>
            <div className="bg-sky-100 p-3 rounded-full">
                <Icon className="h-6 w-6 text-sky-600" />
            </div>
        </div>
    );
};


const ReportsPage = () => {
  const { token } = useAdminAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = (contentType = true): HeadersInit => {
    const headers: HeadersInit = {};
    if (contentType) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  useEffect(() => {
    const fetchReportData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/reports', {
          headers: getAuthHeaders(),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch report data');
        }
        const data = await response.json();
        setReportData(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReportData();
  }, []);

  if (isLoading) {
    return <div className="p-6">Loading reports...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }
  if (!reportData) {
    return <div className="p-6">No report data available.</div>;
  }

  const { kpis, monthlyRevenue, topTours } = reportData;

  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <TrendingUp className="h-8 w-8 mr-3 text-slate-600" />
        <h1 className="text-3xl font-bold text-slate-800">Reports & Analytics</h1>
      </div>

      {/* --- Key Performance Indicators --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KpiCard title="Total Revenue" value={kpis.totalRevenue} icon={DollarSign} format="currency" />
        <KpiCard title="Total Bookings" value={kpis.totalBookings} icon={BookOpen} />
        <KpiCard title="Avg. Booking Value" value={kpis.averageBookingValue} icon={Percent} format="currency" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- Monthly Revenue Chart --- */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Monthly Revenue (Last 6 Months)</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={monthlyRevenue} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                    formatter={(value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}
                    cursor={{fill: 'rgba(241, 245, 249, 0.6)'}} // slate-100 with opacity
                />
                <Legend />
                <Bar dataKey="revenue" fill="#0284c7" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* --- Top Selling Tours --- */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
            <Crown className="h-6 w-6 mr-2 text-amber-500"/> Top 5 Tours
          </h2>
          {topTours.length > 0 ? (
            <ul className="space-y-4">
              {topTours.map((tour, index) => (
                <li key={tour.tourId} className="border-b pb-3 last:border-b-0">
                  <p className="font-semibold text-slate-800 truncate">{index + 1}. {tour.title}</p>
                  <div className="flex justify-between text-sm text-slate-500 mt-1">
                    <span>{tour.totalBookings} bookings</span>
                    <span className="font-bold text-green-600">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tour.totalRevenue)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 text-center mt-10">No booking data available to rank tours.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default withAuth(ReportsPage, { permissions: ['manageReports'] });