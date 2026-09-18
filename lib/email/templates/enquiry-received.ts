import type { EmailSpec } from '../layout';
import type { EnquiryReceivedEmailData } from '../type';
import { brandOf, siteUrl, type WithBrand } from './shared';

export function enquiryReceived(data: WithBrand<EnquiryReceivedEmailData>): EmailSpec {
  return {
    preheader: `Reference ${data.enquiryReference}. A real person reads every message.`,
    brand: brandOf(data),
    statusLabel: 'Received',
    statusTone: 'positive',
    headline: 'We have your message',
    summary: `Hi ${data.customerName}, thank you for getting in touch. Your message reached our team and someone will reply to this address.`,
    facts: {
      eyebrow: `Reference ${data.enquiryReference}`,
      rows: [{ label: 'Sent from', value: data.customerEmail, ltr: true }],
    },
    sections: [
      {
        kind: 'note',
        title: 'What you sent us',
        body: [data.message],
      },
      {
        kind: 'note',
        title: 'What happens next',
        body: [
          'Our team answers enquiries in the order they arrive, during Cairo business hours.',
          'Replying to this email adds to the same conversation — please keep the reference in the subject.',
        ],
      },
    ],
    cta: { label: 'Browse our experiences', url: siteUrl(data, '/') },
    helpText: 'Quote your reference if you need to follow up.',
    reference: data.enquiryReference,
    footerReason: 'You are receiving this because you sent us a message through our website.',
  };
}
