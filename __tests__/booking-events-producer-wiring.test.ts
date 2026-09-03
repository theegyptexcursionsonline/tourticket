import fs from 'node:fs';
import path from 'node:path';

const source = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('booking-event producer wiring', () => {
  it('queues confirmation and pending-payment facts only after durable booking writes', () => {
    const manual = source('app/api/admin/bookings/route.ts');
    const adminUpdate = source('app/api/admin/bookings/[id]/route.ts');
    const stripe = source('app/api/webhooks/stripe/route.ts');
    const mobile = source('lib/checkout/mobileCommerce.ts');
    const checkout = source('app/api/checkout/route.ts');

    expect(manual.indexOf('await Booking.create({')).toBeLessThan(manual.indexOf('queuePersistedBookingEvent({'));
    expect(manual).toContain("bookingStatus === 'Confirmed'");
    expect(manual).toContain("['booking_confirmed']");
    expect(manual).toContain("['payment_pending']");
    expect(adminUpdate.indexOf('const persisted = async () => Booking.findOneAndUpdate('))
      .toBeLessThan(adminUpdate.indexOf('queuePersistedBookingEvent({'));
    expect(adminUpdate).toContain("if (status === 'Completed') lifecycleTypes.push('service_completed')");
    expect(stripe.indexOf('await Booking.updateMany(')).toBeLessThan(stripe.indexOf('await queueConfirmedBookingEvents('));
    expect(stripe).toContain('if (!isDefaultTenant(tenantId)) return;');
    expect(stripe).toContain("status: 'Confirmed'");
    expect(mobile.indexOf('await Booking.updateOne(')).toBeLessThan(mobile.indexOf("await queuePersistedBookingEvent({ type: 'booking_confirmed', booking });"));
    expect(checkout.indexOf('createdBookings.push(booking)')).toBeLessThan(checkout.indexOf("type: 'payment_pending'"));
  });

  it('uses an authenticated scheduled outbox drain and recovery sweep', () => {
    const route = source('app/api/cron/booking-events/route.ts');
    const schedule = source('netlify/functions/booking-event-maintenance.mjs');
    const maintenance = source('lib/integrations/bookingEventMaintenance.ts');
    expect(route).toContain('verifyCron(request)');
    expect(route).toContain('runBookingEventMaintenance()');
    expect(schedule).toContain("schedule: '*/5 * * * *'");
    expect(maintenance).toContain("type: 'service_reminder_24h' as const");
    expect(maintenance).toContain("type: 'service_completed'");
    expect(maintenance).toContain('foreignField: \'eventId\'');
    expect(maintenance).toContain('$and: [DEFAULT_TENANT_FILTER]');
  });

  it('does not infer pickup confirmation or fabricate a driver producer', () => {
    const hooks = [
      source('app/api/admin/bookings/route.ts'),
      source('app/api/admin/bookings/[id]/route.ts'),
      source('app/api/checkout/route.ts'),
      source('app/api/webhooks/stripe/route.ts'),
      source('lib/checkout/mobileCommerce.ts'),
      source('lib/integrations/bookingEventMaintenance.ts'),
    ].join('\n');
    expect(hooks).not.toContain('pickup_confirmed');
    expect(hooks).not.toContain('driver_assigned');
  });

  it('stores immutable payload hashes under a unique event identity', () => {
    const model = source('lib/models/FoxesConnectBookingEvent.ts');
    const outbox = source('lib/integrations/bookingEventOutbox.ts');
    expect(model).toContain("{ unique: true, name: 'foxesconnect_booking_event_id_unique' }");
    expect(model).toContain('bodySha256');
    expect(outbox).toContain("'BOOKING_EVENT_ID_COLLISION'");
    expect(outbox).toContain("status: 'processing'");
  });

  it('ships the three server-only settings into Netlify functions', () => {
    const netlify = source('netlify.toml');
    expect(netlify).toContain('"FOXESCONNECT_BOOKING_EVENTS_URL"');
    expect(netlify).toContain('"FOXESCONNECT_WORKSPACE_KEY"');
    expect(netlify).toContain('"FOXESCONNECT_BOOKING_EVENTS_SECRET"');
    expect(netlify).not.toContain('NEXT_PUBLIC_FOXESCONNECT_BOOKING_EVENTS_SECRET');
  });

  it('does not couple the emitter or worker to a customer messaging provider', () => {
    const implementation = [
      source('lib/integrations/foxesConnectBookingEvents.ts'),
      source('lib/integrations/bookingEventOutbox.ts'),
      source('lib/integrations/bookingEventMaintenance.ts'),
    ].join('\n');
    expect(implementation).not.toMatch(/EmailService|sendWhatsApp|sendTemplate|mailgun/i);
  });
});
