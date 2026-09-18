/**
 * `sendBookingConfirmation` used to treat ANY throw as "the attachments were
 * the problem" and immediately re-send the whole email without them. A Mailgun
 * timeout that followed acceptance therefore put a SECOND confirmation in the
 * customer's inbox, and the retry silently dropped the QR voucher and the
 * receipt PDF — the actual ticket — with nothing recorded.
 */
jest.mock('@/lib/mailgun', () => ({
  __esModule: true,
  sendEmail: jest.fn(),
  isValidEmailAddress: (value: unknown) => typeof value === 'string' && /.+@.+\..+/.test(value),
  InvalidRecipientError: class extends Error {},
}));
jest.mock('@/lib/utils/qrcode', () => ({
  __esModule: true,
  generateBookingVerificationURL: (id: string) => `https://egypt-excursionsonline.com/booking/verify/${id}`,
  generateQRCodeBuffer: jest.fn().mockResolvedValue(Buffer.from('qr')),
}));
jest.mock('@/lib/utils/generateReceiptPdf', () => ({
  __esModule: true,
  generateReceiptPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')),
}));

import { EmailService } from '@/lib/email/emailService';
import { sendEmail } from '@/lib/mailgun';
import { SAMPLES } from '../sampleData';

const send = sendEmail as jest.Mock;
const booking = () => ({ ...SAMPLES['booking-confirmation'].data }) as Record<string, unknown>;

function providerError(status: number, message: string) {
  return Object.assign(new Error(message), { status });
}

describe('sendBookingConfirmation delivery', () => {
  beforeEach(() => {
    send.mockReset();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('sends once, with the QR code and the receipt PDF attached', async () => {
    send.mockResolvedValue(undefined);
    await EmailService.sendBookingConfirmation(booking() as never);

    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0][0];
    expect(message.inlineAttachments).toHaveLength(1);
    expect(message.attachments).toHaveLength(1);
    expect(message.text).toContain('EEO-10421');
  });

  it('does NOT re-send after a transport timeout — that would double-mail a booking', async () => {
    send.mockRejectedValue(Object.assign(new Error('socket hang up'), { name: 'TimeoutError' }));

    await expect(EmailService.sendBookingConfirmation(booking() as never)).rejects.toThrow('socket hang up');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('does NOT re-send after a rejected recipient', async () => {
    send.mockRejectedValue(providerError(400, "'to' parameter is not a valid address"));

    await expect(EmailService.sendBookingConfirmation(booking() as never)).rejects.toThrow();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('retries without attachments ONLY when the attachments were rejected', async () => {
    send
      .mockRejectedValueOnce(providerError(413, 'Request Entity Too Large: attachment size exceeded'))
      .mockResolvedValueOnce(undefined);

    await EmailService.sendBookingConfirmation(booking() as never);

    expect(send).toHaveBeenCalledTimes(2);
    const retry = send.mock.calls[1][0];
    expect(retry.attachments).toBeUndefined();
    expect(retry.inlineAttachments).toBeUndefined();
    // Tagged separately so a degraded send is findable in Mailgun analytics.
    expect(retry.type).toBe('booking-confirmation-degraded');
    // The retry must not point at a QR image it no longer carries.
    expect(retry.html).not.toContain('cid:booking-qr-code');
    // ...but the reference the guest is checked in with survives.
    expect(retry.text).toContain('EEO-10421');
  });

  it('records the degraded send loudly instead of swallowing it', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    send
      .mockRejectedValueOnce(providerError(413, 'attachment too large'))
      .mockResolvedValueOnce(undefined);

    await EmailService.sendBookingConfirmation(booking() as never);

    const logged = error.mock.calls.flat().join(' ');
    expect(logged).toContain('EEO-10421');
    expect(logged).toMatch(/manual resend/i);
  });

  it('tells the truth in the success log about what was actually attached', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { generateQRCodeBuffer } = jest.requireMock('@/lib/utils/qrcode');
    const { generateReceiptPdf } = jest.requireMock('@/lib/utils/generateReceiptPdf');
    generateQRCodeBuffer.mockRejectedValueOnce(new Error('qr generator down'));
    generateReceiptPdf.mockRejectedValueOnce(new Error('pdf generator down'));
    send.mockResolvedValue(undefined);

    await EmailService.sendBookingConfirmation(booking() as never);

    const logged = log.mock.calls.flat().join(' ');
    expect(logged).toContain('qr=no');
    expect(logged).toContain('receipt=no');
    expect(logged).not.toMatch(/with QR code and receipt PDF attached/);
  });

  it('refuses a malformed recipient before touching the transport', async () => {
    await expect(
      EmailService.sendBookingConfirmation({ ...booking(), customerEmail: 'not-an-address' } as never),
    ).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});
