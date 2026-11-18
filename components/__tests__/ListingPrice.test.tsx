import { render, screen } from '@testing-library/react';
import ListingPrice from '@/components/pricing/ListingPrice';
import { listingFromPrice } from '@/lib/pricing/effectivePrice';

// Render the real catalogue words, so the test reads what a visitor reads.
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const catalog = require('@/messages/en.json');
    return key.split('.').reduce((node: any, part) => node?.[part], catalog) as string;
  },
}));

const formatPrice = (value: number) => `$${value.toFixed(2)}`;

describe('ListingPrice (tour cards)', () => {
  it('shows the tour price when the stored listing summary is 0', () => {
    render(
      <ListingPrice
        value={listingFromPrice({ pricingSummary: { fromPrice: 0 }, discountPrice: 60 })}
        formatPrice={formatPrice}
        prefix={<span>From </span>}
      />,
    );
    expect(screen.getByText('$60.00', { exact: false })).toBeInTheDocument();
    expect(screen.queryByText('$0.00', { exact: false })).not.toBeInTheDocument();
  });

  it('shows a real listing summary unchanged', () => {
    render(<ListingPrice value={listingFromPrice({ pricingSummary: { fromPrice: 21.66 }, discountPrice: 16 })} formatPrice={formatPrice} />);
    expect(screen.getByText('$21.66')).toBeInTheDocument();
  });

  it('says "Price on request", without the "From" label, when nothing is priced', () => {
    render(
      <ListingPrice
        value={listingFromPrice({ pricingSummary: { fromPrice: 0 }, discountPrice: 0 })}
        formatPrice={formatPrice}
        prefix={<span>From </span>}
      />,
    );
    expect(screen.getByText('Price on request')).toBeInTheDocument();
    expect(screen.queryByText('From', { exact: false })).not.toBeInTheDocument();
  });
});
