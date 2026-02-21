import React from 'react';
import { Metadata } from 'next';
import Header2 from '@/components/Header2';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Gift Card Widget Showcase | Egypt Excursions Online',
  description: 'Preview the gift card purchasing widget. Let customers buy gift cards for any tour — perfect for holidays, birthdays, and special occasions.',
};

export default function GiftCardWidgetShowcase() {
  const orgId = process.env.NEXT_PUBLIC_FOXES_ORG_ID || '697f988b5a33570cdc5f2e9c';
  const apiUrl = process.env.NEXT_PUBLIC_FOXES_API_URL || 'http://localhost:3001';

  return (
    <>
      <Header2 />
      <main className="min-h-screen bg-gradient-to-b from-amber-50 to-white pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 px-4">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 to-yellow-500/10" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-yellow-400/20 rounded-full blur-3xl" />

          <div className="max-w-7xl mx-auto relative">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 border border-amber-200 rounded-full text-amber-700 text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                Gift Card Widget — Coming Soon
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 font-serif">
                Give the Gift of
                <span className="text-amber-600"> Adventure</span>
              </h1>

              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Let your customers purchase gift cards for any tour or experience. Perfect for
                holidays, birthdays, and special occasions — coming soon to Foxes Technology.
              </p>

              <div className="flex flex-wrap justify-center gap-6 mb-12">
                {[
                  'Custom Amounts',
                  'Personal Messages',
                  'Email Delivery',
                  'Easy Redemption',
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-gray-700">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Preview Section */}
        <section className="max-w-4xl mx-auto px-4 pb-20">
          {/* Gift Card Preview Mockup */}
          <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-lg overflow-hidden mb-12">
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 px-6 py-4 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                  </svg>
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Gift Card Widget</span>
                  <span className="text-sm text-slate-500 ml-2">Preview</span>
                </div>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">Coming Soon</span>
            </div>

            <div className="p-8 md:p-12">
              {/* Gift Card Visual */}
              <div className="max-w-md mx-auto mb-10">
                <div className="relative bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-2xl p-8 text-white shadow-2xl overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-6 -translate-x-6" />

                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                      <span className="text-lg font-bold">Egypt Excursions Online</span>
                    </div>

                    <div className="text-5xl font-extrabold mb-2">$100</div>
                    <div className="text-white/80 text-sm mb-6">Gift Card</div>

                    <div className="border-t border-white/20 pt-4 flex items-center justify-between">
                      <div>
                        <div className="text-xs text-white/60">To</div>
                        <div className="font-semibold">Sarah Johnson</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-white/60">From</div>
                        <div className="font-semibold">John Smith</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature List */}
              <div className="grid md:grid-cols-2 gap-6 max-w-lg mx-auto">
                {[
                  { icon: '🎁', title: 'Custom & Preset Amounts', desc: 'Choose from preset values or enter any custom amount' },
                  { icon: '💌', title: 'Personal Messages', desc: 'Add a heartfelt note to the recipient' },
                  { icon: '📧', title: 'Email Delivery', desc: 'Beautifully designed email sent automatically' },
                  { icon: '🔑', title: 'Easy Redemption', desc: 'Redeem at checkout against any tour or experience' },
                  { icon: '📅', title: 'Expiry Settings', desc: 'Configurable expiration dates for each card' },
                  { icon: '📊', title: 'Usage Tracking', desc: 'Track balance and usage in your dashboard' },
                ].map((feature) => (
                  <div key={feature.title} className="flex items-start gap-3">
                    <span className="text-2xl">{feature.icon}</span>
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm">{feature.title}</h4>
                      <p className="text-slate-500 text-xs">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notify CTA */}
              <div className="text-center mt-10">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-amber-100 border border-amber-200 rounded-xl">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="text-amber-800 font-medium text-sm">This widget is under development. Contact us to get early access.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Planned Embed Code */}
          <div className="bg-slate-900 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-white font-semibold">Planned Embed Code</span>
              <span className="text-xs text-white/40">Coming Soon</span>
            </div>
            <pre className="p-6 text-sm text-white/60 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
{`<!-- Foxes Gift Card Widget (Coming Soon) -->
<div id="foxes-gift-card"
  data-org-id="${orgId}"
  data-api-url="${apiUrl}"
  data-primary-color="#D97706"
  data-preset-amounts="25,50,100,200"
  data-allow-custom-amount="true">
</div>
<script src="${apiUrl}/widget/foxes-gift-card.js"></script>`}
            </pre>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
