import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import StripePaymentForm from '@/components/StripePaymentForm';
import type { AuthoritativePriceQuote } from '@/lib/cart/authoritativeCart';

jest.mock('@stripe/stripe-js', () => ({ loadStripe: jest.fn(() => Promise.resolve({})) }));
jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PaymentElement: () => <div>Payment element</div>,
  useStripe: () => null,
  useElements: () => null,
}));
jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    formatPrice: (price: number) => `$${price.toFixed(2)}`,
    selectedCurrency: { code: 'USD' },
  }),
}));
jest.mock('@/lib/checkout/checkoutAttempt', () => ({
  getOrCreateCheckoutAttemptId: () => '123e4567-e89b-42d3-a456-426614174000',
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn(), loading: jest.fn() },
}));

const quote: AuthoritativePriceQuote = {
  tourId: '507f1f77bcf86cd799439011',
  tourTitle: 'Nile Sunset Cruise',
  optionKey: 'premium-evening',
  date: '2026-08-01',
  time: '18:00',
  currency: 'USD',
  prices: { adult: 126, child: 70, infant: 5 },
  version: 4,
  executionId: 'execution-4',
  overrideId: 'override-4',
  source: 'override',
};

describe('StripePaymentForm price-change recovery', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      status: 409,
      ok: false,
      json: async () => ({ success: false, code: 'PRICE_CHANGED', quote }),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('stops payment and requires explicit acceptance of the server quote', async () => {
    const onPriceChanged = jest.fn().mockResolvedValue(true);
    render(
      <StripePaymentForm
        amount={100}
        currency="USD"
        customer={{ email: 'guest@example.com', firstName: 'Guest', lastName: 'Customer' }}
        cart={[{
          id: quote.tourId,
          selectedDate: quote.date,
          selectedTime: quote.time,
          quantity: 1,
          childQuantity: 1,
          infantQuantity: 1,
          selectedBookingOption: { id: 'option-0', pricingKey: quote.optionKey },
          guestPrices: { adult: 100, child: 50, infant: 0 },
          priceVersion: 3,
        }]}
        pricing={{ total: 100, currency: 'USD' }}
        onSuccess={jest.fn()}
        onError={jest.fn()}
        onPriceChanged={onPriceChanged}
      />,
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1600);
    });

    expect(await screen.findByText('Your price was updated')).toBeInTheDocument();
    expect(screen.getByText('$126.00')).toBeInTheDocument();
    expect(screen.getByText('$70.00')).toBeInTheDocument();
    expect(screen.getByText('$5.00')).toBeInTheDocument();
    expect(screen.queryByText('Payment element')).not.toBeInTheDocument();
    expect(onPriceChanged).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /accept updated price & continue/i }));
    await waitFor(() => expect(onPriceChanged).toHaveBeenCalledWith(quote));
  });

  it('keeps the review state open when the updated quote cannot be persisted', async () => {
    const onPriceChanged = jest.fn().mockResolvedValue(false);
    render(
      <StripePaymentForm
        amount={100}
        currency="USD"
        customer={{ email: 'guest@example.com', firstName: 'Guest', lastName: 'Customer' }}
        cart={[{
          id: quote.tourId,
          selectedDate: quote.date,
          selectedTime: quote.time,
          quantity: 1,
          selectedBookingOption: { id: 'option-0', pricingKey: quote.optionKey },
          priceVersion: 3,
        }]}
        pricing={{ total: 100, currency: 'USD' }}
        onSuccess={jest.fn()}
        onError={jest.fn()}
        onPriceChanged={onPriceChanged}
      />,
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1600);
    });

    fireEvent.click(await screen.findByRole('button', { name: /accept updated price & continue/i }));
    expect(await screen.findByText(/your original cart is unchanged/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /accept updated price & continue/i })).toBeInTheDocument();
  });
});
