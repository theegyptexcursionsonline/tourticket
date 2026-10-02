import { fireEvent, render, screen } from '@testing-library/react';
import PaymentReconciliationNotice from '@/components/PaymentReconciliationNotice';
describe('received payment awaiting booking confirmation', () => {
  it('shows truthful processing and a confirmation retry, not another payment action', () => {
    const retry = jest.fn();
    render(<PaymentReconciliationNotice checking={false} onRetry={retry} />);
    expect(screen.getByRole('status')).toHaveTextContent('Booking confirmation is still being checked. Do not pay again.');
    fireEvent.click(screen.getByRole('button', { name: 'Check confirmation again' }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Booking confirmed!')).not.toBeInTheDocument();
  });
  it('disables repeat requests while the same paid checkout is being checked, then permits retry after failure', () => {
    const retry = jest.fn();
    const view = render(<PaymentReconciliationNotice checking onRetry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Checking confirmation...' }));
    expect(retry).not.toHaveBeenCalled();
    view.rerender(<PaymentReconciliationNotice checking={false} onRetry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Check confirmation again' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
