import type { Metadata } from "next";
import { Inter, Almarai } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { CartProvider } from "@/contexts/CartContext";
import CartSidebar from "@/components/CartSidebar";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const almarai = Almarai({
  subsets: ["arabic"],
  weight: ['400', '700', '800'],
  variable: '--font-almarai'
});

export const metadata: Metadata = {
  title: "Tours & Tickets - Unforgettable Experiences",
  description: "Discover and book unforgettable activities, tours, and experiences across the globe. Your adventure starts here.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${almarai.variable} font-sans`}>
        <SettingsProvider>
          <CartProvider>
            {children}
            <CartSidebar />
          </CartProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}

