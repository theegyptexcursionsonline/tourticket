// app/admin/layout.tsx
'use client'; // Required because withAuth is a client-side HOC

import React from 'react';
import AdminSidebar from '@/components/admin/Sidebar';
import AdminHeader from '@/components/admin/Header';
import withAuth from '@/components/admin/withAuth'; // Import the HOC

function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100">
          <div className="container mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// Wrap the layout component with the withAuth HOC before exporting
export default withAuth(AdminLayout);