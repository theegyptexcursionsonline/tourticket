// app/api/checkout/receipt/route.ts
import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

/**
 * POST /api/checkout/receipt
 * Body (JSON):
 * {
 *   orderId: string,
 *   customer: { name?: string, email?: string, phone?: string },
 *   orderedItems: Array<{ _id?: string, title: string, quantity: number, discountPrice: number }>,
 *   pricing: { subtotal: number, serviceFee: number, tax: number, discount: number, total: number },
 *   notes?: string
 * }
 *
 * Returns: application/pdf (attachment)
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const orderId = body?.orderId ?? `ORDER-${Date.now()}`;
    const customer = body?.customer ?? {};
    const orderedItems: Array<any> = Array.isArray(body?.orderedItems) ? body.orderedItems : [];
    const pricing = body?.pricing ?? { subtotal: 0, serviceFee: 0, tax: 0, discount: 0, total: 0 };
    const notes = body?.notes ?? '';

    // create a PDF document
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // pipe PDF into a pass-through stream and collect into buffer
    const stream = new PassThrough();
    doc.pipe(stream);

    // ---- Header ----
    // You can replace with actual logo image by doc.image(path, x, y, { width })
    doc
      .fontSize(20)
      .fillColor('#111827')
      .text('Booking Receipt', { align: 'left' });

    doc.moveDown(0.25);
    doc.fontSize(10).fillColor('#6b7280').text(`Receipt ID: ${orderId}`, { continued: true }).text(``, { align: 'right' });
    doc.moveDown(0.5);

    // Customer / Date block
    const now = new Date();
    const formattedDate = now.toLocaleString('en-GB', { timeZone: 'Asia/Kolkata' }); // user timezone hint

    doc.fontSize(10).fillColor('#374151');
    doc.text(`Date: ${formattedDate}`);
    if (customer?.name) doc.text(`Customer: ${customer.name}`);
    if (customer?.email) doc.text(`Email: ${customer.email}`);
    if (customer?.phone) doc.text(`Phone: ${customer.phone}`);
    doc.moveDown(1);

    // horizontal rule
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(0.75);

    // ---- Items table-like listing ----
    doc.fontSize(12).fillColor('#111827').text('Items', { underline: true });
    doc.moveDown(0.5);

    // table headers
    const tableTop = doc.y;
    doc.fontSize(10).fillColor('#6b7280');
    doc.text('Item', 55, tableTop);
    doc.text('Qty', 320, tableTop, { width: 50, align: 'right' });
    doc.text('Price', 400, tableTop, { width: 100, align: 'right' });
    doc.moveDown(0.5);

    // items rows
    doc.fontSize(10).fillColor('#111827');
    orderedItems.forEach((item: any, idx: number) => {
      const y = doc.y;
      const title = item.title ?? 'Item';
      const qty = Number(item.quantity ?? 1);
      const price = Number(item.discountPrice ?? 0) * qty;
      doc.text(title, 55, y, { continued: false });
      doc.text(String(qty), 320, y, { width: 50, align: 'right' });
      doc.text(price.toFixed(2), 400, y, { width: 100, align: 'right' });
      doc.moveDown(0.75);
    });

    // horizontal rule before totals
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(0.5);

    // ---- Pricing summary ----
    const labelX = 320;
    const valueX = 470;
    doc.fontSize(10).fillColor('#6b7280');
    doc.text('Subtotal', labelX, doc.y, { width: 150, align: 'right' });
    doc.text(pricing.subtotal?.toFixed(2) ?? '0.00', valueX, doc.y, { width: 70, align: 'right' });
    doc.moveDown(0.5);

    doc.text('Service fee', labelX, doc.y, { width: 150, align: 'right' });
    doc.text((pricing.serviceFee ?? 0).toFixed(2), valueX, doc.y, { width: 70, align: 'right' });
    doc.moveDown(0.5);

    doc.text('Taxes & fees', labelX, doc.y, { width: 150, align: 'right' });
    doc.text((pricing.tax ?? 0).toFixed(2), valueX, doc.y, { width: 70, align: 'right' });
    doc.moveDown(0.5);

    if ((pricing.discount ?? 0) > 0) {
      doc.text('Discount', labelX, doc.y, { width: 150, align: 'right' });
      doc.text(`-${(pricing.discount ?? 0).toFixed(2)}`, valueX, doc.y, { width: 70, align: 'right' });
      doc.moveDown(0.5);
    }

    // total
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#111827').text('Total Paid', labelX, doc.y, { width: 150, align: 'right', continued: false });
    doc.fontSize(12).fillColor('#b91c1c').text((pricing.total ?? 0).toFixed(2), valueX, doc.y, { width: 70, align: 'right' });

    doc.moveDown(1.25);

    // Optional notes
    if (notes) {
      doc.fontSize(10).fillColor('#374151').text('Notes:', { underline: true });
      doc.moveDown(0.25);
      doc.fontSize(9).fillColor('#4b5563').text(notes, { width: 480 });
      doc.moveDown(0.75);
    }

    // Footer / contact
    doc.fontSize(9).fillColor('#6b7280').text('If you have any questions, contact us at support@example.com', 55, doc.page.height - 80, {
      align: 'left'
    });

    // finalize PDF
    doc.end();

    // collect buffer from stream
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('end', () => resolve());
      stream.on('error', (err) => reject(err));
    });

    const finalBuffer = Buffer.concat(chunks);

    // return PDF as attachment
    return new NextResponse(finalBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${orderId}.pdf"`,
        'Content-Length': String(finalBuffer.length),
      },
    });
  } catch (err) {
    console.error('Receipt generation error:', err);
    return NextResponse.json({ message: 'Failed to generate receipt' }, { status: 500 });
  }
}
