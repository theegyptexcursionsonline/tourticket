import { deliverCheckoutNotifications } from '@/lib/bookings/checkoutNotificationDelivery';

describe('deliverCheckoutNotifications', () => {
  it('keeps a successful customer delivery successful when the operator email fails', async () => {
    const sendCustomer = jest.fn().mockResolvedValue(undefined);
    const sendOperator = jest.fn().mockRejectedValue(new Error('operator transport down'));
    const onFailure = jest.fn().mockResolvedValue(undefined);

    await expect(deliverCheckoutNotifications({ sendCustomer, sendOperator, onFailure }))
      .resolves.toEqual({ customer: 'sent', operator: 'failed' });

    expect(sendCustomer).toHaveBeenCalledTimes(1);
    expect(sendOperator).toHaveBeenCalledTimes(1);
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure).toHaveBeenCalledWith('operator', expect.any(Error));
  });

  it('still attempts the operator notification when the customer email fails', async () => {
    const sendCustomer = jest.fn().mockRejectedValue(new Error('customer transport down'));
    const sendOperator = jest.fn().mockResolvedValue(undefined);
    const onFailure = jest.fn().mockResolvedValue(undefined);

    await expect(deliverCheckoutNotifications({ sendCustomer, sendOperator, onFailure }))
      .resolves.toEqual({ customer: 'failed', operator: 'sent' });

    expect(sendOperator).toHaveBeenCalledTimes(1);
    expect(onFailure).toHaveBeenCalledWith('customer', expect.any(Error));
  });
});
