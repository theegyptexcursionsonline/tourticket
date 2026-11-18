import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

interface ListingPriceProps {
  /** From `listingFromPrice`: a real price, or null when the tour has none. */
  value: number | null;
  formatPrice: (value: number) => string;
  /** Shown before the amount only, e.g. a "From" label. */
  prefix?: ReactNode;
}

/** A tour card's price, or "price on request" — never $0.00. */
export default function ListingPrice({ value, formatPrice, prefix }: ListingPriceProps) {
  const t = useTranslations();
  if (value === null) {
    return <span data-price-state="on-request">{t('price.onRequest')}</span>;
  }
  return <>{prefix}{formatPrice(value)}</>;
}
