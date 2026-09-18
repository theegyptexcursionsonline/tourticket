/**
 * Internal operations mail used to go to `ADMIN_NOTIFICATION_EMAIL` no matter
 * whose booking it described. For a white-label brand that did two wrong things
 * at once: the brand's own operator never heard about their booking, and the
 * platform's staff received another company's customer name, email, phone and
 * pickup address.
 */
jest.mock('@/lib/mailgun', () => ({
  __esModule: true,
  sendEmail: jest.fn(),
  isValidEmailAddress: (value: unknown) => typeof value === 'string' && /.+@.+\..+/.test(value),
  InvalidRecipientError: class extends Error {},
}));

import { EmailService } from '@/lib/email/emailService';
import { sendEmail } from '@/lib/mailgun';
import { SAMPLES } from '../sampleData';

const send = sendEmail as jest.Mock;
const ORIGINAL_ENV = { ...process.env };

const alert = (extra: Record<string, unknown> = {}) =>
  ({ ...SAMPLES['admin-booking-alert'].data, ...extra }) as never;
const operatorUpdate = (extra: Record<string, unknown> = {}) =>
  ({ ...SAMPLES['operator-booking-update'].data, ...extra }) as never;

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue(undefined);
  process.env.ADMIN_NOTIFICATION_EMAIL = 'platform-ops@example.com';
  delete process.env.OPERATOR_NOTIFICATION_EMAIL;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  jest.restoreAllMocks();
});

describe('admin booking alert routing', () => {
  it('goes to the platform inbox for the platform’s own tenant', async () => {
    await EmailService.sendAdminBookingAlert(alert({ tenantId: 'default' }));
    expect(send.mock.calls[0][0].to).toBe('platform-ops@example.com');
  });

  it('treats a missing tenantId as the platform tenant', async () => {
    await EmailService.sendAdminBookingAlert(alert());
    expect(send.mock.calls[0][0].to).toBe('platform-ops@example.com');
  });

  it('goes to the brand’s own address for a named tenant', async () => {
    await EmailService.sendAdminBookingAlert(alert({
      tenantId: 'el-gouna',
      notificationEmail: 'ops@elgounaexcursions.example',
      companyName: 'El Gouna Excursions',
    }));

    const message = send.mock.calls[0][0];
    expect(message.to).toBe('ops@elgounaexcursions.example');
    expect(message.fromName).toBe('El Gouna Excursions');
    expect(message.html).toContain('El Gouna Excursions');
    expect(message.html).not.toContain('Egypt Excursions Online');
  });

  it('FAILS CLOSED rather than leaking a brand’s customer to the platform inbox', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});

    await EmailService.sendAdminBookingAlert(alert({ tenantId: 'el-gouna' }));

    expect(send).not.toHaveBeenCalled();
    const logged = error.mock.calls.flat().join(' ');
    expect(logged).toContain('el-gouna');
    expect(logged).toMatch(/must not receive another brand/i);
  });

  it('skips quietly when the platform has no inbox configured', async () => {
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
    await EmailService.sendAdminBookingAlert(alert({ tenantId: 'default' }));
    expect(send).not.toHaveBeenCalled();
  });
});

describe('operator booking update routing', () => {
  it('prefers the operator inbox for the platform tenant', async () => {
    process.env.OPERATOR_NOTIFICATION_EMAIL = 'operations@example.com';
    await EmailService.sendOperatorBookingUpdate(operatorUpdate({ tenantId: 'default' }));
    expect(send.mock.calls[0][0].to).toBe('operations@example.com');
  });

  it('goes to the brand’s own address for a named tenant', async () => {
    process.env.OPERATOR_NOTIFICATION_EMAIL = 'operations@example.com';
    await EmailService.sendOperatorBookingUpdate(operatorUpdate({
      tenantId: 'el-gouna',
      notificationEmail: 'ops@elgounaexcursions.example',
      companyName: 'El Gouna Excursions',
    }));
    expect(send.mock.calls[0][0].to).toBe('ops@elgounaexcursions.example');
  });

  it('fails closed for a named tenant with no address of its own', async () => {
    process.env.OPERATOR_NOTIFICATION_EMAIL = 'operations@example.com';
    await EmailService.sendOperatorBookingUpdate(operatorUpdate({ tenantId: 'el-gouna' }));
    expect(send).not.toHaveBeenCalled();
  });
});

describe('brand identity reaches the subject line', () => {
  it('names the brand, not the platform, in a white-label welcome', async () => {
    await EmailService.sendWelcomeEmail({
      customerName: 'Amira Hassan',
      customerEmail: 'traveller@example.com',
      dashboardLink: 'https://elgounaexcursions.example/user/dashboard',
      companyName: 'El Gouna Excursions',
      supportEmail: 'hello@elgounaexcursions.example',
      baseUrl: 'https://elgounaexcursions.example',
    } as never);

    const message = send.mock.calls[0][0];
    expect(message.subject).toContain('El Gouna Excursions');
    expect(message.subject).not.toContain('Egypt Excursions Online');
    expect(message.text).not.toContain('Egypt Excursions Online');
  });

  it('names the brand in an admin invitation subject', async () => {
    await EmailService.sendAdminInviteEmail({
      inviteeName: 'Sara Kamal',
      inviteeEmail: 'newadmin@example.com',
      inviterName: 'Operations Lead',
      temporaryPassword: '',
      role: 'Operations Manager',
      permissions: ['Manage bookings'],
      portalLink: 'https://elgounaexcursions.example/admin',
      companyName: 'El Gouna Excursions',
    } as never);

    expect(send.mock.calls[0][0].subject).toContain('El Gouna Excursions');
  });

  it('still says Egypt Excursions Online for the platform’s own brand', async () => {
    await EmailService.sendWelcomeEmail({
      customerName: 'Amira Hassan',
      customerEmail: 'traveller@example.com',
      dashboardLink: 'https://egypt-excursionsonline.com/user/dashboard',
    } as never);

    expect(send.mock.calls[0][0].subject).toContain('Egypt Excursions Online');
  });
});
