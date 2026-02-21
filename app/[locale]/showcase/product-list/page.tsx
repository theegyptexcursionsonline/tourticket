'use client';

import React, { useEffect, useState } from 'react';
import Header2 from '@/components/Header2';
import Footer from '@/components/Footer';

export default function ProductListWidgetShowcase() {
  const [orgId] = useState(process.env.NEXT_PUBLIC_FOXES_ORG_ID || '697f988b5a33570cdc5f2e9c');
  const [apiUrl] = useState(process.env.NEXT_PUBLIC_FOXES_API_URL || 'http://localhost:3001');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch(`${apiUrl}/api/widget/products/${orgId}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || []);
        }
      } catch (e) {
        console.error('Failed to fetch products:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [orgId, apiUrl]);

  const openBooking = (productId: string) => {
    // Open the Foxes booking sidebar for this product
    if (typeof window !== 'undefined' && (window as any).FoxesBooking) {
      (window as any).FoxesBooking.open({ productId });
    } else {
      window.open(`${apiUrl}/b/${orgId}?productId=${productId}`, '_blank');
    }
  };

  return (
    <>
      <Header2 />
      <main className="min-h-screen bg-gradient-to-b from-cyan-50 to-white pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 px-4">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 to-blue-500/10" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" />

          <div className="max-w-7xl mx-auto relative">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-100 border border-cyan-200 rounded-full text-cyan-700 text-sm font-medium mb-6">
                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                Product List Widget
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 font-serif">
                Browse All
                <span className="text-cyan-600"> Products</span>
              </h1>

              <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
                Display all your bookable products in a beautiful, responsive grid.
                Customers can browse, compare, and book directly — perfect for landing pages and catalogs.
              </p>

              <div className="flex flex-wrap justify-center gap-6 mb-8">
                {[
                  'Responsive Grid Layout',
                  'Quick Book Buttons',
                  'Live Pricing',
                  'Customizable Design',
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

        {/* Product List Widget Preview */}
        <section className="max-w-7xl mx-auto px-4 pb-20">
          <div className="bg-white rounded-2xl border-2 border-cyan-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 px-6 py-4 border-b border-cyan-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </div>
                <div>
                  <span className="font-semibold text-slate-800">Product List Widget</span>
                  <span className="text-sm text-slate-500 ml-2">{products.length} products</span>
                </div>
              </div>
              <span className="px-3 py-1 bg-cyan-100 text-cyan-700 text-xs font-medium rounded-full">Live Preview</span>
            </div>

            <div className="p-6 md:p-8">
              {loading ? (
                <div className="flex items-center justify-center py-32">
                  <div className="w-10 h-10 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin" />
                </div>
              ) : products.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product: any) => (
                    <div key={product.id} className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl hover:border-cyan-300 transition-all duration-300">
                      {/* Product Image */}
                      <div className="relative h-48 bg-gradient-to-br from-cyan-100 to-blue-100 overflow-hidden">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-16 h-16 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        {product.duration && (
                          <div className="absolute top-3 left-3">
                            <span className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                              {product.duration}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-5">
                        <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-cyan-600 transition-colors">
                          {product.name || product.title}
                        </h3>
                        <p className="text-gray-500 text-sm line-clamp-2 mb-4">{product.description}</p>

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-2xl font-bold text-gray-900">${product.price || product.basePrice || 99}</span>
                            <span className="text-gray-500 text-sm ml-1">/ person</span>
                          </div>
                          <button
                            onClick={() => openBooking(product.id)}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-lg transition-colors"
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-gray-500 text-lg">No products found. Add products in your Foxes dashboard.</p>
                </div>
              )}
            </div>
          </div>

          {/* Embed Code */}
          <div className="mt-8 bg-slate-900 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <span className="text-white font-semibold">Embed Code</span>
            </div>
            <pre className="p-6 text-sm text-white/80 whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">
{`<!-- Foxes Product List Widget -->
<div id="foxes-product-list"
  data-org-id="${orgId}"
  data-api-url="${apiUrl}"
  data-primary-color="#0891B2"
  data-columns="3">
</div>
<script src="${apiUrl}/widget/foxes-booking-v2.js"
  data-org-id="${orgId}"
  data-api-url="${apiUrl}"
  data-primary-color="#0891B2">
</script>`}
            </pre>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
