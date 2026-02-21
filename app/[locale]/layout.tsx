import type { Metadata } from "next";
import { Inter, Almarai } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { isRTL } from '@/i18n/config';
import { SettingsProvider } from "@/contexts/SettingsContext";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { NavDataProvider } from "@/contexts/NavDataContext";
import CartSidebar from "@/components/CartSidebar";
import WishlistSidebar from "@/components/WishlistSidebar";
import { Toaster } from 'react-hot-toast';
import IntercomClient from "@/components/IntercomClient";
import ConditionalAIWidgets from "@/components/ConditionalAIWidgets";
import dbConnect from "@/lib/dbConnect";
import Destination from "@/lib/models/Destination";
import Category from "@/lib/models/Category";

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

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

async function getNavData() {
  try {
    await dbConnect();
    const [destinations, categories] = await Promise.all([
      Destination.find({ isPublished: true, featured: true })
        .select('_id name slug image description country featured tourCount')
        .sort({ tourCount: -1, name: 1 })
        .lean(),
      Category.find({ isPublished: true, featured: true })
        .select('_id name slug icon description')
        .sort({ order: 1, name: 1 })
        .lean(),
    ]);
    return {
      destinations: JSON.parse(JSON.stringify(destinations)),
      categories: JSON.parse(JSON.stringify(categories)),
    };
  } catch (error) {
    console.error('Failed to fetch nav data in layout:', error);
    return { destinations: [], categories: [] };
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // Enable static rendering for this locale (required for ISR/revalidate)
  setRequestLocale(locale);

  const messages = await getMessages();
  const { destinations, categories } = await getNavData();
  const dir = isRTL(locale) ? 'rtl' : 'ltr';
  const fontClass = isRTL(locale) ? 'font-arabic' : 'font-sans';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        {/* Google Tag Manager */}
        <script dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-W9WCZFKM');` }} />
      </head>
      <body className={`${inter.variable} ${almarai.variable} ${fontClass}`} suppressHydrationWarning>
        {/* Google Tag Manager (noscript) */}
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-W9WCZFKM" height="0" width="0" style={{display:'none',visibility:'hidden'}}></iframe></noscript>
        <IntercomClient />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <SettingsProvider initialLocale={locale}>
              <CartProvider>
                <WishlistProvider>
                  <NavDataProvider destinations={destinations} categories={categories}>
                    {children}
                    <CartSidebar />
                    <WishlistSidebar />
                    <ConditionalAIWidgets />
                    <Toaster
                      position={dir === 'rtl' ? 'top-left' : 'top-right'}
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
                  </NavDataProvider>
                </WishlistProvider>
              </CartProvider>
            </SettingsProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
