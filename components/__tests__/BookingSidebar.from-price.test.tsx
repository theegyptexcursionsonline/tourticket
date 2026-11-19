import React from 'react';
import fs from 'fs';
import path from 'path';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import BookingSidebar, { BookingFooterTotal, TourOptionCard, optionCardFigures, optionEstimatePrice, optionQuote } from '../BookingSidebar';

// Makadi Bay ATV tour, 19 Nov 2026: the heading read "$21.66 per person"
// (lowest start time) while the option card and the footer read "$29.78"
// (first start time). Before a pick, every figure is now the option's lowest
// bookable price, read "From" when its start times are priced differently.

let mockLocale = 'en';
let mockKeysOnly = false;
const messagesFor = (locale: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'messages', `${locale}.json`), 'utf8'));
jest.mock('next-intl', () => ({
  useLocale: () => mockLocale,
  useTranslations: () => (key: string) => {
    if (mockKeysOnly) return key;
    const value = key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), messagesFor(mockLocale));
    return typeof value === 'string' ? value : key;
  },
}));
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

const slot = (time: string, price: number, available = 10, extra: Record<string, unknown> = {}) => ({
  id: `opt-${time}`, optionId: 'opt', time, price, available, ...extra,
});
const option = (timeSlots: ReturnType<typeof slot>[], extra: Record<string, unknown> = {}) => ({
  id: 'opt', title: 'Quad bike', price: 0, duration: '2 hours', languages: ['English'], description: 'Quad bike',
  timeSlots, type: 'Per Person', ...extra,
});

describe('which start time an option is quoted at', () => {
  const makadi = option([slot('05:00', 29.78), slot('08:00', 23.01), slot('10:00', 21.66), slot('12:00', 29.78), slot('14:00', 33.84)]);

  it('several start times: the lowest bookable one, read "From"', () => {
    const quote = optionQuote(makadi, null);
    expect(quote.price).toBe(21.66);
    expect(quote.slot?.time).toBe('10:00');
    expect(quote.isFrom).toBe(true);
    expect(optionEstimatePrice(makadi)).toBe(21.66);
  });

  it('a sold-out start time is skipped, even when it is the cheapest', () => {
    const soldOut = option([slot('05:00', 29.78), slot('10:00', 21.66, 0), slot('12:00', 25)]);
    const quote = optionQuote(soldOut, null);
    expect(quote.price).toBe(25);
    expect(quote.slot?.time).toBe('12:00');
    expect(quote.isFrom).toBe(true);
  });

  it('only one bookable price left: no "From", even if a sold-out time costs less', () => {
    const quote = optionQuote(option([slot('05:00', 30), slot('10:00', 20, 0), slot('12:00', 30)]), null);
    expect(quote.price).toBe(30);
    expect(quote.isFrom).toBe(false);
    expect(quote.slot?.time).toBe('05:00');
  });

  it('every start time sold out: the lowest real price, as before a pick is possible', () => {
    const quote = optionQuote(option([slot('05:00', 30, 0), slot('10:00', 20, 0)]), null);
    expect(quote.price).toBe(20);
    expect(quote.isFrom).toBe(true);
  });

  it('all start times the same price: a plain price, the earliest start time', () => {
    const quote = optionQuote(option([slot('08:00', 27.07), slot('10:00', 27.07), slot('12:00', 27.07)]), null);
    expect(quote.price).toBe(27.07);
    expect(quote.slot?.time).toBe('08:00');
    expect(quote.isFrom).toBe(false);
  });

  it('one start time: a plain price', () => {
    expect(optionQuote(option([slot('16:00', 60.92)], { price: 60.92 }), null)).toMatchObject({ price: 60.92, isFrom: false });
  });

  it('a real base price does not hide a cheaper start time (that start time is what checkout charges)', () => {
    const based = option([slot('05:00', 29.78), slot('08:00', 27.07), slot('14:00', 60.92)], { price: 29.78, originalPrice: 29.78 });
    expect(optionQuote(based, null)).toMatchObject({ price: 27.07, isFrom: true });
    expect(optionEstimatePrice(based)).toBe(27.07);
  });

  it('no start time left (all passed today): the option base price when it is real', () => {
    expect(optionQuote(option([], { price: 45 }), null)).toMatchObject({ price: 45, isFrom: false, slot: undefined });
    expect(optionQuote(option([], { price: 0 }), null)).toMatchObject({ price: null, isFrom: false });
  });

  it('an unpriced option has no quote', () => {
    expect(optionQuote(option([], { priceUnavailable: true }), null)).toMatchObject({ price: null, isFrom: false });
    expect(optionEstimatePrice(option([slot('10:00', 30)], { priceUnavailable: true }))).toBeNull();
  });

  it('a picked start time drives the quote and "From" goes away', () => {
    const picked = { id: 'opt-14:00', optionId: 'opt', time: '14:00', price: 33.84, available: 10 };
    expect(optionQuote(makadi, picked)).toMatchObject({ price: 33.84, isFrom: false });
    expect(optionQuote(makadi, picked).slot?.time).toBe('14:00');
    // A start time of another option is not this option's pick.
    expect(optionQuote(makadi, { ...picked, optionId: 'other' })).toMatchObject({ price: 21.66, isFrom: true });
  });
});

