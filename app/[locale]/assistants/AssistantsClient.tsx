'use client';

import { useEffect, useState } from 'react';

const VOICE_ORIGIN = process.env.NEXT_PUBLIC_FOXES_VOICE_ORIGIN || 'https://voice.foxestechnology.com';
const VOICE_WIDGET_ID = process.env.NEXT_PUBLIC_FOXES_VOICE_WIDGET_ID || '694c1a7a27cc23227da2ccdb';
const VOICE_SCRIPT_ID = 'eeo-assistants-voice-script';
const VOICE_FRAME_ID = 'foxes-voice-widget-frame';

const BOOKING_ORIGIN = process.env.NEXT_PUBLIC_FOXES_BOOKING_ORIGIN || 'https://booking.foxestechnology.com';
const BOOKING_WIDGET_RELEASE = process.env.NEXT_PUBLIC_FOXES_BOOKING_WIDGET_RELEASE || '0931bb5';
const BOOKING_SCRIPT_ID = 'eeo-assistants-booking-script';

/**
 * Direct mounts for the voice and booking assistants. This page is the
 * explicit opt-in surface, so the widgets load here without the global
 * launcher flag; each section renders only when its assistant is
 * configured, so an unconfigured assistant never shows a dead control.
 */
export default function AssistantsClient() {
  const bookingOrgId = process.env.NEXT_PUBLIC_FOXES_BOOKING_ORG_ID || '';
  const [voiceLoaded, setVoiceLoaded] = useState(false);
  const [bookingLoaded, setBookingLoaded] = useState(false);

  useEffect(() => {
    if (!document.getElementById(VOICE_SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = VOICE_SCRIPT_ID;
      script.src = `${VOICE_ORIGIN}/widget.js`;
      script.async = true;
      script.dataset.foxesWidgetId = VOICE_WIDGET_ID;
      // Booking owns the bottom-right action on this dual-assistant page.
      script.dataset.foxesPosition = 'bottom-left';
      script.onload = () => setVoiceLoaded(true);
      document.body.appendChild(script);
    } else {
      queueMicrotask(() => setVoiceLoaded(true));
    }

    if (bookingOrgId && !document.getElementById(BOOKING_SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = BOOKING_SCRIPT_ID;
      script.src = `${BOOKING_ORIGIN}/widget/foxes-booking-v2.js?v=${encodeURIComponent(BOOKING_WIDGET_RELEASE)}`;
      script.async = true;
      script.setAttribute('data-foxes-widget', '');
      script.setAttribute('data-org-id', bookingOrgId);
      script.setAttribute(
        'data-api-url',
        process.env.NEXT_PUBLIC_FOXES_BOOKING_API ||
          'https://foxes-api-production.up.railway.app/api/v1',
      );
      script.onload = () => setBookingLoaded(true);
      document.body.appendChild(script);
    }

    return () => {
      document.getElementById(VOICE_SCRIPT_ID)?.remove();
      document.getElementById(VOICE_FRAME_ID)?.remove();
      document.getElementById(BOOKING_SCRIPT_ID)?.remove();
    };
  }, [bookingOrgId]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-900">Talk to us, your way</h1>
      <p className="mt-3 text-slate-600">
        Ask about tours, transfers and travel plans by voice, or search and book
        directly — whichever suits you.
      </p>

      <section className="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Voice assistant</h2>
        <p className="mt-2 text-slate-600">
          Tap the microphone button in the corner of this page and ask your
          question out loud — the assistant answers in English.
        </p>
        <p className="mt-2 text-sm text-slate-500" data-testid="voice-status">
          {voiceLoaded ? 'The voice assistant is ready in the corner of this page.' : 'Loading the voice assistant…'}
        </p>
      </section>

      {bookingOrgId ? (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Book directly</h2>
          <p className="mt-2 text-slate-600">
            Browse availability and reserve in a few taps.
          </p>
          <p className="mt-2 text-sm text-slate-500" data-testid="booking-status">
            {bookingLoaded ? 'The booking assistant is ready below.' : 'Loading the booking assistant…'}
          </p>
          <div id="foxes-booking-widget" className="mt-4" />
        </section>
      ) : null}
    </div>
  );
}
