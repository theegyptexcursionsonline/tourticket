import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/components/StripePaymentForm', () => ({
  __esModule: true,
  default: ({ experience }: { experience: string }) => <div>Payment experience: {experience}</div>,
}));

import ConfiguredStripePaymentForm from '@/components/ConfiguredStripePaymentForm';

const props = {
  amount: 108,
  currency: 'USD',
  customer: { email: 'guest@example.com', firstName: 'Guest', lastName: 'Customer', phone: '+201000000000' },
  cart: [{ id: '507f1f77bcf86cd799439011' }],
  pricing: { total: 108 },
  onSuccess: jest.fn(),
  onError: jest.fn(),
  onPriceChanged: jest.fn(),
};

describe('ConfiguredStripePaymentForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['inline', 'modal', 'hosted'])('renders the administrator-selected %s mode', async (experience) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, paymentExperience: experience }),
    }) as jest.Mock;
    render(<ConfiguredStripePaymentForm {...props} />);
    expect(await screen.findByText(`Payment experience: ${experience}`)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith('/api/checkout/config', expect.objectContaining({ cache: 'no-store' }));
  });

  it('fails closed and lets the customer retry when configuration cannot be loaded', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Configuration unavailable' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, paymentExperience: 'modal' }),
      }) as jest.Mock;
    render(<ConfiguredStripePaymentForm {...props} />);
    expect(await screen.findByText('Secure checkout is temporarily unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/Payment experience:/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('Payment experience: modal')).toBeInTheDocument());
  });
});
