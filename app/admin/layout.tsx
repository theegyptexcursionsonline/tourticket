// app/admin/layout.tsx
'use client'; // Add this line to use the Toaster component

import Link from 'next/link';
import { Home, Compass, Tag, MapPin } from 'lucide-react';
import { Toaster } from 'react-hot-toast'; // Import Toaster

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      {/* Add the Toaster component here */}
      <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />

      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-10">Admin Panel</h1>
        <nav className="space-y-2">
          {/* ... (Links are the same as before) ... */}
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-700 font-medium hover:bg-slate-100 transition-colors"><Home size={20} /> Dashboard</Link>
          <Link href="/admin/tours" className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-700 font-medium hover:bg-slate-100 transition-colors"><Compass size={20} /> Tours</Link>
          <Link href="/admin/categories" className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-700 font-medium hover:bg-slate-100 transition-colors"><Tag size={20} /> Categories</Link>
          <Link href="/admin/destinations" className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-700 font-medium hover:bg-slate-100 transition-colors"><MapPin size={20} /> Destinations</Link>
        </nav>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}