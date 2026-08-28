import type {Metadata} from 'next';
import {connection} from 'next/server';
import ResetPasswordClient from './ResetPasswordClient';
import {PRIVATE_ROUTE_METADATA} from '@/lib/seo/privateRouteMetadata';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  ...PRIVATE_ROUTE_METADATA,
  title: 'Reset Password | Egypt Excursions Online',
  description: 'Securely choose a new password for your Egypt Excursions Online account.',
};

interface ResetPasswordPageProps {
  searchParams: Promise<{
    token?: string | string[];
    email?: string | string[];
  }>;
}

const firstQueryValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || '' : value || '';

export default async function ResetPasswordPage({searchParams}: ResetPasswordPageProps) {
  await connection();
  const query = await searchParams;
  return (
    <ResetPasswordClient
      token={firstQueryValue(query.token).trim()}
      email={firstQueryValue(query.email).trim()}
    />
  );
}
