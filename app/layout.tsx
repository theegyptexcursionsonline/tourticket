import type { Metadata } from "next";
import { Inter, Almarai } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/contexts/SettingsContext";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const almarai = Almarai({
  subsets: ["arabic"],
  weight: ['400', '700', '800'],
  variable: '--font-almarai'
});

export const metadata: Metadata = {
  title: "Egypt Excursions Online - Unforgettable Tours & Experiences",
  description: "Discover and book unforgettable activities, tours, and experiences across Egypt. From the pyramids of Giza to the temples of Luxor, your adventure starts here.",
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
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}

