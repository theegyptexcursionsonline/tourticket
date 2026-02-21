'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface MobileBookingDrawerProps {
  price: number;
  originalPrice?: number;
  currency?: string;
  tourTitle: string;
  orgId: string;
  productId?: string;
  apiUrl: string;
}

export default function MobileBookingDrawer({
  price,
  originalPrice,
  currency = '$',
  tourTitle,
  orgId,
  productId: initialProductId,
  apiUrl,
}: MobileBookingDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [resolvedProductId, setResolvedProductId] = useState<string | null>(initialProductId || null);
  const [loading, setLoading] = useState(!initialProductId);
  const drawerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // Fetch product ID if not provided
  useEffect(() => {
    if (initialProductId) {
      setResolvedProductId(initialProductId);
      setLoading(false);
      return;
    }

    async function fetchFirstProduct() {
      try {
        const res = await fetch(`${apiUrl}/api/widget/products/${orgId}`);
        if (res.ok) {
          const data = await res.json();
          const products = data.products || [];
          if (products.length > 0) {
            setResolvedProductId(products[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchFirstProduct();
  }, [orgId, apiUrl, initialProductId]);

  // Reset iframe loaded state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setIframeLoaded(false);
    }
  }, [isOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollY}px`;
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [isOpen]);

  // Touch handlers for swipe to close
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    if (diff > 0 && drawerRef.current) {
      drawerRef.current.style.transform = `translateY(${diff}px)`;
      drawerRef.current.style.transition = 'none';
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const diff = currentY.current - startY.current;

    if (drawerRef.current) {
      drawerRef.current.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';

      if (diff > 80) {
        drawerRef.current.style.transform = 'translateY(100%)';
        setTimeout(() => setIsOpen(false), 300);
      } else {
        drawerRef.current.style.transform = 'translateY(0)';
      }
    }

    startY.current = 0;
    currentY.current = 0;
  }, []);

  // Close drawer on outside click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

  // Build the iframe URL for the calendar widget
  const iframeUrl = resolvedProductId
    ? `${apiUrl}/calendar-demo/mobile-widget?orgId=${orgId}&productId=${resolvedProductId}`
    : null;

  return (
    <>
      {/* Sticky Bottom Bar - Only visible on mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-40">
        <div className="flex items-center justify-between px-4 py-3 safe-area-bottom">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              {originalPrice && originalPrice > price && (
                <span className="text-xs text-gray-400 line-through">
                  {currency}{originalPrice}
                </span>
              )}
              <span className="text-xl font-bold text-gray-900">
                {currency}{price}
              </span>
              <span className="text-xs text-gray-500">/ person</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {discount > 0 && (
                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">
                  {discount}% OFF
                </span>
              )}
              <span className="text-[10px] text-green-600 font-medium flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Free cancellation
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex-shrink-0 ml-3"
          >
            Book Now
          </button>
        </div>
      </div>

      {/* Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 lg:hidden"
          onClick={handleBackdropClick}
        >
          {/* Drawer */}
          <div
            ref={drawerRef}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] flex flex-col animate-slide-up"
            style={{ height: '95dvh', maxHeight: '95dvh' }}
          >
            {/* Drawer Handle */}
            <div
              ref={handleRef}
              className="flex flex-col items-center pt-2 pb-1 bg-white rounded-t-[20px] flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="w-10 h-1 bg-gray-300 rounded-full mb-2" />
              {/* Header row */}
              <div className="w-full flex items-center justify-between px-4 pb-2">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-semibold text-gray-900 truncate">{tourTitle}</p>
                  <span className="text-xs text-gray-400">Swipe down to close</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 active:bg-gray-300 transition-colors flex-shrink-0"
                  aria-label="Close drawer"
                >
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-hidden bg-white">
              {/* Loading State */}
              {(loading || (!iframeLoaded && iframeUrl)) && (
                <div className="bg-white p-4 h-full">
                  {/* Progress steps skeleton */}
                  <div className="flex justify-center gap-8 mb-4 py-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                        <div className="w-12 h-3 bg-gray-100 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>

                  {/* Month/Year selector skeleton */}
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex gap-2">
                      <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse" />
                      <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
                      <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse" />
                    </div>
                  </div>

                  {/* Calendar grid skeleton */}
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {[...Array(35)].map((_, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-lg bg-gray-100 animate-pulse"
                        style={{ animationDelay: `${i * 10}ms` }}
                      />
                    ))}
                  </div>

                  {/* Button skeleton */}
                  <div className="h-12 w-full bg-amber-200 rounded-xl animate-pulse mt-4" />
                </div>
              )}

              {/* Error State - No product found */}
              {!loading && !iframeUrl && (
                <div className="bg-white p-8 text-center h-full flex flex-col items-center justify-center">
                  <div className="w-16 h-16 mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium">Calendar unavailable</p>
                  <p className="text-sm text-gray-400 mt-1">Please try again later</p>
                </div>
              )}

              {/* Calendar iframe */}
              {iframeUrl && (
                <iframe
                  src={iframeUrl}
                  className={`w-full h-full bg-white ${iframeLoaded ? 'block' : 'hidden'}`}
                  style={{ border: 'none' }}
                  onLoad={() => setIframeLoaded(true)}
                  title="Booking Calendar"
                  allow="payment"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom styles */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
        .safe-area-bottom {
          padding-bottom: max(12px, env(safe-area-inset-bottom, 12px));
        }
      `}</style>
    </>
  );
}
