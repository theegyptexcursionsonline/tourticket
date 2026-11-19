import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

interface ListingPriceProps {
  /** From `listingFromPrice`: a real price, or null when the tour has none. */
  value: number | null;
  formatPrice: (value: number) => string;
  /** Shown before the amount only, e.g. a "From" label. */
  prefix?: ReactNode;
  /** Class of the translated "From" label shown before the amount (when given). */
  fromClassName?: string;
}

/** A tour card's price, or "price on request" — never $0.00. */
export default function ListingPrice({ value, formatPrice, prefix, fromClassName }: ListingPriceProps) {
  const t = useTranslations();
  if (value === null) {
    return <span data-price-state="on-request">{t('price.onRequest')}</span>;
  }
  // The label follows the page language (it was a fixed English "From").
  const label = fromClassName !== undefined
    ? <span className={`${fromClassName} me-1 inline-block first-letter:uppercase`} data-testid="listing-from-label">{t('price.from')}</span>
    : prefix;
  return <>{label}{formatPrice(value)}</>;
}
