'use client';

import { useEffect, useRef, useState } from 'react';

interface FoxesCalendarEmbedProps {
  orgId: string;
  productId?: string;
  apiUrl: string;
  primaryColor?: string;
  accentColor?: string;
  containerId?: string;
}

export default function FoxesCalendarEmbed({
  orgId,
  productId,
  apiUrl,
  primaryColor = '#D97706',
  accentColor = '#F59E0B',
  containerId = 'foxes-embed-calendar',
}: FoxesCalendarEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !apiUrl) {
      setError('Missing required configuration: orgId and apiUrl are required');
      setIsLoading(false);
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector(`script[data-foxes-widget="${containerId}"]`);
    if (existingScript) {
      setIsLoading(false);
      return;
    }

    // Create and load the widget script
    const script = document.createElement('script');
    script.src = `${apiUrl}/widget/foxes-calendar-embed.js`;
    script.async = true;
    script.setAttribute('data-foxes-widget', containerId);
    script.setAttribute('data-org-id', orgId);
    if (productId) {
      script.setAttribute('data-product-id', productId);
    }
    script.setAttribute('data-api-url', apiUrl);
    script.setAttribute('data-primary-color', primaryColor);
    script.setAttribute('data-accent-color', accentColor);
    script.setAttribute('data-container-id', containerId);

    script.onload = () => {
      setIsLoading(false);
      // Initialize widget if programmatic API is available
      if (typeof window !== 'undefined' && (window as any).FoxesCalendarEmbed) {
        (window as any).FoxesCalendarEmbed.init({
          containerId,
          orgId,
          productId,
          apiUrl,
        });
      }
    };

    script.onerror = () => {
      setError('Failed to load booking widget. Please check the API URL.');
      setIsLoading(false);
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup on unmount
      const scriptToRemove = document.querySelector(`script[data-foxes-widget="${containerId}"]`);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [orgId, productId, apiUrl, primaryColor, accentColor, containerId]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
        <div className="text-red-600 mb-2">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-red-700 font-medium">{error}</p>
        <p className="text-red-500 text-sm mt-2">Please verify your widget configuration.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
            <p className="text-gray-600 font-medium">Loading booking widget...</p>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        id={containerId}
        className="min-h-[500px] bg-white rounded-2xl shadow-lg overflow-hidden"
      />
    </div>
  );
}
