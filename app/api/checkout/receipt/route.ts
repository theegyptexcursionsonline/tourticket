// app/api/checkout/receipt/route.ts - Premium Ticket-Style Receipt
// Uses the shared generateReceiptPdf utility for consistency
import { NextRequest, NextResponse } from 'next/server';
import { generateReceiptPdf } from '@/lib/utils/generateReceiptPdf';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      orderId,
      customer = {},
      orderedItems = [],
      pricing = {},
      booking = {},
      qrData,
      notes,
    } = body;

    const parseMoney = (value: unknown): number | undefined => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value !== 'string') return undefined;
      const normalized = value.replace(/\s/g, '').replace(/,/g, '.');
      const cleaned = normalized.replace(/[^0-9.-]/g, '');
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    // If pricing is missing or inconsistent, recompute from ordered items totals.
    // This prevents wrong totals in the PDF even if the client sends stale pricing.
    const computedSubtotal = Array.isArray(orderedItems)
      ? orderedItems.reduce((sum: number, item: any) => {
          const itemTotal =
            parseMoney(item.totalPrice) ??
            parseMoney(item.finalPrice) ??
            (typeof item.totalPrice === 'number' ? item.totalPrice : undefined) ??
            (typeof item.finalPrice === 'number' ? item.finalPrice : undefined) ??
            0;
          return sum + (Number.isFinite(itemTotal) ? itemTotal : 0);
        }, 0)
      : 0;

    const round2 = (n: number) => Math.round(n * 100) / 100;

    const safePricing = {
      ...(pricing || {}),
      subtotal: round2(computedSubtotal),
      serviceFee: round2(computedSubtotal * 0.03),
      tax: round2(computedSubtotal * 0.05),
    };

    const discount = round2(
      parseMoney((pricing || {}).discount) ??
      (typeof (pricing || {}).discount === 'number' ? (pricing || {}).discount : 0)
    );

    safePricing.discount = discount;
    safePricing.total = round2(safePricing.subtotal + safePricing.serviceFee + safePricing.tax - discount);

    // Use the shared PDF generation utility
    const pdfBuffer = await generateReceiptPdf({
      orderId,
      customer,
      orderedItems,
      pricing: safePricing,
      booking,
      qrData,
      notes,
    });

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ticket-${orderId ?? Date.now()}.pdf"`,
      },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Receipt route error:', message);
    return NextResponse.json({
      message: 'Failed to generate receipt',
      error: message
    }, { status: 500 });
  }
}
