import type { EmailSpec } from '../layout';
import type { AdminInviteEmailData } from '../type';
import { brandOf, rows, sections, type WithBrand } from './shared';

export function adminInvite(data: WithBrand<AdminInviteEmailData>): EmailSpec {
  return {
    preheader: `Set your password to open the ${data.companyName} admin portal as ${data.role}.`,
    brand: brandOf(data),
    statusLabel: 'Team invite',
    statusTone: 'positive',
    headline: `Hi ${data.inviteeName}, you're invited`,
    summary: `${data.inviterName} invited you to help manage ${data.companyName}. Accept the invitation below to set your password and get started.`,
    facts: {
      eyebrow: 'Your account',
      rows: rows(
        { label: 'Email', value: data.inviteeEmail, ltr: true },
        { label: 'Role', value: data.role },
        data.temporaryPassword
          ? { label: 'Temporary password', value: data.temporaryPassword, ltr: true, strong: true }
          : null,
      ),
    },
    sections: sections(
      data.temporaryPassword
        ? {
          kind: 'note',
          tone: 'warning',
          title: 'Use it once',
          body: ['Sign in with the temporary password above, then set your own password immediately. This invitation link expires in 7 days.'],
        }
        : {
          kind: 'note',
          tone: 'warning',
          title: 'Security notice',
          body: ['This invitation link expires in 7 days. Please accept it as soon as possible.'],
        },
      data.permissions?.length
        ? { kind: 'list', title: 'Your access permissions', items: data.permissions }
        : null,
    ),
    cta: { label: 'Accept invitation', url: data.portalLink },
    helpText: 'Did not expect this invitation? Reply to this email and we will revoke it.',
    footerReason: `You are receiving this because ${data.inviterName} invited this address to the ${data.companyName} admin portal.`,
  };
}
