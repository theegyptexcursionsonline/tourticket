'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { Link } from '@/i18n/routing';
import Header2 from '@/components/Header2';
import Footer from '@/components/Footer';

export default function ProductPageWidgetShowcase() {
  const [orgId] = useState(process.env.NEXT_PUBLIC_FOXES_ORG_ID || '697f988b5a33570cdc5f2e9c');
  const [apiUrl] = useState(process.env.NEXT_PUBLIC_FOXES_API_URL || 'http://localhost:3001');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch(`${apiUrl}/api/widget/products/${orgId}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
          if (data.products?.length > 0) {
            setSelectedProduct(data.products[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to fetch products:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [orgId, apiUrl]);

  // Re-init the product page widget when selectedProduct changes
  useEffect(() => {
    if (!selectedProduct) return;
    const container = document.getElementById('foxes-product-page-showcase');
    if (container) {
      container.innerHTML = '';
      container.setAttribute('data-product-id', selectedProduct);
    }
    // Dynamically load or reinit
    const existing = document.querySelector('script[data-foxes-product-page]');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.src = `${apiUrl}/widget/foxes-product-page.js`;
    script.setAttribute('data-org-id', orgId);
    script.setAttribute('data-product-id', selectedProduct);
    script.setAttribute('data-api-url', apiUrl);
    script.setAttribute('data-container', 'foxes-product-page-showcase');
    script.setAttribute('data-foxes-product-page', 'true');
    document.body.appendChild(script);

    return () => { script.remove(); };
  }, [selectedProduct, orgId, apiUrl]);

  return (
    <>
      <Header2 />
      <main className="min-h-screen bg-gradient-to-b from-rose-50 to-white pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 px-4">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-600/10 to-pink-500/10" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-rose-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl" />

          <div className="max-w-7xl mx-auto relative">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-100 border border-rose-200 rounded-full text-rose-700 text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                Product Page Widget
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 font-serif">
                Full Product
                <span className="text-rose-600"> Experience</span>
              </h1>

              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                A complete standalone product detail page — photos, descriptions, pricing,
                calendar, and full booking flow — all managed through Foxes Technology.
                No backend needed on your end.
              </p>

              <div className="flex flex-wrap justify-center gap-6 mb-8">
                {[
                  'Complete Product Page',
                  'Image Gallery',
                  'Integrated Calendar',
                  'Full Checkout Flow',
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

        {/* Product Selector */}
        {products.length > 1 && (
          <section className="max-w-7xl mx-auto px-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Select a product to preview</h3>
              <div className="flex flex-wrap gap-3">
                {products.map((product: any) => (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProduct(product.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedProduct === product.id
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {product.name || product.title || `Product ${product.id.slice(-4)}`}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Product Page Widget Container */}
        <section className="max-w-7xl mx-auto px-4 pb-20">
          <div className="bg-white rounded-2xl border-2 border-rose-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 px-6 py-4 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Product Page Widget</span>
                  <span className="text-sm text-slate-500 ml-2">foxes-product-page.js</span>
                </div>
              </div>
              <span className="px-3 py-1 bg-rose-100 text-rose-700 text-xs font-medium rounded-full">Live Preview</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
              </div>
            ) : (
              <div id="foxes-product-page-showcase" className="min-h-[600px]" />
            )}
          </div>

          {/* Embed Code */}
          <div className="mt-8 bg-slate-900 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <span className="text-white font-semibold">Embed Code</span>
            </div>
            <pre className="p-6 text-sm text-white/80 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
{`<!-- Foxes Product Page Widget -->
<div id="foxes-product-page"
  data-org-id="${orgId}"
  data-product-id="YOUR_PRODUCT_ID"
  data-api-url="${apiUrl}">
</div>
<script src="${apiUrl}/widget/foxes-product-page.js"></script>`}
            </pre>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
