import type { EmailSpec } from '../layout';
import type { PasswordResetEmailData } from '../type';
import { brandOf, type WithBrand } from './shared';

export function passwordReset(data: WithBrand<PasswordResetEmailData>): EmailSpec {
  return {
    preheader: `The link works once and expires in ${data.expiresInMinutes} minutes.`,
    brand: brandOf(data),
    statusLabel: 'Action required',
    statusTone: 'warning',
    headline: 'Reset your password',
    summary: 'Use the button below to choose a new password. The link works once and then stops working.',
    sections: [
      {
        kind: 'note',
        tone: 'warning',
        title: 'This link expires',
        body: [
          `For your security the link stops working in ${data.expiresInMinutes} minutes, and is invalid once it has been used.`,
          'If you did not ask to reset your password, you can ignore this email — your current password keeps working and nothing has changed.',
        ],
      },
    ],
    cta: { label: 'Choose a new password', url: data.resetUrl },
    helpText: 'Did not request this? Reply to this email and we will look into it.',
    footerReason: 'You are receiving this because a password reset was requested for this address.',
  };
}
