// app/admin/page.tsx

import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      <nav>
        <ul className="space-y-2">
          <li>
            <Link href="/admin/tours" className="text-blue-500 hover:underline">
              Manage Tours
            </Link>
          </li>
          <li>
            <Link href="/admin/destinations" className="text-blue-500 hover:underline">
              Manage Destinations
            </Link>
          </li>
          <li>
            <Link href="/admin/categories" className="text-blue-500 hover:underline">
              Manage Categories
            </Link>
          </li>
          <li>
            <Link href="/admin/seed" className="text-blue-500 hover:underline">
              Seed Database
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}