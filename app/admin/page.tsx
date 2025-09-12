// app/admin/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import withAuth from '@/components/admin/withAuth';
import Link from 'next/link';
import { Plus, List, PenSquare, BarChart2, DollarSign, BookOpen, Clock, Users } from 'lucide-react';

interface DashboardStats {
  totalBookings: number;
  totalRevenue: number;
  totalTours: number;
  totalUsers: number;
  recentBookingsCount: number;
  recentActivities: { id: string; text: string }[];
  salesTrendData?: { month: string; revenue: number }[];
}

const DashboardSkeleton = () => (
  <div className="p-6 animate-pulse">
    <div className="flex justify-between items-center mb-6">
      <div className="h-9 w-1/3 bg-gray-200 rounded"></div>
      <div className="h-10 w-36 bg-gray-200 rounded-md"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-lg shadow-md h-32">
          <div className="h-6 w-1/2 bg-gray-200 rounded mb-4"></div>
          <div className="h-9 w-1/4 bg-gray-300 rounded"></div>
        </div>
      ))}
    </div>
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md h-96"></div>
      <div className="bg-white p-6 rounded-lg shadow-md h-96"></div>
    </div>
  </div>
);

const StatCard = ({ title, value, icon: Icon }: { title: string, value: string | number, icon: React.ElementType }) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex items-start justify-between">
        <div>
            <h2 className="text-lg font-semibold text-gray-600">{title}</h2>
            <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
        </div>
        <div className="bg-red-100 p-3 rounded-full">
            <Icon className="h-6 w-6 text-red-600" />
        </div>
    </div>
);


const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('admin-auth-token');
        const response = await fetch('/api/admin/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch data');
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
                <p className="text-slate-500 mt-1">Welcome back, Admin! Here's your business overview.</p>
            </div>
            <Link href="/admin/tours/new" className="mt-4 sm:mt-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors shadow-sm">
                <Plus className="h-5 w-5" />
                Create New Tour
            </Link>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Bookings" value={stats.totalBookings.toLocaleString()} icon={BookOpen} />
        <StatCard title="Total Revenue" value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(stats.totalRevenue)} icon={DollarSign} />
        <StatCard title="Total Tours" value={stats.totalTours.toLocaleString()} icon={List} />
        <StatCard title="Total Users" value={stats.totalUsers.toLocaleString()} icon={Users} />
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/admin/bookings" className="flex items-center gap-4 bg-white p-6 rounded-lg shadow-md hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className="bg-blue-100 p-3 rounded-full"><BookOpen className="h-6 w-6 text-blue-600" /></div>
                <div>
                    <h3 className="font-bold text-slate-800">Manage Bookings</h3>
                    <p className="text-sm text-slate-500">View and manage all tour bookings.</p>
                </div>
            </Link>
            <Link href="/admin/tours" className="flex items-center gap-4 bg-white p-6 rounded-lg shadow-md hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className="bg-green-100 p-3 rounded-full"><List className="h-6 w-6 text-green-600" /></div>
                <div>
                    <h3 className="font-bold text-slate-800">Manage Tours</h3>
                    <p className="text-sm text-slate-500">View, edit, or delete existing tours.</p>
                </div>
            </Link>
            <div className="flex items-center gap-4 bg-white p-6 rounded-lg shadow-md relative overflow-hidden cursor-not-allowed">
                <div className="absolute top-0 right-0 bg-amber-400 text-white text-xs font-bold px-2 py-0.5 rounded-bl-lg">SOON</div>
                <div className="bg-gray-100 p-3 rounded-full"><PenSquare className="h-6 w-6 text-gray-500" /></div>
                <div>
                    <h3 className="font-bold text-gray-400">Manage Blog</h3>
                    <p className="text-sm text-gray-400">Feature coming soon.</p>
                </div>
            </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">Sales Trends</h2>
            <div className="h-80 flex items-center justify-center text-gray-400 bg-slate-50/50 rounded-md">
                <BarChart2 className="h-10 w-10 mb-2"/> Chart coming soon.
            </div>
        </div>
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">Recent Activities</h2>
          <ul className="space-y-2">
            {stats.recentActivities.length > 0 ? (
              stats.recentActivities.map((activity) => (
                <li key={activity.id} className="border-b py-3 text-sm text-slate-600 last:border-0 flex items-start gap-3">
                  <div className="bg-slate-100 p-2 rounded-full mt-1">
                    <BookOpen className="h-4 w-4 text-slate-500"/>
                  </div>
                  <span>{activity.text}</span>
                </li>
              ))
            ) : (<p className="text-slate-500">No recent activities.</p>)}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default withAuth(AdminDashboard);