// lib/email/sampleData.ts
//
// Realistic data for every template, shared by the golden render tests and the
// preview harness so what a reviewer looks at is what the tests assert on.
//
// Every address here is an example.com placeholder: nothing in this file may
// ever reach a real inbox.

import type { EmailType } from './type';

export interface TemplateSample {
  /** Strings that MUST survive into both the HTML and the text part. */
  requiredFacts: string[];
  data: Record<string, unknown>;
}

const BASE = 'https://egypt-excursionsonline.com';

export const SAMPLES: Record<EmailType, TemplateSample> = {
  'booking-confirmation': {
    requiredFacts: ['EEO-10421', 'Pyramids of Giza & Sphinx', '$248.00', '08:00 AM'],
    data: {
      customerName: 'Amira Hassan',
      customerEmail: 'traveller@example.com',
      customerPhone: '+20 100 000 0000',
      tourTitle: 'Pyramids of Giza & Sphinx',
      bookingDate: 'Friday, 25 September 2026',
      bookingTime: '08:00 AM',
      participants: '2 adults, 1 child',
      participantBreakdown: '2 x Adults ($89.00), 1 x Child ($70.00)',
      totalPrice: '$248.00',
      bookingId: 'EEO-10421',
      bookingOption: 'Private tour with Egyptologist guide',
      specialRequests: 'Vegetarian lunch for one guest, please.',
      hotelPickupDetails: 'Lobby pickup at 07:15, look for the blue minivan.',
      hotelPickupLocation: { lat: 30.02, lng: 31.21, name: 'Nile Ritz-Carlton', address: '1113 Corniche El Nil, Cairo' },
      meetingPoint: 'Hotel lobby',
      contactNumber: '+20 11 42255624',
      qrCodeCid: 'booking-qr-code',
      verificationUrl: `${BASE}/booking/verify/EEO-10421`,
      timeUntil: { days: 6, hours: 3, minutes: 12 },
      discountCode: 'AUTUMN10',
      orderedItems: [
        {
          title: 'Pyramids of Giza & Sphinx',
          adults: 2, children: 1, infants: 0,
          bookingOption: 'Private tour',
          totalPrice: '$248.00',
        },
      ],
      pricingDetails: {
        subtotal: '$248.00', serviceFee: '$12.00', tax: '$9.60',
        discount: '$24.80', total: '$244.80', currencySymbol: '$',
      },
      baseUrl: BASE,
    },
  },

  'payment-confirmation': {
    requiredFacts: ['EEO-10421', 'pi_3QexampleXyz', '$244.80', 'Visa'],
    data: {
      customerName: 'Amira Hassan',
      customerEmail: 'traveller@example.com',
      paymentId: 'pi_3QexampleXyz',
      paymentMethod: 'Visa ending 4242',
      amount: '$244.80',
      currency: 'USD',
      bookingId: 'EEO-10421',
      tourTitle: 'Pyramids of Giza & Sphinx',
      baseUrl: BASE,
    },
  },

  'payment-failed': {
    requiredFacts: ['Nile Dinner Cruise', '244.8 USD', 'insufficient funds'],
    data: {
      customerName: 'Amira Hassan',
      customerEmail: 'traveller@example.com',
      tourTitle: 'Nile Dinner Cruise',
      amount: '244.8 USD',
      reason: 'Your bank reported insufficient funds on this card.',
      attemptedAt: '2026-09-18',
      baseUrl: BASE,
    },
  },

  'bank-transfer-instructions': {
    requiredFacts: ['EEO-10422', 'EG380001001001234567890', 'CIBEEGCX', '$310.00'],
    data: {
      customerName: 'Omar Fathy',
      customerEmail: 'traveller@example.com',
      tourTitle: 'Luxor Day Trip by Flight',
      bookingId: 'EEO-10422',
      bookingDate: 'Monday, 5 October 2026',
      bookingTime: '04:30 AM',
      participants: '2 adults',
      totalPrice: '$310.00',
      bankName: 'Commercial International Bank (CIB)',
      accountName: 'Egypt Excursions Online',
      accountNumber: '1001234567890',
      iban: 'EG380001001001234567890',
      swiftCode: 'CIBEEGCX',
      currency: 'USD',
      specialRequests: 'Window seats if possible.',
      baseUrl: BASE,
    },
  },

  'trip-reminder': {
    requiredFacts: ['EEO-10421', 'Pyramids of Giza & Sphinx', 'Hotel lobby', '08:00 AM'],
    data: {
      customerName: 'Amira Hassan',
      customerEmail: 'traveller@example.com',
      tourTitle: 'Pyramids of Giza & Sphinx',
      bookingDate: 'Friday, 25 September 2026',
      bookingTime: '08:00 AM',
      meetingPoint: 'Hotel lobby',
      contactNumber: '+20 11 42255624',
      whatToBring: ['Comfortable walking shoes', 'Sun hat and sunglasses', 'Water bottle'],
      importantNotes: 'Please arrive 15 minutes early at the meeting point.',
      bookingId: 'EEO-10421',
      baseUrl: BASE,
    },
  },

  'trip-completion': {
    requiredFacts: ['Pyramids of Giza & Sphinx', 'Friday, 25 September 2026'],
    data: {
      customerName: 'Amira Hassan',
      customerEmail: 'traveller@example.com',
      tourTitle: 'Pyramids of Giza & Sphinx',
      bookingDate: 'Friday, 25 September 2026',
      reviewLink: `${BASE}/pyramids-of-giza-sphinx?review=true`,
      recommendedTours: [
        { title: 'Alexandria Day Trip', image: `${BASE}/images/alexandria.jpg`, price: 'From $75', link: `${BASE}/alexandria-day-trip` },
      ],
      baseUrl: BASE,
    },
  },

  'booking-cancellation': {
    requiredFacts: ['EEO-10421', 'Pyramids of Giza & Sphinx', '$244.80'],
    data: {
      customerName: 'Amira Hassan',
      customerEmail: 'traveller@example.com',
      tourTitle: 'Pyramids of Giza & Sphinx',
      bookingDate: 'Friday, 25 September 2026',
      bookingId: 'EEO-10421',
      refundAmount: '$244.80',
      refundProcessingDays: 5,
      cancellationReason: 'Guest requested a different date.',
      baseUrl: BASE,
    },
  },

  'booking-update': {
    requiredFacts: ['EEO-10421', 'Rescheduled', 'Pyramids of Giza & Sphinx'],
    data: {
      customerName: 'Amira Hassan',
      customerEmail: 'traveller@example.com',
      tourTitle: 'Pyramids of Giza & Sphinx',
      bookingId: 'EEO-10421',
      bookingDate: 'Saturday, 26 September 2026',
      bookingTime: '09:00 AM',
      newStatus: 'Rescheduled',
      statusMessage: 'Your tour has moved to Saturday at 09:00 AM at your request.',
      additionalInfo: 'Your guide and meeting point are unchanged.',
      baseUrl: BASE,
    },
  },

  'refund-issued': {
    requiredFacts: ['EEO-10421', '$122.40', 'Partially Refunded'],
    data: {
      customerName: 'Amira Hassan',
      customerEmail: 'traveller@example.com',
      tourTitle: 'Pyramids of Giza & Sphinx',
      bookingId: 'EEO-10421',
      bookingDate: 'Friday, 25 September 2026',
      refundAmount: '$122.40',
      originalAmount: '$244.80',
      refundType: 'partial',
      refundProcessingDays: 5,
      refundReason: 'One guest withdrew from the booking.',
      newStatus: 'Partially Refunded',
      baseUrl: BASE,
    },
  },

  welcome: {
    requiredFacts: ['Amira Hassan', 'Egypt Excursions Online'],
    data: {
      customerName: 'Amira Hassan',
      customerEmail: 'traveller@example.com',
      dashboardLink: `${BASE}/user/dashboard`,
      recommendedTours: [
        { title: 'Nile Dinner Cruise', image: `${BASE}/images/nile.jpg`, price: 'From $59', link: `${BASE}/nile-dinner-cruise` },
      ],
      baseUrl: BASE,
    },
  },

  'password-reset': {
    requiredFacts: ['15 minutes'],
    data: {
      customerEmail: 'traveller@example.com',
      resetUrl: `${BASE}/reset-password?token=abc123def456`,
      expiresInMinutes: 15,
    },
  },

  'password-changed': {
    requiredFacts: ['traveller@example.com', 'September 18, 2026'],
    data: {
      customerName: 'Amira Hassan',
      customerEmail: 'traveller@example.com',
      changedAt: 'September 18, 2026 at 4:05 PM (Cairo time)',
      method: 'reset-link',
    },
  },

  'enquiry-received': {
    requiredFacts: ['ENQ-20260918-A1B2C3', 'private guide'],
    data: {
      customerName: 'Amira Hassan',
      customerEmail: 'traveller@example.com',
      message: 'Do you offer a private guide for the Egyptian Museum on weekday mornings?',
      enquiryReference: 'ENQ-20260918-A1B2C3',
    },
  },

  'admin-booking-alert': {
    requiredFacts: ['EEO-10421', 'Amira Hassan', '$244.80', 'traveller@example.com'],
    data: {
      customerName: 'Amira Hassan',
      customerEmail: 'traveller@example.com',
      customerPhone: '+20 100 000 0000',
      tourTitle: 'Pyramids of Giza & Sphinx',
      bookingId: 'EEO-10421',
      bookingDate: 'Friday, 25 September 2026',
      totalPrice: '$244.80',
      paymentMethod: 'Visa ending 4242',
      specialRequests: 'Vegetarian lunch for one guest.',
      hotelPickupDetails: 'Lobby pickup at 07:15.',
      hotelPickupLocation: { lat: 30.02, lng: 31.21, name: 'Nile Ritz-Carlton', address: '1113 Corniche El Nil, Cairo' },
      timeUntil: { days: 6, hours: 3, minutes: 12 },
      adminDashboardLink: `${BASE}/admin/bookings/EEO-10421`,
      discountCode: 'AUTUMN10',
      discountAmount: '$24.80',
      tours: [
        {
          title: 'Pyramids of Giza & Sphinx', date: '25 Sep 2026', time: '08:00 AM',
          adults: 2, children: 1, infants: 0,
          bookingOption: 'Private tour', addOns: ['Camel ride', 'Lunch upgrade'], price: '$248.00',
        },
      ],
      baseUrl: BASE,
    },
  },

  'admin-invite': {
    requiredFacts: ['Operations Manager', 'newadmin@example.com'],
    data: {
      inviteeName: 'Sara Kamal',
      inviteeEmail: 'newadmin@example.com',
      inviterName: 'Operations Lead',
      temporaryPassword: '',
      role: 'Operations Manager',
      permissions: ['Manage bookings', 'View revenue reports', 'Edit tour content'],
      portalLink: `${BASE}/admin/accept-invitation?token=inv_abc123`,
      supportEmail: 'booking@egypt-excursionsonline.com',
    },
  },

  'admin-access-update': {
    requiredFacts: ['Sara Kamal', 'newadmin@example.com'],
    data: {
      inviteeName: 'Sara Kamal',
      inviteeEmail: 'newadmin@example.com',
      updatedBy: 'Operations Lead',
      action: 'permissions_updated',
      permissions: ['Manage bookings', 'View revenue reports'],
      portalLink: `${BASE}/admin`,
      isActivated: true,
      supportEmail: 'booking@egypt-excursionsonline.com',
    },
  },

  'operator-booking-update': {
    requiredFacts: ['EEO-10421', 'Amira Hassan', 'Confirmed'],
    data: {
      bookingId: 'EEO-10421',
      tourTitle: 'Pyramids of Giza & Sphinx',
      customerName: 'Amira Hassan',
      customerEmail: 'traveller@example.com',
      customerPhone: '+20 100 000 0000',
      bookingDate: 'Friday, 25 September 2026',
      bookingTime: '08:00 AM',
      changesSummary: 'Pickup time moved from 07:30 to 07:15 at the guest’s request.',
      changedBy: 'Operations Lead',
      changedAt: 'September 18, 2026 at 4:05 PM (Cairo time)',
      newStatus: 'Confirmed',
      adultGuests: 2,
      childGuests: 1,
      infantGuests: 0,
      hotelPickupDetails: 'Lobby pickup at 07:15.',
      hotelPickupLocation: { lat: 30.02, lng: 31.21, address: '1113 Corniche El Nil, Cairo' },
      specialRequests: 'Vegetarian lunch for one guest.',
      baseUrl: BASE,
    },
  },
};

export const ALL_TYPES = Object.keys(SAMPLES) as EmailType[];
