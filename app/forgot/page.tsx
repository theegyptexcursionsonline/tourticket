import { Metadata } from 'next';
import ForgotPasswordClient from './ForgotPasswordClient';

// Enable static generation for fast page loads
export const dynamic = 'force-static';

// Generate metadata for SEO
export const metadata: Metadata = {
  title: 'Forgot Password | Egypt Excursions Online',
  description: 'Reset your password to regain access to your account. Enter your email and we will send you a password reset link.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
