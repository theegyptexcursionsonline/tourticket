import type { Metadata } from "next";
// Note: The Next.js font and global CSS imports have been removed 
// to resolve a build environment issue.
// In a standard Next.js setup, you would typically have:
import { Inter } from "next/font/google"
import "./globals.css";

// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GoVenture - Your Best Travel Buddy",
  description: "Discover and book unforgettable activities, tours, and experiences around the world.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* <body className={inter.className}>{children}</body> */}
      <body>{children}</body>
    </html>
  );
}

