import type { Metadata } from 'next';
import SupportRequestsClient from './SupportRequestsClient';

export const metadata: Metadata = {
  title: 'Support Requests',
  description: 'Customer requests registered by the support assistant and approved by the support desk.',
};

export default function AdminSupportRequestsPage() {
  return <SupportRequestsClient />;
}
