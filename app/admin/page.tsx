// app/admin/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import SalesChart from './SalesChart'; // Import the new chart component

interface DashboardStats {
  totalBookings: number;
  totalRevenue: number;
  topTour: string;
  recentBookingsCount: number;
  recentActivities: { id: string; text: string }[];
  salesTrendData: { month: string; revenue: number }[]; // Add the new data type
}

// Skeleton component for loading state
const DashboardSkeleton = () => (
  <div className="p-6 animate-pulse">
    <h1 className="text-3xl font-bold mb-6 h-9 w-1/3 bg-gray-200 rounded"></h1>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-lg shadow-md">
          <div className="h-6 w-1/2 bg-gray-200 rounded mb-2"></div>
          <div className="h-9 w-1/4 bg-gray-300 rounded"></div>
        </div>
      ))}
    </div>
    <div className="mt-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="h-7 w-1/4 bg-gray-200 rounded mb-4"></div>
        <div className="h-80 bg-gray-200 rounded-md"></div> {/* Adjusted height for chart */}
      </div>
    </div>
    <div className="mt-8">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="h-7 w-1/4 bg-gray-200 rounded mb-4"></div>
        <ul className="space-y-4">
          <li className="h-5 bg-gray-200 rounded"></li>
          <li className="h-5 bg-gray-200 rounded"></li>
          <li className="h-5 bg-gray-200 rounded"></li>
        </ul>
      </div>
    </div>
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/admin/dashboard');
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        } else {
          throw new Error(data.error || 'Failed to fetch dashboard data');
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }

  if (!stats) {
    return <div className="p-6">No data available.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Key Metrics */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2 text-gray-700">Total Bookings</h2>
          <p className="text-3xl font-bold">{stats.totalBookings.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2 text-gray-700">Revenue</h2>
          <p className="text-3xl font-bold">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
            }).format(stats.totalRevenue)}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2 text-gray-700">Top Tour</h2>
          <p className="text-xl font-bold truncate">{stats.topTour}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2 text-gray-700">New Bookings (24h)</h2>
          <p className="text-3xl font-bold">{stats.recentBookingsCount}</p>
        </div>
      </div>
      <div className="mt-8">
        {/* Visual Data */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Sales Trends</h2>
          {/* Replace placeholder with the new chart component */}
          {stats.salesTrendData && stats.salesTrendData.length > 0 ? (
            <SalesChart data={stats.salesTrendData} />
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500">
              Not enough data to display sales trends.
            </div>
          )}
        </div>
      </div>
      <div className="mt-8">
        {/* Recent Activities */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Recent Activities</h2>
          <ul>
            {stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((activity) => (
                <li key={activity.id} className="border-b py-2 last:border-0">
                  {activity.text}
                </li>
              ))
            ) : (
              <p>No recent activities.</p>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;