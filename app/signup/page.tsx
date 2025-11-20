import { Metadata } from 'next';
import SignupClient from './SignupClient';

// Enable static generation for fast page loads
export const dynamic = 'force-static';

// Generate metadata for SEO
export const metadata: Metadata = {
  title: 'Sign Up | Egypt Excursions Online',
  description: 'Create your account to start booking amazing tours and experiences in Egypt. Get exclusive deals and manage your bookings.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function SignupPage() {
  return <SignupClient />;
}