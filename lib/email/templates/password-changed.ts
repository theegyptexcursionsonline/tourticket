import type { EmailSpec } from '../layout';
import type { PasswordChangedEmailData } from '../type';
import { brandOf, rows, siteUrl, type WithBrand } from './shared';

export function passwordChanged(data: WithBrand<PasswordChangedEmailData>): EmailSpec {
  const viaReset = data.method === 'reset-link';
  return {
    preheader: 'If this was not you, tell us straight away — your account may be at risk.',
    brand: brandOf(data),
    statusLabel: 'Security',
    statusTone: 'warning',
    headline: 'Your password was changed',
    summary: viaReset
      ? `Hi ${data.customerName}, your password was just changed using a reset link. You can sign in with it now.`
      : `Hi ${data.customerName}, your password was just changed from your account settings.`,
    facts: {
      eyebrow: 'Account',
      rows: rows(
        { label: 'Email', value: data.customerEmail, ltr: true },
        { label: 'Changed at', value: data.changedAt, ltr: true },
      ),
    },
    sections: [
      {
        kind: 'note',
        tone: 'warning',
        title: 'Was this you?',
        body: [
          'If you made this change, no further action is needed.',
          'If you did not, reply to this email immediately and reset your password again — someone else may have access to your inbox.',
        ],
      },
    ],
    cta: { label: 'Sign in', url: siteUrl(data, '/login') },
    helpText: 'We never ask for your password by email.',
    footerReason: 'You are receiving this security notice because the password on your account changed.',
  };
}
