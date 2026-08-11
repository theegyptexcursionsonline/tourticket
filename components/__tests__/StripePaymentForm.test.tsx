import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import StripePaymentForm, { StripeElementsPaymentForm } from '@/components/StripePaymentForm';
import type { AuthoritativePriceQuote } from '@/lib/cart/authoritativeCart';

let mockStripe: { confirmPayment: jest.Mock } | null = null;
let mockElements: { submit: jest.Mock } | null = null;

jest.mock('@stripe/stripe-js', () => ({ loadStripe: jest.fn(() => Promise.resolve({})) }));
jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ExpressCheckoutElement: ({
    onConfirm,
    onReady,
  }: {
    onConfirm: () => void;
    onReady: (event: { availablePaymentMethods: Record<string, boolean> }) => void;
  }) => {
    React.useEffect(() => {
      onReady({ availablePaymentMethods: { googlePay: true } });
    }, [onReady]);
    return <button type="button" onClick={onConfirm}>Mock wallet</button>;
  },
  PaymentElement: () => <div>Payment element</div>,
  useStripe: () => mockStripe,
  useElements: () => mockElements,
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
    mockStripe = null;
    mockElements = null;
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
        customer={{ email: 'guest@example.com', firstName: 'Guest', lastName: 'Customer', phone: '+201000000000' }}
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
    expect(global.fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /continue to secure payment/i }));
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
        customer={{ email: 'guest@example.com', firstName: 'Guest', lastName: 'Customer', phone: '+201000000000' }}
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
    fireEvent.click(screen.getByRole('button', { name: /continue to secure payment/i }));
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

  it('keeps Stripe off the checkout page until the customer opens the dedicated payment step', async () => {
    render(
      <StripePaymentForm
        amount={100}
        currency="USD"
        customer={{ email: 'guest@example.com', firstName: 'Guest', lastName: 'Customer', phone: '+201000000000' }}
        cart={[{ id: quote.tourId, selectedDate: quote.date, selectedTime: quote.time, quantity: 1 }]}
        pricing={{ total: 100, currency: 'USD' }}
        onSuccess={jest.fn()}
        onError={jest.fn()}
        onPriceChanged={jest.fn()}
      />,
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText('Pay securely in the next step')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /secure payment/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Payment element')).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not open payment until required contact details are complete', async () => {
    render(
      <StripePaymentForm
        amount={100}
        currency="USD"
        customer={{ email: 'guest@example.com', firstName: 'Guest', lastName: 'Customer', phone: '' }}
        cart={[{ id: quote.tourId, selectedDate: quote.date, selectedTime: quote.time, quantity: 1 }]}
        pricing={{ total: 100, currency: 'USD' }}
        onSuccess={jest.fn()}
        onError={jest.fn()}
        onPriceChanged={jest.fn()}
        isOpen
      />,
    );

    const continueButton = screen.getByRole('button', { name: /continue to secure payment/i });
    expect(continueButton).toBeDisabled();
    expect(screen.queryByRole('dialog', { name: /secure payment/i })).not.toBeInTheDocument();
    expect(screen.getByText(/complete your name, email, and phone number/i)).toBeInTheDocument();
  });
});

describe('StripeElementsPaymentForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockElements = { submit: jest.fn().mockResolvedValue({}) };
    mockStripe = {
      confirmPayment: jest.fn().mockResolvedValue({
        paymentIntent: { id: 'pi_wallet_success', status: 'succeeded' },
      }),
    };
  });

  it('uses the same guarded Stripe confirmation path for an eligible wallet', async () => {
    const onSuccess = jest.fn();
    const onError = jest.fn();
    render(
      <StripeElementsPaymentForm
        onSuccess={onSuccess}
        onError={onError}
        isProcessing={false}
        setIsProcessing={jest.fn()}
        paymentCompleted={false}
        setPaymentCompleted={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mock wallet' }));

    await waitFor(() => expect(mockElements?.submit).toHaveBeenCalledTimes(1));
    expect(mockStripe?.confirmPayment).toHaveBeenCalledWith(expect.objectContaining({
      elements: mockElements,
      redirect: 'if_required',
    }));
    expect(onSuccess).toHaveBeenCalledWith('pi_wallet_success');
    expect(onError).not.toHaveBeenCalled();
  });

  it('does not confirm or charge when Stripe rejects submitted payment details', async () => {
    mockElements = {
      submit: jest.fn().mockResolvedValue({ error: { message: 'Payment details are incomplete' } }),
    };
    const onError = jest.fn();

    render(
      <StripeElementsPaymentForm
        onSuccess={jest.fn()}
        onError={onError}
        isProcessing={false}
        setIsProcessing={jest.fn()}
        paymentCompleted={false}
        setPaymentCompleted={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /complete payment/i }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Payment details are incomplete'));
    expect(mockStripe?.confirmPayment).not.toHaveBeenCalled();
  });
});
