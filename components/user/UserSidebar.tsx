// components/user/UserSidebar.tsx

"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const UserSidebar = () => {
  const pathname = usePathname();

  const navItems = [
    { href: '/user/dashboard', label: 'Dashboard' },
    { href: '/user/bookings', label: 'My Bookings' },
    { href: '/user/profile', label: 'My Profile' },
    { href: '/user/favorites', label: 'My Favorites' },
  ];

  return (
    <aside className="w-1/4">
      <nav className="bg-white p-4 rounded-lg shadow-md">
        <ul>
          {navItems.map(({ href, label }) => (
            <li key={href} className="mb-2">
              <Link href={href}>
                <span className={`block p-2 rounded-md hover:bg-gray-100 ${pathname === href ? 'font-bold bg-gray-200' : ''}`}>
                  {label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default UserSidebar;