describe('the figures a card prints for a party', () => {
  it('uses the quoted start time\'s guest prices', () => {
    const opt = option([slot('08:00', 40, 10, { guestPrices: { adult: 40, child: 30, infant: 5 } }), slot('10:00', 50)]);
    const figures = optionCardFigures(opt, optionQuote(opt, null), 2, 1, 1);
    expect(figures.subtotal).toBe(40 * 2 + 30 + 5);
    expect(figures.originalSubtotal).toBe(figures.subtotal);
  });

  it('a start time cheaper than the base is not shown as a discount', () => {
    const opt = option([slot('05:00', 29.78), slot('08:00', 27.07)], { price: 29.78, originalPrice: 29.78 });
    const figures = optionCardFigures(opt, optionQuote(opt, null), 1, 0, 0);
    expect(figures.subtotal).toBe(27.07);
    expect(figures.originalSubtotal).toBe(27.07);
  });

  it('a real option discount still shows its compare-at price', () => {
    const opt = option([slot('09:00', 27, 10)], { price: 27, originalPrice: 30 });
    expect(optionCardFigures(opt, optionQuote(opt, null), 1, 0, 0)).toMatchObject({ subtotal: 27, originalSubtotal: 30 });
  });

  it('a start time with its own original price shows it', () => {
    const opt = option([slot('09:00', 27, 10, { originalPrice: 30 })], { price: 0 });
    expect(optionCardFigures(opt, optionQuote(opt, null), 2, 0, 0)).toMatchObject({ subtotal: 54, originalSubtotal: 60 });
  });

  it('a per-group option is one group price at its lowest start time', () => {
    const opt = option([slot('09:00', 700), slot('16:00', 609.2)], { type: 'Per Group', price: 609.2, minCapacity: 10 });
    expect(optionCardFigures(opt, optionQuote(opt, null), 3, 0, 0).subtotal).toBe(609.2);
  });
});

const fromWord: Record<string, string> = {};
for (const locale of ['en', 'ar', 'de', 'fr', 'es']) fromWord[locale] = messagesFor(locale).price.from;

describe('the "From" label in every language of the site', () => {
  afterEach(() => { mockLocale = 'en'; });
  const tour = { title: 'Makadi Bay ATV', image: '/tour.jpg', discountPrice: 21.66 };
  const base = { onSelect: jest.fn(), adults: 1, childCount: 0, infantCount: 0, tour };
  const makadi = option([slot('05:00', 29.78), slot('10:00', 21.66), slot('14:00', 33.84)]);

  it.each(['en', 'ar', 'de', 'fr', 'es'])('%s: card and footer read the lowest price with "From"', (locale) => {
    mockLocale = locale;
    expect(fromWord[locale]).toBeTruthy();
    const { container } = render(<div><TourOptionCard {...base} option={makadi} selectedTimeSlot={null} /><BookingFooterTotal total={21.66} totalSavings={0} isFrom /></div>);
    const labels = screen.getAllByTestId('price-from-label');
    expect(labels).toHaveLength(2);
    for (const label of labels) expect(label).toHaveTextContent(fromWord[locale]);
    const box = container.querySelector('[data-price-state="from"]') as HTMLElement;
    expect(within(box).getByText('$21.66')).toBeInTheDocument();
    expect(screen.getByTestId('booking-footer-total')).toHaveAttribute('data-total-from', 'true');
    // The card's own price box never quotes the first start time ($29.78).
    expect(box).not.toHaveTextContent('$29.78');
  });

  it.each(['en', 'ar', 'de', 'fr', 'es'])('%s: a picked start time shows its own price and no "From"', (locale) => {
    mockLocale = locale;
    const picked = { id: 'opt-14:00', optionId: 'opt', time: '14:00', price: 33.84, available: 10 };
    render(<div><TourOptionCard {...base} option={makadi} selectedTimeSlot={picked} /><BookingFooterTotal total={33.84} totalSavings={0} /></div>);
    expect(screen.queryByTestId('price-from-label')).not.toBeInTheDocument();
    expect(screen.getAllByText('$33.84').length).toBeGreaterThan(0);
    expect(screen.getByTestId('booking-footer-total')).not.toHaveAttribute('data-total-from');
  });

  it('one price per option: no "From" on the card', () => {
    render(<TourOptionCard {...base} option={option([slot('08:00', 27.07), slot('10:00', 27.07)])} selectedTimeSlot={null} />);
    expect(screen.queryByTestId('price-from-label')).not.toBeInTheDocument();
  });

  it('an unpriced option keeps "Price on request" and no "From"', () => {
    render(<TourOptionCard {...base} option={option([], { priceUnavailable: true })} selectedTimeSlot={null} />);
    expect(screen.getByText(messagesFor('en').price.onRequest)).toBeInTheDocument();
    expect(screen.queryByTestId('price-from-label')).not.toBeInTheDocument();
  });

  it('the label uses a logical layout (no left/right margins), so Arabic mirrors it', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'components', 'BookingSidebar.tsx'), 'utf8');
    const label = source.slice(source.indexOf('export const FromPriceLabel'), source.indexOf('export const BookingFooterTotal'));
    expect(label).toContain("t('price.from')");
    expect(label).not.toMatch(/\b(ml|mr|pl|pr)-\d/);
  });
});

