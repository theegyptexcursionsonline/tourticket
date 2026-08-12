import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/components/admin/withAuth', () => ({
  __esModule: true,
  default: (component: React.ComponentType) => component,
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

import CheckoutSettingsPage from '@/app/admin/checkout-settings/page';

describe('admin checkout payment experience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { paymentExperience: 'modal', updatedAt: null } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { paymentExperience: 'hosted', updatedAt: null } }),
      }) as jest.Mock;
  });

  it('shows all three modes and publishes only an explicit administrator change', async () => {
    render(<CheckoutSettingsPage />);
    expect(await screen.findByRole('heading', { name: 'Inline payment' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Secure payment modal' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Stripe-hosted Checkout' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: /stripe-hosted checkout/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Save & publish' }));

    await waitFor(() => expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/admin/checkout-settings',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ paymentExperience: 'hosted' }),
      }),
    ));
    expect(await screen.findByRole('button', { name: 'Saved' })).toBeDisabled();
  });
});
