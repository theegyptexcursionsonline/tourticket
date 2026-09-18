// lib/email/templates/index.ts
//
// The one place that maps an `EmailType` to the content template that builds
// its spec. A template listed here must have a real trigger in this codebase —
// a template nothing sends is the same defect as no template at all.

import type { EmailSpec } from '../layout';
import type { EmailType } from '../type';
import type { BrandDefaults } from './shared';

import { adminAccessUpdate } from './admin-access-update';
import { adminBookingAlert } from './admin-booking-alert';
import { adminInvite } from './admin-invite';
import { bankTransferInstructions } from './bank-transfer-instructions';
import { bookingCancellation } from './booking-cancellation';
import { bookingConfirmation } from './booking-confirmation';
import { bookingUpdate } from './booking-update';
import { enquiryReceived } from './enquiry-received';
import { operatorBookingUpdate } from './operator-booking-update';
import { passwordChanged } from './password-changed';
import { passwordReset } from './password-reset';
import { paymentConfirmation } from './payment-confirmation';
import { paymentFailed } from './payment-failed';
import { refundIssued } from './refund-issued';
import { tripCompletion } from './trip-completion';
import { tripReminder } from './trip-reminder';
import { welcome } from './welcome';

/**
 * Every builder reads a different data shape, so the registry is typed at the
 * lowest common denominator. `EmailService.generateEmailTemplate` is the only
 * caller and it is generic over the data it was handed.
 */
type TemplateBuilder = (data: never) => EmailSpec;

export const TEMPLATES: Record<EmailType, TemplateBuilder> = {
  'booking-confirmation': bookingConfirmation as TemplateBuilder,
  'payment-confirmation': paymentConfirmation as TemplateBuilder,
  'payment-failed': paymentFailed as TemplateBuilder,
  'bank-transfer-instructions': bankTransferInstructions as TemplateBuilder,
  'trip-reminder': tripReminder as TemplateBuilder,
  'trip-completion': tripCompletion as TemplateBuilder,
  'booking-cancellation': bookingCancellation as TemplateBuilder,
  'booking-update': bookingUpdate as TemplateBuilder,
  'refund-issued': refundIssued as TemplateBuilder,
  welcome: welcome as TemplateBuilder,
  'password-reset': passwordReset as TemplateBuilder,
  'password-changed': passwordChanged as TemplateBuilder,
  'enquiry-received': enquiryReceived as TemplateBuilder,
  'admin-booking-alert': adminBookingAlert as TemplateBuilder,
  'admin-invite': adminInvite as TemplateBuilder,
  'admin-access-update': adminAccessUpdate as TemplateBuilder,
  'operator-booking-update': operatorBookingUpdate as TemplateBuilder,
};

export function buildSpec<T extends object>(type: EmailType, data: T & BrandDefaults): EmailSpec {
  const builder = TEMPLATES[type];
  if (!builder) throw new Error(`No email template registered for "${type}"`);
  return (builder as (input: T & BrandDefaults) => EmailSpec)(data);
}

export type { BrandDefaults, WithBrand } from './shared';
