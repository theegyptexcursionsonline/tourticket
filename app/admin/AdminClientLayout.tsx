'use client'; // Required for components that use hooks or client-side logic

import Sidebar from '@/components/admin/Sidebar';
import Header from '@/components/admin/Header';
import { SettingsProvider } from '@/contexts/SettingsContext';
import withAuth from '@/components/admin/withAuth'; // 1. Import withAuth HOC
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';
import { Toaster } from 'react-hot-toast';

// 2. Create a component for the protected content
const ProtectedAdminContent = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

// 3. Wrap the content component with the withAuth HOC
const AuthenticatedAdminLayout = withAuth(ProtectedAdminContent);

// 4. The main client layout provides contexts and authenticated admin shell.
export default function AdminClientLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SettingsProvider>
            <AdminAuthProvider>
                <AuthenticatedAdminLayout>
                    {children}
                </AuthenticatedAdminLayout>
                <Toaster
                  position="top-right"
                  reverseOrder={false}
                  gutter={8}
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#fff',
                      color: '#333',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      maxWidth: '500px',
                    },
                    success: {
                      duration: 4000,
                      style: {
                        background: '#f0fdf4',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                      },
                    },
                    error: {
                      duration: 6000,
                      style: {
                        background: '#fef2f2',
                        color: '#b91c1c',
                        border: '1px solid #fecaca',
                      },
                    },
                  }}
                />
            </AdminAuthProvider>
        </SettingsProvider>
    );
}
