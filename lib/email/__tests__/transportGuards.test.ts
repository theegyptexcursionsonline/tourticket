/**
 * `sendEmail` performed no recipient validation at all, and
 * `sendContactFormEmail` asserted `process.env.ADMIN_NOTIFICATION_EMAIL!` —
 * an unset variable reached the provider as the literal string "undefined".
 *
 * The Mailgun client itself is mocked, so nothing here can send.
 */
const create = jest.fn().mockResolvedValue({ id: '<test@mailgun>' });
jest.mock('mailgun.js', () => ({
  __esModule: true,
  default: class {
    client() { return { messages: { create } }; }
  },
}));
jest.mock('form-data', () => ({ __esModule: true, default: class {} }));

import { sendEmail, sendContactFormEmail, sendPasswordResetEmail, isValidEmailAddress } from '@/lib/mailgun';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  create.mockClear();
  process.env.MAILGUN_API_KEY = 'key-test-not-a-real-key';
  process.env.MAILGUN_DOMAIN = 'mail.example.test';
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  jest.restoreAllMocks();
});

const message = {
  subject: 'Test',
  html: '<p>Test</p>',
  text: 'Test',
  type: 'test',
};

describe('recipient validation', () => {
  it.each([
    ['an empty string', ''],
    ['whitespace', '   '],
    ['the literal "undefined"', 'undefined'],
    ['a bare name', 'not-an-address'],
    ['a missing TLD', 'someone@localhost'],
    ['a header-injection attempt', 'a@b.com\nbcc: victim@example.com'],
  ])('refuses %s before contacting the provider', async (_label, to) => {
    await expect(sendEmail({ ...message, to })).rejects.toThrow(/recipient/i);
    expect(create).not.toHaveBeenCalled();
  });

  it('accepts a real address and sends both parts', async () => {
    await sendEmail({ ...message, to: 'traveller@example.com' });

    expect(create).toHaveBeenCalledTimes(1);
    const payload = create.mock.calls[0][1];
    expect(payload.to).toEqual(['traveller@example.com']);
    expect(payload.text).toBe('Test');
    expect(payload.html).toBe('<p>Test</p>');
  });

  it('validates cc, bcc and reply-to too', async () => {
    await expect(sendEmail({ ...message, to: 'a@example.com', cc: 'bad' })).rejects.toThrow(/cc/i);
    await expect(sendEmail({ ...message, to: 'a@example.com', bcc: 'bad' })).rejects.toThrow(/bcc/i);
    await expect(sendEmail({ ...message, to: 'a@example.com', replyTo: 'bad' })).rejects.toThrow(/reply-to/i);
    expect(create).not.toHaveBeenCalled();
  });
});

describe('sender identity', () => {
  it('sends under the brand name the caller supplies', async () => {
    await sendEmail({ ...message, to: 'a@example.com', fromName: 'El Gouna Excursions' });
    expect(create.mock.calls[0][1].from).toMatch(/^El Gouna Excursions </);
  });

  it('cannot be used to inject a header through the display name', async () => {
    await sendEmail({ ...message, to: 'a@example.com', fromName: 'Evil\r\nBcc: victim@example.com' });
    const from = create.mock.calls[0][1].from as string;
    // The security property is that the header stays on ONE line: without a
    // line break the rest is inert text inside the display name.
    expect(from).not.toMatch(/[\r\n]/);
    expect(from).not.toContain('<victim@example.com>');
    expect(from.endsWith('<booking@egypt-excursionsonline.com>')).toBe(true);
  });

  it('falls back to the platform name when the brand name is unusable', async () => {
    await sendEmail({ ...message, to: 'a@example.com', fromName: '   ' });
    expect(create.mock.calls[0][1].from).toMatch(/^Egypt Excursions Online </);
  });
});

describe('sendContactFormEmail', () => {
  it('refuses to send when the operations inbox is not configured', async () => {
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
    await expect(
      sendContactFormEmail({ name: 'Amira', fromEmail: 'traveller@example.com', message: 'Hello' }),
    ).rejects.toThrow(/ADMIN_NOTIFICATION_EMAIL/);
    expect(create).not.toHaveBeenCalled();
  });

  it('escapes the submitted message and carries the reference on both parts', async () => {
    process.env.ADMIN_NOTIFICATION_EMAIL = 'ops@example.com';
    await sendContactFormEmail({
      name: 'Amira',
      fromEmail: 'traveller@example.com',
      message: '<script>alert(1)</script>',
      reference: 'ENQ-20260918-A1B2C3',
    });

    const payload = create.mock.calls[0][1];
    expect(payload.html).not.toContain('<script>');
    expect(payload.html).toContain('&lt;script&gt;');
    expect(payload.subject).toContain('ENQ-20260918-A1B2C3');
    expect(payload.text).toContain('ENQ-20260918-A1B2C3');
  });
});

describe('sendPasswordResetEmail', () => {
  it('renders through the shared layout, with a text part and a dark-mode rule', async () => {
    await sendPasswordResetEmail('traveller@example.com', 'https://egypt-excursionsonline.com/reset?token=abc');

    const payload = create.mock.calls[0][1];
    expect(payload.html).toContain('@media (prefers-color-scheme: dark)');
    expect(payload.html).toContain('<!--[if mso]>');
    expect(payload.text).toContain('https://egypt-excursionsonline.com/reset?token=abc');
  });

  it('escapes a reset URL that carries HTML metacharacters', async () => {
    await sendPasswordResetEmail(
      'traveller@example.com',
      'https://egypt-excursionsonline.com/reset?token=a"><b',
    );
    const html = create.mock.calls[0][1].html as string;
    const href = /href="([^"]*)"[^>]*>Choose a new password/.exec(html)?.[1] ?? '';
    expect(href).not.toContain('"');
    expect(html).not.toContain('"><b');
  });
});

describe('isValidEmailAddress', () => {
  it('accepts ordinary addresses and rejects the shapes that caused incidents', () => {
    expect(isValidEmailAddress('traveller@example.com')).toBe(true);
    expect(isValidEmailAddress('first.last+tag@sub.example.co.uk')).toBe(true);
    expect(isValidEmailAddress(undefined)).toBe(false);
    expect(isValidEmailAddress(null)).toBe(false);
    expect(isValidEmailAddress('')).toBe(false);
    expect(isValidEmailAddress('a@b')).toBe(false);
  });
});
