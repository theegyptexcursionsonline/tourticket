import { render, screen } from '@testing-library/react';
import TourPriceDisplay from '@/components/pricing/TourPriceDisplay';

// Render the real catalogue words, so the test reads what a visitor reads.
let mockLocale = 'en';
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, values: Record<string, unknown> = {}) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const catalog = require(`@/messages/${mockLocale}.json`);
    const text = key.split('.').reduce((node: any, part) => node?.[part], catalog) as string;
    return text.replace(/\{(\w+)\}/g, (_m, name) => String(values[name]));
  },
}));

const formatPrice = (value: number) => `$${value.toFixed(2)}`;

describe('TourPriceDisplay', () => {
  it('shows the configured base, calculated customer price and percentage', () => {
    render(
      <TourPriceDisplay
        tour={{ discountPrice: 50, originalPrice: 999, discountPercent: 10 }}
        formatPrice={formatPrice}
      />,
    );

    expect(screen.getByText('$50.00')).toHaveClass('line-through');
    expect(screen.getByText('$45.00')).toBeInTheDocument();
    expect(screen.getByText('10% OFF')).toBeInTheDocument();
  });

  it('keeps the legacy price pair for a tour without a percentage', () => {
    render(
      <TourPriceDisplay
        tour={{ discountPrice: 80, originalPrice: 100 }}
        formatPrice={formatPrice}
      />,
    );

    expect(screen.getByText('$100.00')).toHaveClass('line-through');
    expect(screen.getByText('$80.00')).toBeInTheDocument();
    expect(screen.getByText('20% OFF')).toBeInTheDocument();
  });

  it('does not invent a discount when no reduction exists', () => {
    render(<TourPriceDisplay tour={{ discountPrice: 50 }} formatPrice={formatPrice} />);

    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.queryByTestId('tour-base-discount')).not.toBeInTheDocument();
  });

  it('writes the discount and the per-person words in Arabic on the Arabic site', () => {
    mockLocale = 'ar';
    try {
      render(<TourPriceDisplay tour={{ discountPrice: 50, originalPrice: 999, discountPercent: 10 }} formatPrice={formatPrice} showPerPerson />);
      expect(screen.getByText('خصم 10%')).toBeInTheDocument();
      expect(screen.getByText('للشخص')).toBeInTheDocument();
    } finally {
      mockLocale = 'en';
    }
  });

  it('shows the priced option, never $0.00, when another option has a 0 price (Cairo Private Shopping Tour)', () => {
    render(
      <TourPriceDisplay
        tour={{
          discountPrice: 60,
          bookingOptions: [
            { type: 'Per Person', price: 60, timeSlots: [{}] },
            { type: 'Per Person', price: 0, timeSlots: [{}, {}] },
          ],
        }}
        formatPrice={formatPrice}
      />,
    );
    expect(screen.getByText('$60.00')).toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });

  it('shows the lowest start-time price of an option whose base is 0', () => {
    render(
      <TourPriceDisplay
        tour={{ discountPrice: 12, bookingOptions: [{ type: 'Per Person', price: 0, timeSlots: [{ price: 34.96 }] }, { type: 'Per Person', price: 12.35 }] }}
        formatPrice={formatPrice}
      />,
    );
    expect(screen.getByText('$12.35')).toBeInTheDocument();
  });

  it('says "Price on request" when nothing is priced, in English and in German', () => {
    const tour = { discountPrice: 0, bookingOptions: [{ type: 'Per Person', price: 0 }] };
    const { unmount } = render(<TourPriceDisplay tour={tour} formatPrice={formatPrice} />);
    expect(screen.getByText('Price on request')).toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    expect(screen.queryByText('per person')).not.toBeInTheDocument();
    unmount();
    mockLocale = 'de';
    try {
      render(<TourPriceDisplay tour={tour} formatPrice={formatPrice} />);
      expect(screen.getByText('Preis auf Anfrage')).toBeInTheDocument();
    } finally {
      mockLocale = 'en';
    }
  });
});
