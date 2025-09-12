// components/admin/Header.tsx

"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const AdminHeader = () => {
  const pathname = usePathname();
  const pathSegments = pathname.split('/').filter(i => i);

  return (
    <header className="bg-white shadow-md p-4 flex justify-between items-center">
      <div>
        <nav className="text-sm text-gray-500">
          <Link href="/admin/dashboard">
            <span className="hover:text-gray-700">Admin</span>
          </Link>
          {pathSegments.map((segment, index) => {
            const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
            const isLast = index === pathSegments.length - 1;
            return (
              <React.Fragment key={href}>
                <span className="mx-2">/</span>
                {isLast ? (
                  <span className="capitalize text-gray-700">{segment}</span>
                ) : (
                  <Link href={href}>
                    <span className="capitalize hover:text-gray-700">{segment}</span>
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>
      <div>
        {/* Placeholder for user menu or notifications */}
        <div className="text-gray-700">Admin User</div>
      </div>
    </header>
  );
};

export default AdminHeader;