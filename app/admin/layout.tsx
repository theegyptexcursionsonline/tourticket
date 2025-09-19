// app/admin/layout.tsx

import Sidebar from '@/components/admin/Sidebar';
import Header from '@/components/admin/Header';
import { AuthProvider } from '@/contexts/AuthContext';
import { SettingsProvider } from '@/contexts/SettingsContext'; // Import SettingsProvider

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthProvider>
            <SettingsProvider> {/* Add the SettingsProvider wrapper here */}
                <div className="flex h-screen bg-gray-100">
                    <Sidebar />
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <Header />
                        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 sm:p-6 md:p-8">
                            {children}
                        </main>
                    </div>
                </div>
            </SettingsProvider>
        </AuthProvider>
    );
}