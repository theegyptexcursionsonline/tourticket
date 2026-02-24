'use client';

import React, { useEffect } from 'react';
import Header2 from '@/components/Header2';
import Footer from '@/components/Footer';

const widgetConfig = {
  apiUrl: process.env.NEXT_PUBLIC_FOXES_SEARCH_API_URL || 'https://search.foxestechnology.com',
  apiKey: process.env.NEXT_PUBLIC_FOXES_SEARCH_API_KEY || '',
};

export default function AIChatPageShowcase() {
  useEffect(() => {
    if (!widgetConfig.apiKey) return;
    const scriptId = 'foxes-chat-page-script';
    if (document.getElementById(scriptId)) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `${widgetConfig.apiUrl}/widget/foxes-chat-page.js`;
    script.async = true;
    script.setAttribute('data-api-key', widgetConfig.apiKey);
    script.setAttribute('data-container', 'foxes-chat-page');
    script.setAttribute('data-accent', '#4f46e5');
    script.setAttribute('data-agent-name', 'Travel Concierge');
    script.setAttribute('data-greeting', 'Welcome! I can help you find tours, answer questions about Egypt, check availability, and more. What would you like to know?');
    script.setAttribute('data-show-sidebar', 'true');
    script.setAttribute('data-show-branding', 'true');
    script.setAttribute('data-track-events', 'true');

    document.body.appendChild(script);

    return () => {
      const el = document.getElementById(scriptId);
      if (el) el.remove();
      const container = document.getElementById('foxes-chat-page');
      if (container) container.innerHTML = '';
    };
  }, []);

  return (
    <>
      <Header2 />
      <main className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pt-20">
        {/* Compact Hero */}
        <section className="relative overflow-hidden py-12 px-4">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-violet-500/10" />
          <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-violet-400/20 rounded-full blur-3xl" />

          <div className="max-w-7xl mx-auto relative">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 border border-indigo-200 rounded-full text-indigo-700 text-sm font-medium mb-4">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                Full Page Assistant
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 font-serif">
                Your Travel
                <span className="text-indigo-600"> Assistant</span>
              </h1>

              <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
                A dedicated page for your travel questions. Ask about tours, destinations,
                pricing, availability — get personalized recommendations instantly.
              </p>
            </div>
          </div>
        </section>

        {/* Full Page Chat Widget */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-20">
          <div
            id="foxes-chat-page"
            className="rounded-2xl overflow-hidden shadow-xl border border-indigo-100 bg-white"
            style={{ minHeight: '650px' }}
          >
            {!widgetConfig.apiKey && (
              <div className="flex items-center justify-center h-full min-h-[650px] bg-indigo-50">
                <div className="text-center">
                  <svg className="w-12 h-12 text-indigo-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="text-indigo-600 text-sm font-medium">Assistant loading...</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
