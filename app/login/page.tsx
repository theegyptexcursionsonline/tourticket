// app/login/page.tsx
import { Metadata } from 'next';
import LoginClient from './LoginClient';

// Enable static generation for fast page loads
export const dynamic = 'force-static';

// Generate metadata for SEO
export const metadata: Metadata = {
  title: 'Login | Egypt Excursions Online',
  description: 'Log in to your account to access your bookings, favorites, and exclusive travel deals.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function LoginPage() {
  return <LoginClient />;
}