const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });

async function openDrawer(options: unknown[]) {
  mockKeysOnly = true;
  const availableSlotsByDate: Record<string, unknown[]> = {};
  for (let offset = 0; offset < 70; offset += 1) {
    const date = new Date(Date.now() + offset * 86400000);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    availableSlotsByDate[key] = [{ time: '23:30', capacity: 20, booked: 0, available: 20 }];
  }
  global.fetch = jest.fn(async (url: string) => ({
    ok: true,
    json: async () => {
      const href = String(url);
      if (href.includes('/options')) return options;
      if (href.includes('/availability')) return { success: true, availableSlotsByDate, fullyBookedDates: [] };
      if (href.includes('/quote')) {
        // The live-price check at pick time answers with the start time's own price.
        const query = new URLSearchParams(href.split('?')[1]);
        const picked = (options as Array<{ pricingKey: string; timeSlots: Array<{ time: string; price: number }> }>)
          .find((candidate) => candidate.pricingKey === query.get('optionKey'))
          ?.timeSlots.find((candidate) => candidate.time === query.get('time'));
        const adult = picked?.price ?? 0;
        return { quote: { prices: { adult, child: Math.round(adult * 50) / 100, infant: 0 }, version: 1, source: 'catalogue' } };
      }
      return { success: true, data: { days: {}, stopSaleStatus: 'none', stoppedOptionIds: [] } };
    },
  })) as unknown as typeof fetch;
  HTMLElement.prototype.scrollTo = jest.fn();
  HTMLElement.prototype.scrollIntoView = jest.fn();
  const tour = {
    _id: 'tour-one', id: 'tour-one', title: 'Makadi Bay ATV', image: '/tour.jpg', discountPrice: 29.78, price: 29.78,
    bookingOptions: options,
    availability: { type: 'daily', availableDays: [0, 1, 2, 3, 4, 5, 6], slots: [{ time: '23:30', capacity: 20 }] },
  };
  render(<BookingSidebar isOpen onClose={jest.fn()} tour={tour as never} />);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
  const heading = screen.getByText('booking.perPersonShort').parentElement as HTMLElement;
  const headingText = heading.textContent;
  fireEvent.click(screen.getByRole('button', { name: 'booking.chooseDate' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument());
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
  return headingText;
}

describe('heading, cards and footer agree in the drawer', () => {
  afterEach(() => { mockKeysOnly = false; });
  const perTime = {
    id: 'per-time', pricingKey: 'per-time', label: 'Without transfer', type: 'Per Person', price: 0,
    timeSlots: [{ time: '05:00', price: 29.78 }, { time: '08:00', price: 23.01 }, { time: '10:00', price: 21.66 }, { time: '12:00', price: 29.78 }],
  };
  const based = {
    id: 'based', pricingKey: 'based', label: 'With transfer', type: 'Per Person', price: 29.78,
    timeSlots: [{ time: '05:00', price: 29.78 }],
  };

  it('before a pick: heading $21.66 per person, the card and the footer "From $21.66"', async () => {
    const heading = await openDrawer([perTime, based]);
    expect(heading).toContain('$21.66');
    const footer = screen.getByTestId('booking-footer-total');
    expect(footer).toHaveTextContent('price.from');
    expect(footer).toHaveTextContent('$21.66');
    expect(footer).not.toHaveTextContent('$29.78');
    const fromBoxes = document.querySelectorAll('[data-price-state="from"]');
    expect(fromBoxes).toHaveLength(1);
    expect(fromBoxes[0]).toHaveTextContent('$21.66');
    // The single-price option shows its plain price.
    expect(document.querySelectorAll('[data-price-state="exact"]')[0]).toHaveTextContent('$29.78');
  });

  it('after a pick: the picked start time drives card and footer, no "From"', async () => {
    await openDrawer([perTime, based]);
    const card = document.querySelector('[data-price-state="from"]')!.closest('div.border-2') as HTMLElement;
    const header = within(card).getAllByRole('button').find((node) => node.getAttribute('aria-expanded') === 'false');
    if (header) fireEvent.click(header);
    fireEvent.click(within(card).getByRole('button', { name: /booking\.selectTime/ }));
    fireEvent.click(within(card).getByRole('option', { name: /12:00/ }));
    const footer = screen.getByTestId('booking-footer-total');
    await waitFor(() => expect(footer).toHaveTextContent('$29.78'));
    expect(footer).not.toHaveTextContent('price.from');
    expect(within(card).queryByTestId('price-from-label')).not.toBeInTheDocument();
    expect(within(card).getAllByText('$29.78').length).toBeGreaterThan(0);
  });
});
