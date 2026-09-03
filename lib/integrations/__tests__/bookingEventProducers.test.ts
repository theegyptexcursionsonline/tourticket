import {
  createPersistedBookingEvent,
} from '@/lib/integrations/bookingEventProducers';
import { BookingEventValidationError } from '@/lib/integrations/foxesConnectBookingEvents';

describe('TourTicket booking-event producers', () => {
  it('uses the stored Cairo departure instant and schedule-specific reminder identity', () => {
    const event = createPersistedBookingEvent({
      type: 'service_reminder_24h',
      booking: {
        _id: '507f1f77bcf86cd799439011',
        bookingReference: 'EEO-123456',
        dateString: '2026-09-05',
        time: '10:00',
        status: 'Confirmed',
        paymentStatus: 'paid',
        totalPrice: 125,
        currency: 'USD',
        customerPhone: '+20 100 000 0000',
      },
    });

    expect(event).toMatchObject({
      eventId: 'tourticket:507f1f77bcf86cd799439011:service_reminder_24h:20260905T1000',
      type: 'service_reminder_24h',
      // Cairo is UTC+3 in September 2026; the fact occurs exactly 24h before departure.
      occurredAt: '2026-09-04T07:00:00.000Z',
      customer: { phone: '+20 100 000 0000' },
      data: {
        serviceDate: '2026-09-05',
        serviceTime: '10:00',
      },
    });
  });

  it('uses the durable payment confirmation time for byte-stable confirmation replays', () => {
    const booking = {
      _id: { toString: () => '507f1f77bcf86cd799439011' },
      bookingReference: 'EEO-123456',
      dateString: '2026-09-05',
      time: '10:00',
      status: 'Confirmed',
      paymentStatus: 'paid',
      paymentConfirmedAt: new Date('2026-09-03T06:30:00Z'),
      createdAt: new Date('2026-09-03T06:00:00Z'),
    };

    const first = createPersistedBookingEvent({ type: 'booking_confirmed', booking });
    const replay = createPersistedBookingEvent({ type: 'booking_confirmed', booking });
    expect(first).toEqual(replay);
    expect(first.occurredAt).toBe('2026-09-03T06:30:00.000Z');
  });

  it('requires explicit authoritative occurrence data for unsupported domain producers', () => {
    const booking = {
      _id: '507f1f77bcf86cd799439011',
      bookingReference: 'EEO-123456',
      createdAt: '2026-09-03T06:00:00Z',
    };
    expect(() => createPersistedBookingEvent({
      type: 'pickup_confirmed',
      booking,
    })).toThrow(BookingEventValidationError);

    const driverEvent = createPersistedBookingEvent({
      type: 'driver_assigned',
      booking,
      occurredAt: '2026-09-04T08:15:00Z',
      eventVersion: 'assignment-1',
      driverName: 'Assigned driver',
    });
    expect(driverEvent).toMatchObject({
      eventId: 'tourticket:507f1f77bcf86cd799439011:driver_assigned:assignment-1',
      occurredAt: '2026-09-04T08:15:00.000Z',
      data: { driverName: 'Assigned driver' },
    });
  });

  it('records the real immutable completion transition time', () => {
    const event = createPersistedBookingEvent({
      type: 'service_completed',
      booking: {
        _id: '507f1f77bcf86cd799439011',
        updatedAt: '2026-09-05T12:30:00Z',
        dateString: '2026-09-05',
        time: '10:00',
        status: 'Completed',
      },
    });
    expect(event.occurredAt).toBe('2026-09-05T12:30:00.000Z');
  });
});
