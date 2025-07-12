import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

// Setup the primary font for the project to match the component designs
const poppins = Poppins({
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700']
});

// Updated metadata for M.K. Industries for better SEO
export const metadata: Metadata = {
  title: "M.K. Industries | Transformer Tank & Heavy Steel Fabrication",
  description: "M.K. Industries is an ISO 9001:2015 certified company specializing in the fabrication of transformer tanks, core frames, and heavy steel structures. Located in Bhopal, India.",
  keywords: ["transformer tanks", "heavy fabrication", "steel structures", "M.K. Industries", "Bhopal", "ISO 9001:2015"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* The className now only contains the Poppins font variable */}
      <body
        className={`${poppins.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}