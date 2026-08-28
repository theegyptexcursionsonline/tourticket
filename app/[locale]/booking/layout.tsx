import type { Metadata } from 'next';
import { PRIVATE_ROUTE_METADATA } from '@/lib/seo/privateRouteMetadata';

export const metadata: Metadata = PRIVATE_ROUTE_METADATA;

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
