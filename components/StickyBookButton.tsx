"use client";

import { useTranslations } from 'next-intl';
import { useSettings } from '@/hooks/useSettings';

interface StickyBookButtonProps {
  /** Lowest bookable per-person price; null when the tour has no real price. */
  price: number | null;
  currency: string;
  onClick: () => void;
  hidden?: boolean;
}

// Phone booking bar. It shows from the first screen (the trip page booking card
// sits far below the photos and story on phones), and a spacer of the same
// height keeps the end of the page from being covered by it.
const StickyBookButton: React.FC<StickyBookButtonProps> = ({ price, onClick, hidden = false }) => {
  const { formatPrice } = useSettings();
  const t = useTranslations();

  if (hidden) {
    return null;
  }

  return (
    <>
      <div aria-hidden="true" data-testid="mobile-booking-bar-spacer" className="h-[calc(5.5rem+env(safe-area-inset-bottom))] md:hidden" />
      <style jsx>{`
        .shimmer-effect {
          position: relative;
          overflow: hidden;
        }
        .shimmer-effect .shimmer-line {
          position: absolute;
          top: 0;
          left: -150%;
          width: 75%;
          height: 100%;
          background: linear-gradient(
            to right,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.5) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          transform: skewX(-25deg);
          animation: shimmer 2.5s infinite;
        }
        @keyframes shimmer {
          100% {
            left: 150%;
          }
        }
      `}</style>
      <div
        data-mobile-booking-bar="true"
        className="fixed bottom-0 left-0 right-0 bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-slate-200 shadow-lg z-[2147483004] md:hidden"
      >
        <div className="container mx-auto flex items-center justify-between">
          {price !== null && Number.isFinite(price) && price > 0 ? (
            <div>
              <span className="font-bold text-lg text-slate-800">{formatPrice(price)}</span>
              <span className="text-sm text-slate-500"> {t('booking.perPersonShort')}</span>
            </div>
          ) : (
            <div data-price-state="on-request">
              <span className="font-bold text-base text-slate-700">{t('price.onRequest')}</span>
            </div>
          )}
          <button
            data-testid="open-booking-drawer-mobile"
            onClick={onClick}
            className="shimmer-effect bg-red-600 text-white font-bold py-3 px-6 rounded-full hover:bg-red-700 transition-colors shadow-md"
          >
            <span className="shimmer-line"></span>
            {t('booking.bookNow')}
          </button>
        </div>
      </div>
    </>
  );
};

export default StickyBookButton;
