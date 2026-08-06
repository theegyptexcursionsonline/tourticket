import { render, screen } from '@testing-library/react';
import TourPriceDisplay from '@/components/pricing/TourPriceDisplay';

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
});
