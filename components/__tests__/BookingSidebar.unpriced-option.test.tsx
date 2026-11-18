import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { TourOptionCard } from '../BookingSidebar';

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
