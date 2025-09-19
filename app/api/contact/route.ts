// app/api/contact/route.ts
import { NextResponse } from 'next/server';
import { sendContactFormEmail } from '@/lib/mailgun';

export async function POST(request: Request) {
  try {
    const { name, email, message } = await request.json();

    // --- Basic Validation ---
    if (!name || !email || !message) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // --- Send Email via Mailgun ---
    await sendContactFormEmail({ name, fromEmail: email, message });
    
    return NextResponse.json({ success: true, message: 'Message sent successfully!' });

  } catch (error: any) {
    console.error('Contact form error:', error);
    return NextResponse.json({ error: 'Failed to send message. Please try again later.' }, { status: 500 });
  }
}