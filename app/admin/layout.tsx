'use client'; // Required for components that use hooks or client-side logic

import { Inter } from 'next/font/google';
import Sidebar from '@/components/admin/Sidebar';
import Header from '@/components/admin/Header';
import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import withAuth from '@/components/admin/withAuth'; // 1. Import withAuth HOC
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// 2. Create a component for the protected content
const ProtectedAdminContent = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
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

// 4. The main layout provides html/body (root layout is passthrough) + contexts
export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" dir="ltr">
            <body className={`${inter.variable} font-sans`}>
                <AuthProvider>
                    <SettingsProvider>
                        <AdminAuthProvider>
                            <AuthenticatedAdminLayout>
                                {children}
                            </AuthenticatedAdminLayout>
                        </AdminAuthProvider>
                    </SettingsProvider>
                </AuthProvider>
            </body>
        </html>
    );
}