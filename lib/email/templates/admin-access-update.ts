import type { EmailSpec } from '../layout';
import type { AdminAccessUpdateEmailData } from '../type';
import { brandOf, sections, type WithBrand } from './shared';

const HEADLINE: Record<AdminAccessUpdateEmailData['action'], string> = {
  activated: 'Your admin access was restored',
  deactivated: 'Your admin access was paused',
  permissions_updated: 'Your admin permissions changed',
  deleted: 'Your admin access was removed',
};

export function adminAccessUpdate(data: WithBrand<AdminAccessUpdateEmailData>): EmailSpec {
  const by = data.updatedBy || 'An administrator';
  const explanation: Record<AdminAccessUpdateEmailData['action'], string> = {
    activated: `${by} reactivated your admin privileges. You can sign in again using the button below.`,
    deactivated: `${by} temporarily removed your admin access. You will not be able to sign in until your permissions are restored.`,
    permissions_updated: `${by} updated your admin permissions. Your new access level is already in effect.`,
    deleted: `${by} permanently removed your admin account. You no longer have access to the admin portal, and your credentials have been deleted.`,
  };

  // Only an account that can still sign in gets a portal button — a removed or
  // paused admin would meet a rejection, so the button is omitted rather than
  // shipped as a control that cannot work.
  const canSignIn = data.action === 'activated' || data.action === 'permissions_updated';

  return {
    preheader: explanation[data.action].slice(0, 90),
    brand: brandOf(data),
    statusLabel: 'Access update',
    statusTone: data.action === 'deleted' || data.action === 'deactivated' ? 'negative' : 'warning',
    headline: HEADLINE[data.action],
    summary: `Hello ${data.inviteeName}, here is what changed on your admin account.`,
    facts: {
      eyebrow: 'Account',
      rows: [{ label: 'Email', value: data.inviteeEmail, ltr: true }],
    },
    sections: sections(
      { kind: 'note', title: 'What changed', body: [explanation[data.action]] },
      data.action === 'permissions_updated' && data.permissions?.length
        ? { kind: 'list', title: 'Your current permissions', items: data.permissions }
        : null,
    ),
    cta: canSignIn ? { label: 'Go to admin portal', url: data.portalLink } : undefined,
    helpText: 'If you believe this change was made in error, reply to this email and we will sort it out quickly.',
    footerReason: `You are receiving this because your ${data.companyName} admin access changed.`,
  };
}
