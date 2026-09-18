// lib/email/render.ts
//
// Turn an email type plus its data into a finished message. Deliberately free
// of any transport import so the renderer can be exercised — and previewed —
// without a Mailgun key, and so `lib/mailgun.ts` can render without a cycle.

import { renderEmail } from './layout';
import { TemplateEngine } from './templateEngine';
import { buildSpec, type BrandDefaults } from './templates';
import type { EmailTemplate, EmailType } from './type';

/**
 * Subject lines stay exactly as they were: plain-text Handlebars strings whose
 * HTML entities are decoded afterwards. That decode is correct for a header.
 */
const SUBJECTS: Record<EmailType, string> = {
  'booking-confirmation': '🎉 Booking Confirmed - {{tourTitle}}',
  'payment-confirmation': '✅ Payment Confirmed - {{tourTitle}}',
  'payment-failed': 'Action needed - your payment did not go through',
  'bank-transfer-instructions': '🏦 Bank Transfer Instructions - {{tourTitle}}',
  'trip-reminder': '⏰ Your Trip is Tomorrow - {{tourTitle}}',
  'trip-completion': '🌟 Thank You for Traveling with Us!',
  'booking-cancellation': '❌ Booking Cancelled - {{tourTitle}}',
  'booking-update': '📢 Booking Status Update - {{tourTitle}}',
  'refund-issued': 'Refund issued - {{tourTitle}}',
  welcome: '🎊 Welcome to {{companyName}}!',
  'password-reset': 'Reset your {{companyName}} password',
  'password-changed': 'Your {{companyName}} password was changed',
  'enquiry-received': 'We have your message - {{enquiryReference}}',
  'admin-booking-alert': '📋 New Booking Alert - {{tourTitle}}',
  'admin-invite': "You've been invited to manage {{companyName}}",
  'admin-access-update': 'Your admin access has been {{action}}',
  'operator-booking-update': '🔔 Booking Updated - {{bookingId}} - {{tourTitle}}',
};

const DEFAULT_WEBSITE = 'https://egypt-excursionsonline.com';

/**
 * Brand identity merged under every template's own data. A white-label booking
 * overrides these so the confirmation goes out under the brand the customer
 * actually bought from.
 */
export function defaultBrandData(baseUrl?: string): BrandDefaults {
  const website = baseUrl || process.env.NEXT_PUBLIC_BASE_URL || DEFAULT_WEBSITE;
  const normalizedWebsite = website.startsWith('http') ? website : `https://${website}`;

  return {
    companyName: 'Egypt Excursions Online',
    companyLogo: `${normalizedWebsite.replace(/\/$/, '')}/EEO-logo.png`,
    primaryColor: '#dc2626',
    secondaryColor: '#0f172a',
    accentColor: '#f97316',
    contactEmail: 'booking@egypt-excursionsonline.com',
    contactPhone: '+20 11 42255624',
    supportEmail: 'booking@egypt-excursionsonline.com',
    website: normalizedWebsite,
    year: new Date().getFullYear(),
  };
}

/** Render one message to its subject, HTML part and plain-text alternative. */
export function renderEmailTemplate<T extends object>(type: EmailType, data: T): EmailTemplate {
  const baseUrl = 'baseUrl' in data && typeof data.baseUrl === 'string' && data.baseUrl
    ? data.baseUrl
    : undefined;
  // A caller writing `companyName: brand?.name` hands us an explicit
  // `undefined`; spreading that would blank the default instead of falling back
  // to it, so undefined keys are dropped before the merge.
  const overrides = Object.fromEntries(
    Object.entries(data as Record<string, unknown>).filter(([, value]) => value !== undefined),
  );
  const templateData = { ...defaultBrandData(baseUrl), ...overrides } as T & BrandDefaults;
  const spec = buildSpec(type, templateData);
  const { html, text } = renderEmail(spec);
  const subject = TemplateEngine.generateSubject(SUBJECTS[type], templateData);
  return { subject, html, text };
}

export { SUBJECTS };
