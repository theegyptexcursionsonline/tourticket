import { useTranslations } from 'next-intl';
import { displayedTripPrice, percentageOff, type PricedBookingOption, type PricedTour } from '@/lib/pricing/effectivePrice';

interface TourPriceDisplayProps {
  tour: PricedTour & { bookingOptions?: PricedBookingOption[] | null };
  formatPrice: (value: number) => string;
  align?: 'left' | 'center' | 'right';
  priceClassName?: string;
  originalClassName?: string;
  showPerPerson?: boolean;
}

const alignmentClasses = {
  left: 'items-start text-left',
  center: 'items-center text-center',
  right: 'items-end text-right',
} as const;

/** One truthful per-person price for the hero, sidebar and drawer. */
export default function TourPriceDisplay({
  tour,
  formatPrice,
  align = 'right',
  priceClassName = 'text-3xl md:text-4xl font-extrabold text-red-600',
  originalClassName = 'text-slate-500 line-through text-lg',
  showPerPerson = true,
}: TourPriceDisplayProps) {
  const t = useTranslations();
  // The lowest price a guest can book (same as the cards and the cart), not the bare base.
  const pricing = displayedTripPrice(tour);
  const discount = percentageOff(pricing.originalPrice, pricing.price);

  return (
    <div className={`flex flex-col ${alignmentClasses[align]}`} data-testid="tour-base-price">
      {pricing.discountApplied && (
        <div className="mb-1 flex flex-wrap items-center gap-2" data-testid="tour-base-discount">
          <span className={originalClassName}>{formatPrice(pricing.originalPrice)}</span>
          {discount > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
              {t('tourPage.percentOff', { discount })}
            </span>
          )}
        </div>
      )}
      <span className={priceClassName}>{formatPrice(pricing.price)}</span>
      {showPerPerson && <span className="text-sm text-slate-500">{t('tourPage.perPerson')}</span>}
    </div>
  );
}
