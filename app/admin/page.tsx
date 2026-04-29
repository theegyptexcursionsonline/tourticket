import type { Metadata } from 'next';
import AdminDashboardClient from './AdminDashboardClient';

export const metadata: Metadata = {
  title: {
    absolute: 'Dashboard | Admin Panel',
  },
  description: 'Main Egypt Excursions Online admin dashboard overview.',
};

export default function AdminDashboardPage() {
  return <AdminDashboardClient />;
}
