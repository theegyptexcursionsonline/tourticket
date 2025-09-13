// components/user/UserSidebar.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, User, Heart, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const UserSidebar = () => {
  const pathname = usePathname();
  const { logout } = useAuth();

  const navItems = [
    { href: '/user/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/user/bookings', label: 'My Bookings', icon: Calendar },
    { href: '/user/profile', label: 'My Profile', icon: User },
    { href: '/user/favorites', label: 'My Favorites', icon: Heart },
  ];

  return (
    <aside className="w-full lg:w-64 flex-shrink-0">
      {/* Mobile view: Horizontal scroll */}
      <div className="lg:hidden mb-6">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {navItems.map(({ href, label }) => (
            <Link href={href} key={href}>
              <span className={`block whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium ${
                  pathname === href 
                  ? 'bg-red-600 text-white shadow' 
                  : 'bg-white text-slate-700 hover:bg-slate-100 border'
              }`}>
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop view: Vertical list */}
      <nav className="hidden lg:block bg-white p-4 rounded-lg shadow-md">
        <ul>
          {navItems.map(({ href, label, icon: Icon }) => (
            <li key={href} className="mb-1">
              <Link href={href}>
                <span className={`flex items-center gap-3 p-3 rounded-md transition-colors ${
                    pathname === href 
                    ? 'font-bold bg-red-50 text-red-600' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}>
                  <Icon size={20} />
                  <span>{label}</span>
                </span>
              </Link>
            </li>
          ))}
           <li className="mt-4 border-t pt-2">
              <button 
                onClick={() => logout()}
                className="flex items-center gap-3 w-full p-3 rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <LogOut size={20} />
                <span>Sign Out</span>
              </button>
            </li>
        </ul>
      </nav>
    </aside>
  );
};

export default UserSidebar;