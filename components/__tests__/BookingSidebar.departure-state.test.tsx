import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TourOptionCard, CalendarWidget } from '../BookingSidebar';

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

const option = { id: 'option-owned', title: 'Shared tour', price: 10, duration: '5 hours', languages: ['English'], description: 'A guided tour', timeSlots: [] };
const tour = { title: 'Tour', image: '/tour.jpg', discountPrice: 10 };
const props = { option, tour, onSelect: jest.fn(), selectedTimeSlot: null, adults: 1, childCount: 0, infantCount: 0 };
const emptyMessage = 'No departures are available for this date. Please choose another date.';

it('shows an honest next action for a date whose departures have all elapsed, without a selection prompt', () => {
  render(<TourOptionCard {...props} />);
  expect(screen.getByText(emptyMessage)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Available departure times' })).toBeInTheDocument();
  expect(screen.queryByText('Select one to continue')).not.toBeInTheDocument();
  expect(screen.queryByText('Available Times Today')).not.toBeInTheDocument();
  expect(props.onSelect).not.toHaveBeenCalled();
});
it('keeps a future date departure selectable and uses a date-neutral heading', () => {
  const slot = { id: 'slot-owned', optionId: option.id, time: '08:00', available: 3, price: 10 };
  const onSelect = jest.fn();
  render(<TourOptionCard {...props} option={{ ...option, timeSlots: [slot] }} onSelect={onSelect} />);
  expect(screen.getByRole('heading', { name: 'Available departure times' })).toBeInTheDocument();
  expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument();
  expect(screen.getByText('Select one to continue')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /08:00/ }));
  expect(onSelect).toHaveBeenCalledWith(slot);
});
it('preserves the known stop-sale reason instead of replacing it with a guessed cause', () => {
  render(<TourOptionCard {...props} option={{ ...option, isStopSaleBlocked: true, stopSaleReason: 'Operator closed this date' }} />);
  expect(screen.getByText('Operator closed this date')).toBeInTheDocument();
  expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument();
  expect(screen.queryByText('Select one to continue')).not.toBeInTheDocument();
});

describe('opening an option reveals its departure section', () => {
  let frame: FrameRequestCallback | undefined;
  beforeEach(() => {
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 1; });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => { frame = undefined; });
  });
  afterEach(() => { jest.restoreAllMocks(); frame = undefined; });

  it.each([false, true])('scrolls only the drawer after expansion, respecting reduced motion %s', reduced => {
    (window.matchMedia as jest.Mock).mockReturnValue({ matches: reduced });
    const toggle = jest.fn();
    const renderCard = (expanded: boolean) => <div data-testid="booking-drawer-scroll-region"><TourOptionCard {...props} collapsible expanded={expanded} onToggleExpanded={toggle} /></div>;
    const { rerender } = render(renderCard(false));
    const region = screen.getByTestId('booking-drawer-scroll-region');
    const scrollTo = jest.fn();
    region.scrollTo = scrollTo;
    region.scrollTop = 100;
    jest.spyOn(region, 'getBoundingClientRect').mockReturnValue({ top: 120 } as DOMRect);
    const departureSection = screen.getByRole('heading', { name: 'Available departure times', hidden: true }).parentElement!.parentElement!;
    jest.spyOn(departureSection, 'getBoundingClientRect').mockReturnValue({ top: 420 } as DOMRect);
    expect(frame).toBeUndefined();
    fireEvent.keyDown(screen.getByRole('button', { name: /Shared tour/ }), { key: reduced ? ' ' : 'Enter' });
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(scrollTo).not.toHaveBeenCalled();
    rerender(renderCard(true));
    frame?.(0);
    expect(scrollTo).toHaveBeenCalledWith({ top: 384, behavior: reduced ? 'auto' : 'smooth' });
    expect(document.activeElement).toBe(document.body);
    fireEvent.click(screen.getByRole('button', { name: /Shared tour/ }));
    rerender(renderCard(false));
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it('does not scroll an initially expanded card or a programmatic expansion', () => {
    const { rerender } = render(<TourOptionCard {...props} collapsible expanded />);
    expect(frame).toBeUndefined();
    rerender(<TourOptionCard {...props} collapsible expanded={false} />);
    rerender(<TourOptionCard {...props} collapsible expanded />);
    expect(frame).toBeUndefined();
  });
});

describe('calendar admission states', () => {
  beforeEach(() => { jest.useFakeTimers().setSystemTime(new Date('2026-10-02T12:00:00Z')); });
  afterEach(() => jest.useRealTimers());
  it('disables a fully unavailable day and exposes a future selectable day', () => {
    const onDateSelect = jest.fn();
    render(<CalendarWidget selectedDate={null} onDateSelect={onDateSelect} availabilityData={{ '2026-10-02': 'full', '2026-10-03': 'high' }} />);
    const closed = screen.getByRole('button', { name: '2 — booking.unavailable' });
    expect(closed).toBeDisabled();
    expect(screen.getByText('No departures are available today. Please choose another available date.')).toBeInTheDocument();
    fireEvent.click(closed);
    expect(onDateSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(onDateSelect).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '4' })).toBeDisabled();
  });
  it('moves from January 31 to February and offers only loaded next dates', () => {
    jest.setSystemTime(new Date('2026-01-31T12:00:00Z'));
    const onMonthChange = jest.fn();
    render(<CalendarWidget selectedDate={null} onDateSelect={jest.fn()} onMonthChange={onMonthChange} availabilityData={{ '2026-01-31': 'high' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(onMonthChange.mock.calls[0][0].getMonth()).toBe(1);
    expect(onMonthChange.mock.calls[0][0].getDate()).toBe(1);
    expect(screen.queryByRole('button', { name: /Next available date:/ })).not.toBeInTheDocument();
  });
  it('does not offer calendar dates while availability is loading', () => {
    render(<CalendarWidget selectedDate={null} onDateSelect={jest.fn()} hasLoadedStopSales={false} />);
    expect(screen.getByLabelText('Loading availability')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '3' })).not.toBeInTheDocument();
  });
});
