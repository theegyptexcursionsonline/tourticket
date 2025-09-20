// app/admin/users/page.tsx
'use client';

import { useState, useEffect } from 'react';
import withAuth from '@/components/admin/withAuth';
import { Users, Mail, Calendar, BookOpen, TrendingUp, UserCheck, Activity } from 'lucide-react';

// --- Type Definition for a User ---
interface User {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  bookingCount: number;
}

interface UserStats {
  totalUsers: number;
  totalBookings: number;
  activeThisMonth: number;
  averageBookingsPerUser: number;
}

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    totalBookings: 0,
    activeThisMonth: 0,
    averageBookingsPerUser: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        const data = await response.json();
        setUsers(data);
        
        // Calculate stats
        const totalUsers = data.length;
        const totalBookings = data.reduce((sum: number, user: User) => sum + user.bookingCount, 0);
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const activeThisMonth = data.filter((user: User) => {
          const userDate = new Date(user.createdAt);
          return userDate.getMonth() === currentMonth && userDate.getFullYear() === currentYear;
        }).length;
        const averageBookingsPerUser = totalUsers > 0 ? Math.round((totalBookings / totalUsers) * 10) / 10 : 0;
        
        setStats({
          totalUsers,
          totalBookings,
          activeThisMonth,
          averageBookingsPerUser
        });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="flex items-center mb-8">
          <div className="h-8 w-8 bg-slate-200 rounded mr-3" />
          <div className="h-8 w-64 bg-slate-200 rounded" />
        </div>
        
        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-lg">
              <div className="h-12 w-12 bg-slate-200 rounded-lg mb-4" />
              <div className="h-6 w-16 bg-slate-200 rounded mb-2" />
              <div className="h-4 w-24 bg-slate-200 rounded" />
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4">
                <div className="h-10 w-10 bg-slate-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                  <div className="h-3 w-48 bg-slate-200 rounded" />
                </div>
                <div className="h-4 w-20 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Error Loading Users</div>
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, title, value, subtitle, color = "slate" }: {
    icon: any;
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
  }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          {subtitle && <p className="text-slate-400 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color === 'red' ? 'bg-red-100' : 'bg-slate-100'}`}>
          <Icon className={`h-6 w-6 ${color === 'red' ? 'text-red-600' : 'text-slate-600'}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex items-center mb-8">
        <div className="p-2 bg-slate-100 rounded-lg mr-4">
          <Users className="h-8 w-8 text-slate-600" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800">User Management</h1>
          <p className="text-slate-500 mt-1">Manage and monitor your platform users</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Users}
          title="Total Users"
          value={stats.totalUsers}
          subtitle="Registered accounts"
        />
        <StatCard
          icon={BookOpen}
          title="Total Bookings"
          value={stats.totalBookings}
          subtitle="All-time bookings"
          color="red"
        />
        <StatCard
          icon={TrendingUp}
          title="New This Month"
          value={stats.activeThisMonth}
          subtitle="Monthly growth"
        />
        <StatCard
          icon={Activity}
          title="Avg. Bookings/User"
          value={stats.averageBookingsPerUser}
          subtitle="Per user metric"
        />
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">All Users</h2>
          <p className="text-slate-500 text-sm">Complete list of registered users</p>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-600 mb-2">No Users Yet</h3>
            <p className="text-slate-400">No users have registered on your platform yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Header */}
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <div className="col-span-4">User</div>
                  <div className="col-span-4">Contact</div>
                  <div className="col-span-2">Joined</div>
                  <div className="col-span-2 text-center">Bookings</div>
                </div>
              </div>

              {/* User Rows */}
              <div className="divide-y divide-slate-200">
                {users.map((user) => (
                  <div
                    key={user._id}
                    className="px-6 py-4 hover:bg-slate-50 transition-colors duration-200 group"
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* User Info */}
                      <div className="col-span-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-3">
{user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 group-hover:text-red-600 transition-colors">
                              {user.name}
                            </div>
                            <div className="text-xs text-slate-500">ID: {user._id.slice(-6)}</div>
                          </div>
                        </div>
                      </div>

                      {/* Contact */}
                      <div className="col-span-4">
                        <div className="flex items-center text-slate-600">
                          <Mail className="h-4 w-4 mr-2 text-slate-400" />
                          <span className="text-sm">{user.email}</span>
                        </div>
                      </div>

                      {/* Join Date */}
                      <div className="col-span-2">
                        <div className="flex items-center text-slate-600">
                          <Calendar className="h-4 w-4 mr-2 text-slate-400" />
                          <span className="text-sm">
                            {new Date(user.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Bookings */}
                      <div className="col-span-2 text-center">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 group-hover:bg-red-100 transition-colors">
                          <BookOpen className="h-4 w-4 mr-1 text-slate-500 group-hover:text-red-600 transition-colors" />
                          <span className="text-sm font-semibold text-slate-700 group-hover:text-red-700 transition-colors">
                            {user.bookingCount}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default withAuth(UsersPage);