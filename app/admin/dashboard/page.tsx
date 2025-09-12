// app/admin/dashboard/page.tsx

import React from 'react';

const AdminDashboard = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Key Metrics */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total Bookings</h2>
          <p className="text-3xl font-bold">1,234</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Revenue</h2>
          <p className="text-3xl font-bold">$56,789</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Top Tour</h2>
          <p className="text-3xl font-bold">Paris City Tour</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">New Inquiries</h2>
          <p className="text-3xl font-bold">12</p>
        </div>
      </div>
      <div className="mt-8">
        {/* Visual Data */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Sales Trends</h2>
          {/* Placeholder for a chart component */}
          <div className="h-64 bg-gray-200 rounded-md flex items-center justify-center">
            <p className="text-gray-500">Chart will be displayed here</p>
          </div>
        </div>
      </div>
      <div className="mt-8">
        {/* Recent Activities */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Recent Activities</h2>
          <ul>
            <li className="border-b py-2">New booking for "Grand Canyon Adventure"</li>
            <li className="border-b py-2">User "John Doe" registered</li>
            <li className="py-2">Review submitted for "New York City Lights"</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;