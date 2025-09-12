// components/admin/Header.tsx
"use client";

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut } from 'lucide-react'; // Import the LogOut icon
import toast from 'react-hot-toast';

const AdminHeader = () => {
  const pathname = usePathname();
  const router = useRouter(); // Use the useRouter hook for navigation
  const pathSegments = pathname.split('/').filter(i => i);

  // --- NEW: Logout Function ---
  const handleLogout = () => {
    // Remove the token from local storage
    localStorage.removeItem('admin-auth-token');
    
    // Show a confirmation toast
    toast.success('You have been logged out.');
    
    // Redirect to the homepage and refresh the page state
    router.push('/');
    router.refresh(); 
  };

  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center">
      {/* Breadcrumbs */}
      <div>
        <nav className="text-sm text-gray-500">
          <Link href="/admin/dashboard" className="hover:text-gray-700">
            Admin
          </Link>
          {pathSegments.map((segment, index) => {
            const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
            const isLast = index === pathSegments.length - 1;
            // Don't show a link for the current page (isLast) or for UUIDs
            const isLink = !isLast && segment !== 'edit' && !/^[0-9a-fA-F]{24}$/.test(segment);
            
            return (
              <React.Fragment key={href}>
                <span className="mx-2">/</span>
                {isLink ? (
                  <Link href={href} className="capitalize hover:text-gray-700">
                    {segment}
                  </Link>
                ) : (
                  <span className="capitalize text-gray-700">{segment}</span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* User Menu and Logout Button */}
      <div className="flex items-center gap-4">
        <div className="text-gray-700">Admin User</div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-600 hover:text-red-800 transition-colors"
          aria-label="Log out"
        >
          <LogOut size={20} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default AdminHeader;