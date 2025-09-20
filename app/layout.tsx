import type { Metadata } from "next";
import { Inter, Almarai } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import CartSidebar from "@/components/CartSidebar";
import WishlistSidebar from "@/components/WishlistSidebar"; 

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
                {/* Removed Toaster */}
                {children}
                <CartSidebar />
                <WishlistSidebar />
              </WishlistProvider>
            </CartProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
