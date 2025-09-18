import type { Metadata } from "next";
import { Inter, Almarai } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import CartSidebar from "@/components/CartSidebar";
import WishlistSidebar from "@/components/WishlistSidebar"; // <-- 1. Import the new sidebar
import { Toaster } from "react-hot-toast";

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
        <AuthProvider>
          <SettingsProvider>
            <CartProvider>
              <WishlistProvider>
                <Toaster position="bottom-center" toastOptions={{
                  className: 'react-hot-toast',
                  style: {
                      borderRadius: '9999px',
                      background: '#ffffff',
                      color: '#1f2937',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                      border: '1px solid #e5e7eb',
                      padding: '8px 12px',
                  },
                }}/>
                {children}
                <CartSidebar />
                <WishlistSidebar /> {/* <-- 2. Add the component here */}
              </WishlistProvider>
            </CartProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

