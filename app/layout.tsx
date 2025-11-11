// app/layout.tsx
import type { Metadata } from "next";
import { Inter, Almarai } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import CartSidebar from "@/components/CartSidebar";
import WishlistSidebar from "@/components/WishlistSidebar";
import { Toaster } from 'react-hot-toast';
import IntercomClient from "@/components/IntercomClient";
import AISearchWidget from "@/components/AISearchWidget";
import AIAgentWidget from "@/components/AIAgentWidget";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const almarai = Almarai({
  subsets: ["arabic"],
  weight: ['400', '700', '800'],
  variable: '--font-almarai'
});

export const metadata: Metadata = {
  title: "Egypt Excursions Online - Unforgettable Experiences",
  description:
    "Discover and book unforgettable activities, tours, and experiences across the globe. Your adventure starts here.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head />
      <body className={`${inter.variable} ${almarai.variable} font-sans`}>
        <IntercomClient />
        <AuthProvider>
          <SettingsProvider>
            <CartProvider>
              <WishlistProvider>
                {children}
                <CartSidebar />
                <WishlistSidebar />
                <AISearchWidget />
                <AIAgentWidget />
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
                      iconTheme: {
                        primary: '#22c55e',
                        secondary: '#f0fdf4',
                      },
                    },
                    error: {
                      duration: 6000,
                      style: {
                        background: '#fef2f2',
                        color: '#b91c1c',
                        border: '1px solid #fecaca',
                        whiteSpace: 'pre-line',
                      },
                      iconTheme: {
                        primary: '#ef4444',
                        secondary: '#fef2f2',
                      },
                    },
                    loading: {
                      style: {
                        background: '#f8fafc',
                        color: '#475569',
                        border: '1px solid #e2e8f0',
                      },
                    },
                  }}
                />
              </WishlistProvider>
            </CartProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
