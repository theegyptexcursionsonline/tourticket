import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { BookingFooterTotal, TourOptionCard, optionEstimatePrice } from '../BookingSidebar';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/hooks/useSettings', () => ({ useSettings: () => ({ formatPrice: (price: number) => `$${price.toFixed(2)}` }) }));
jest.mock('@/hooks/useCart', () => ({ useCart: jest.fn() }));
jest.mock('framer-motion', () => {
  const React = require('react');
  const element = (tag: string) => ({ children, ...properties }: { children?: React.ReactNode } & Record<string, unknown>) => {
    const props = { ...properties };
    for (const key of ['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap']) delete props[key];
    return React.createElement(tag, props, children);
  };
  return { motion: { div: element('div'), button: element('button'), span: element('span') }, AnimatePresence: ({ children }: { children: React.ReactNode }) => children };
});

const tour = { title: 'Cairo Private Shopping Tour', image: '/tour.jpg', discountPrice: 60 };
const base = { onSelect: jest.fn(), selectedTimeSlot: null, adults: 1, childCount: 0, infantCount: 0, tour };

describe('an option with no real price in the booking panel', () => {
  it('says it cannot be booked online, with no $0.00 and nothing to select', () => {
    const option = {
      id: 'option-1', title: 'Private Cairo Experience', price: 0, duration: '3 hours',
      languages: ['English'], description: 'Private tour', timeSlots: [], priceUnavailable: true,
    };
    render(<TourOptionCard {...base} option={option} />);
    expect(screen.getByTestId('option-price-unavailable')).toHaveTextContent('booking.optionPriceUnavailable');
    expect(screen.getByText('price.onRequest')).toBeInTheDocument();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
    expect(screen.queryByText('booking.availableDepartureTimes')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /\d{2}:\d{2}/ })).not.toBeInTheDocument();
  });

  it('a priced option beside it keeps its price and its departures', () => {
    const slot = { id: 'slot-1', optionId: 'option-0', time: '11:00', available: 10, price: 60 };
    const option = {
      id: 'option-0', title: 'Private Tour with Transfers', price: 60, duration: '3 hours',
      languages: ['English'], description: 'Private tour', timeSlots: [slot],
    };
    render(<TourOptionCard {...base} option={option} />);
    expect(screen.getAllByText('$60.00').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('option-price-unavailable')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /11:00/ })).toBeInTheDocument();
  });

  it('a 0-base option priced per start time shows that start time\'s price', () => {
    const slot = { id: 'slot-1', optionId: 'option-3', time: '08:00', available: 10, price: 116, guestPrices: { adult: 116, child: 116, infant: 0 } };
    const option = {
      id: 'option-3', title: 'Shared tour', price: 0, duration: '3 hours',
      languages: ['English'], description: 'Shared tour', timeSlots: [slot],
    };
    render(<TourOptionCard {...base} option={option} />);
    expect(screen.getAllByText('$116.00').length).toBeGreaterThan(0);
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });
});

describe('the booking panel only offers departures with a real price', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'components', 'BookingSidebar.tsx'), 'utf8');

  it('drops unpriced departures and marks an option with none left as unpriced', () => {
    expect(source).toMatch(/const pricedTimeSlots = baseTimeSlots\.filter\(\(slot\) => isRealPrice\(slot\.price\)\)/);
    expect(source).toMatch(/futureDepartureSlots\(selectedDateKey, pricedTimeSlots,/);
    expect(source).toMatch(/priceUnavailable: pricedTimeSlots\.length === 0/);
    expect(source).toMatch(/priceUnavailable: baseTimeSlots\.length === 0/);
  });

  it('never invents a price for an option stored without one', () => {
    expect(source).not.toMatch(/discountPrice \?\? 50/);
  });

  it('headline uses the bookable price, with a no-price state', () => {
    expect(source).toMatch(/bookableTripPrice\(tour/);
    expect(source).not.toMatch(/displayedTripPrice/);
  });
});

