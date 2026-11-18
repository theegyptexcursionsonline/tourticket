import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import BookingSidebar from '../BookingSidebar';

// #2727 follow-up: on the Cairo Private Shopping Tour the drawer footer read
// "$0.00 Total Price" before an option was chosen, because the running-total
// estimate counted the unpriced option as the cheapest one.
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'en' }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/hooks/useSettings', () => ({ useSettings: () => ({ formatPrice: (price: number) => `$${price.toFixed(2)}` }) }));
jest.mock('@/hooks/useCart', () => ({ useCart: () => ({ addToCart: jest.fn() }) }));
jest.mock('framer-motion', () => {
  const ReactLib = require('react');
  const cache = new Map();
  const strip = ['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'layout'];
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy({}, {
      get: (_target, tag: string) => {
        if (!cache.has(tag)) {
          cache.set(tag, ReactLib.forwardRef((all: Record<string, unknown>, ref: unknown) => {
            const props: Record<string, unknown> = { ...all, ref };
            for (const key of strip) delete props[key];
            const children = props.children as React.ReactNode;
            delete props.children;
            return ReactLib.createElement(tag, props, children);
          }));
        }
        return cache.get(tag);
      },
    }),
  };
});

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

const priced = { id: 'priced', pricingKey: 'priced', label: 'Private Tour with Transfers', type: 'Per Person', price: 60, timeSlots: [{ time: '23:30', price: 60 }] };
const unpriced = { id: 'unpriced', pricingKey: 'unpriced', label: 'Private Cairo Experience', type: 'Per Person', price: 0, timeSlots: [{ time: '23:30' }] };
const perTime = { id: 'per-time', pricingKey: 'per-time', label: 'Shared museum tour', type: 'Per Person', price: 0, timeSlots: [{ time: '23:30', price: 116 }] };

async function openOptions(options: unknown[], tourPrice = 60) {
  // Every day for the next two months has the 23:30 departure open.
  const availableSlotsByDate: Record<string, unknown[]> = {};
  for (let offset = 0; offset < 70; offset += 1) {
    const date = new Date(Date.now() + offset * 86400000);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    availableSlotsByDate[key] = [{ time: '23:30', capacity: 20, booked: 0, available: 20 }];
  }
  const fetchMock = jest.fn(async (url: string) => ({
    ok: true,
    json: async () => {
      const href = String(url);
      if (href.includes('/options')) return options;
      if (href.includes('/availability')) return { success: true, availableSlotsByDate, fullyBookedDates: [] };
      return { success: true, data: { days: {}, stopSaleStatus: 'none', stoppedOptionIds: [] } };
    },
  }));
  global.fetch = fetchMock as unknown as typeof fetch;
  HTMLElement.prototype.scrollTo = jest.fn();
  HTMLElement.prototype.scrollIntoView = jest.fn();
  const tour = {
    _id: 'tour-one', id: 'tour-one', title: 'Cairo Private Shopping Tour', image: '/tour.jpg', discountPrice: tourPrice, price: tourPrice,
    bookingOptions: options,
    availability: { type: 'daily', availableDays: [0, 1, 2, 3, 4, 5, 6], slots: [{ time: '23:30', capacity: 20 }] },
  };
  render(<BookingSidebar isOpen onClose={jest.fn()} tour={tour as never} />);
  // The drawer resets its state on a zero-delay timer after opening.
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
  fireEvent.click(screen.getByRole('button', { name: 'booking.chooseDate' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument());
  // A date two days out, so no departure has elapsed.
  const day = new Date(Date.now() + 2 * 86400000);
  if (day.getMonth() !== new Date().getMonth()) fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
  const target = await waitFor(() => {
    const found = screen.queryAllByRole('button', { name: String(day.getDate()) })
      .find((node) => !(node as HTMLButtonElement).disabled);
    if (!found) throw new Error('day not selectable yet');
    return found;
  });
  fireEvent.click(target);
  fireEvent.click(screen.getByText('booking.findMyAdventure'));
  await waitFor(() => expect(screen.getByTestId('booking-footer-total')).toBeInTheDocument());
}

describe('booking drawer footer before an option is chosen', () => {
  it('an unpriced option beside a priced one no longer makes the footer read $0.00', async () => {
    await openOptions([priced, unpriced]);
    const footer = screen.getByTestId('booking-footer-total');
    expect(footer).toHaveAttribute('data-total-state', 'priced');
    expect(footer).toHaveTextContent('$60.00');
    expect(footer).not.toHaveTextContent('$0.00');
  });

  it('a 0-base option priced per start time is estimated at that start time', async () => {
    await openOptions([perTime]);
    expect(screen.getByTestId('booking-footer-total')).toHaveTextContent('$116.00');
  });

  it('with every option unpriced it asks for an option instead of quoting the tour base', async () => {
    await openOptions([unpriced, { ...unpriced, id: 'u2', pricingKey: 'u2', label: 'Second' }], 60);
    const footer = screen.getByTestId('booking-footer-total');
    expect(footer).toHaveAttribute('data-total-state', 'choose-option');
    expect(footer).toHaveTextContent('booking.chooseOptionForTotal');
    expect(footer).not.toHaveTextContent('$');
  });
});
