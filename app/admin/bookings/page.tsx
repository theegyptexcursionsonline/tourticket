import type { Metadata } from 'next';
import BookingsPageClient from './BookingsPageClient';

export const metadata: Metadata = {
  title: 'Bookings Management',
  description: 'Manage bookings for Egypt Excursions Online.',
};

export default function AdminBookingsPage() {
  return <BookingsPageClient />;
}