describe('a collapsed unpriced option offers no time to select', () => {
  const unpriced = {
    id: 'option-1', title: 'Private Cairo Experience', price: 0, duration: '3 hours',
    languages: ['English'], description: 'Private tour', timeSlots: [], priceUnavailable: true,
  };

  it('its toggle never reads "Select Time" and its note shows while collapsed', () => {
    render(<TourOptionCard {...base} option={unpriced} collapsible expanded={false} onToggleExpanded={jest.fn()} />);
    expect(screen.queryByText('booking.selectTime')).not.toBeInTheDocument();
    expect(screen.getByText('common.readMore')).toBeInTheDocument();
    const note = screen.getByTestId('option-price-unavailable');
    expect(note).toBeVisible();
    // The note is read as a note, not as part of the expand control.
    expect(note.closest('[role="button"]')).toBeNull();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });

  it('a collapsed priced option still invites the customer to select a time', () => {
    const slot = { id: 'slot-1', optionId: 'option-0', time: '11:00', available: 10, price: 60 };
    const priced = { ...unpriced, id: 'option-0', title: 'Private Tour', price: 60, timeSlots: [slot], priceUnavailable: false };
    render(<TourOptionCard {...base} option={priced} collapsible expanded={false} onToggleExpanded={jest.fn()} />);
    expect(screen.getByText('booking.selectTime')).toBeInTheDocument();
    expect(screen.queryByTestId('option-price-unavailable')).not.toBeInTheDocument();
  });
});

describe('the drawer footer total', () => {
  it('never prints a 0 total: it asks the customer to choose an option', () => {
    for (const total of [0, -1, Number.NaN]) {
      const { unmount } = render(<BookingFooterTotal total={total} totalSavings={0} />);
      const footer = screen.getByTestId('booking-footer-total');
      expect(footer).toHaveAttribute('data-total-state', 'choose-option');
      expect(footer).toHaveTextContent('booking.chooseOptionForTotal');
      expect(footer).not.toHaveTextContent('$');
      expect(footer).not.toHaveTextContent('booking.totalPrice');
      unmount();
    }
  });

  it('shows a real total with its label, and savings when there are any', () => {
    const { rerender } = render(<BookingFooterTotal total={60} totalSavings={0} />);
    expect(screen.getByTestId('booking-footer-total')).toHaveAttribute('data-total-state', 'priced');
    expect(screen.getByText('$60.00')).toBeInTheDocument();
    expect(screen.getByText(/booking\.totalPrice/)).toBeInTheDocument();
    rerender(<BookingFooterTotal total={51} totalSavings={9} />);
    expect(screen.getByText(/booking\.saveAmount/)).toBeInTheDocument();
  });
});

describe('the running-total estimate before a departure is chosen', () => {
  const slot = (price: number, available = 10) => ({ id: `s-${price}`, time: '10:00', available, price });

  it('an option with its own price is quoted at it (unchanged behaviour)', () => {
    expect(optionEstimatePrice({ price: 60, timeSlots: [slot(75)] })).toBe(60);
  });

  it('a 0-base option is quoted at the departure its card shows', () => {
    expect(optionEstimatePrice({ price: 0, timeSlots: [slot(30, 0), slot(116)] })).toBe(116);
    expect(optionEstimatePrice({ price: 0, timeSlots: [slot(34.96, 0)] })).toBe(34.96);
  });

  it('an option with no real price is not an estimate', () => {
    expect(optionEstimatePrice({ price: 0, timeSlots: [], priceUnavailable: true })).toBeNull();
    expect(optionEstimatePrice({ price: 60, timeSlots: [slot(60)], priceUnavailable: true })).toBeNull();
    expect(optionEstimatePrice({ price: 0, timeSlots: [] })).toBeNull();
  });

  const source = fs.readFileSync(path.join(process.cwd(), 'components', 'BookingSidebar.tsx'), 'utf8');
  it('the footer uses the guarded total and the estimate skips unpriced options', () => {
    expect(source).toContain('<BookingFooterTotal total={total} totalSavings={totalSavings} />');
    expect(source).toMatch(/const quoted = optionEstimatePrice\(candidate\);\s*\n\s*if \(quoted === null\) return \[\];/);
    expect(source).toContain('{t(\'booking.chooseOptionForTotal\')}');
  });
});
