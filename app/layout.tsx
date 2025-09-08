// app/layout.tsx
import type { Metadata } from "next";
import { Inter, Almarai } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import CartSidebar from "@/components/CartSidebar";
import InitialLoader from "@/components/InitialLoader";
import Chatbot from "@/components/Chatbot";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const almarai = Almarai({
  subsets: ["arabic"],
  weight: ['400', '700', '800'],
  variable: '--font-almarai'
});

export const metadata: Metadata = {
  title: "Egypt Excursions Online - Unforgettable Experiences",
  description: "Discover and book unforgettable activities, tours, and experiences across the globe. Your adventure starts here.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Inline critical CSS so loader paints immediately and blocks underlying content */}
        <style
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
/* Critical loader styles - immediate paint */
#initial-loader {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff; /* opaque */
  pointer-events: auto; /* block clicks while loader present */
}
#initial-loader .wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  transform-origin: center;
}
/* Badge (rounded) */
#initial-loader .badge {
  width: 124px;
  height: 124px;
  border-radius: 9999px; /* circle */
  background: #0ea5e9; /* blue-400 like Tailwind */
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 12px;
  color: white;
  font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  font-weight: 800;
  font-size: 13px;
  line-height: 1.05;
  box-shadow: 0 14px 40px rgba(2,6,23,0.08);
  animation: pop-in 520ms cubic-bezier(.2,.9,.26,1) both;
  will-change: transform, opacity;
  position: relative;
  overflow: hidden;
}
/* inner text block small */
#initial-loader .badge .title {
  padding: 6px;
  transform-origin: center;
}
/* continuous subtle zoom (in/out) to indicate loading */
#initial-loader .badge.loading {
  animation: pop-in 520ms cubic-bezier(.2,.9,.26,1) both, pulse-scale 1600ms cubic-bezier(.2,.9,.26,1) 600ms infinite;
}
@keyframes pulse-scale {
  0% { transform: scale(1); }
  50% { transform: scale(1.06); }
  100% { transform: scale(1); }
}
@keyframes pop-in {
  0% { transform: scale(.84) translateY(8px); opacity: 0; }
  60% { transform: scale(1.06) translateY(-3px); opacity: 1; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}
#initial-loader .label {
  margin-top: 10px;
  font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  font-size: 13px;
  color: #334155;
  opacity: 0.96;
  text-align: center;
}

/* reduce motion */
@media (prefers-reduced-motion: reduce) {
  #initial-loader .badge.loading { animation: none; }
}
            `,
          }}
        />
      </head>

      <body className={`${inter.variable} ${almarai.variable} font-sans`}>
        {/* Server-rendered immediate loader (inline text badge, no network image) */}
        <div id="initial-loader" role="status" aria-live="polite" aria-label="Loading">
          <div className="wrap" style={{ textAlign: 'center' }}>
            <div className="badge loading" aria-hidden="true">
              <div className="title">Egypt Excursions<br/>Online</div>
            </div>
            <div className="label">Preparing your adventure…</div>
          </div>
        </div>

        {/* Client-side cleaner that removes the server loader on hydration */}
        <InitialLoader />

        <AuthProvider>
          <SettingsProvider>
            <CartProvider>
              {children}
              <CartSidebar />
              <Chatbot />
            </CartProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
