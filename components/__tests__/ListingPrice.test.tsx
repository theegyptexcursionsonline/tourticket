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

describe('the "From" label on cards follows the page language', () => {
  it('reads price.from from the message files', () => {
    render(<ListingPrice value={21.66} formatPrice={formatPrice} fromClassName="text-xs" />);
    expect(screen.getByTestId('listing-from-label')).toHaveTextContent('from');
    expect(screen.getByText('$21.66', { exact: false })).toBeInTheDocument();
  });

  it('shows no label beside "Price on request"', () => {
    render(<ListingPrice value={null} formatPrice={formatPrice} fromClassName="text-xs" />);
    expect(screen.queryByTestId('listing-from-label')).not.toBeInTheDocument();
  });
});

describe('no customer card prints the stored base price directly', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require('path');
  const files = [
    'components/user/TourCard.tsx', 'components/WishlistSidebar.tsx', 'components/InterestLandingPage.tsx',
    'components/AttractionPageTemplate.tsx', 'app/[locale]/[slug]/TourDetailClientPage.tsx',
    'components/shared/TourCard.tsx', 'components/FeaturedTours.tsx', 'components/FeaturedToursServer.tsx',
    'app/[locale]/tours/ToursClientPage.tsx', 'app/[locale]/egypt/EgyptToursClient.tsx',
  ];
  it.each(files)('%s', (file) => {
    const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    expect(source).not.toMatch(/formatPrice\((tour|relatedTour)\.discountPrice/);
    expect(source).not.toMatch(/>From <\/span>/);
  });
});
