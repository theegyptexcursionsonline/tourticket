import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import StickyBookButton from '@/components/StickyBookButton';

jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    formatPrice: (price: number) => `$${price.toFixed(2)}`,
  }),
}));

describe('StickyBookButton (phone booking bar)', () => {
  beforeEach(() => {
    window.scrollY = 0;
  });

  it('shows the booking action on the first screen, before any scroll', () => {
    render(<StickyBookButton price={69.17} currency="$" onClick={jest.fn()} />);
    expect(screen.getByTestId('open-booking-drawer-mobile')).toBeInTheDocument();
    expect(screen.getByText('$69.17')).toBeInTheDocument();
  });

  it('uses translated labels, not fixed English words', () => {
    render(<StickyBookButton price={10} currency="$" onClick={jest.fn()} />);
    // The test translator returns the key, so a key here proves the label is translated.
    expect(screen.getByTestId('open-booking-drawer-mobile')).toHaveTextContent('booking.bookNow');
    expect(screen.getByText(/booking\.perPersonShort/)).toBeInTheDocument();
    expect(screen.queryByText(/Book now/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\/ person/)).not.toBeInTheDocument();
  });

  it('keeps a spacer so the end of the page is never covered by the bar', () => {
    render(<StickyBookButton price={10} currency="$" onClick={jest.fn()} />);
    expect(screen.getByTestId('mobile-booking-bar-spacer')).toHaveAttribute('aria-hidden', 'true');
  });

  it('opens the drawer on tap', () => {
    const onClick = jest.fn();
    render(<StickyBookButton price={10} currency="$" onClick={onClick} />);
    fireEvent.click(screen.getByTestId('open-booking-drawer-mobile'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('says the price is on request instead of $0.00 when the tour has no real price', () => {
    const onClick = jest.fn();
    render(<StickyBookButton price={null} currency="$" onClick={onClick} />);
    expect(screen.getByText('price.onRequest')).toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    expect(screen.queryByText(/booking\.perPersonShort/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('open-booking-drawer-mobile'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('never shows a 0 price, even if one is passed', () => {
    render(<StickyBookButton price={0} currency="$" onClick={jest.fn()} />);
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    expect(screen.getByText('price.onRequest')).toBeInTheDocument();
  });

  it('renders nothing while the drawer is open', () => {
    const { container } = render(<StickyBookButton price={10} currency="$" onClick={jest.fn()} hidden />);
    expect(container).toBeEmptyDOMElement();
  });
});
