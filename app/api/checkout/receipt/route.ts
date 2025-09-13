import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

/**
 * POST /api/checkout/receipt
 * Body (JSON):
 * {
 *   orderId: string,
 *   customer: { name?: string, email?: string, phone?: string },
 *   orderedItems: Array<{ _id?: string, title: string, quantity: number, discountPrice: number }>,
 *   pricing: { subtotal: number, serviceFee: number, tax: number, discount: number, total: number },
 *   notes?: string
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

    // Create a PDF document
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Pipe PDF into a pass-through stream to collect into a buffer
    const stream = new PassThrough();
    doc.pipe(stream);

    // ---- Header ----
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#111827').text('Booking Receipt', { align: 'left' });

    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text(`Receipt ID: ${orderId}`);
    doc.moveDown(1.5);

    // ---- Customer / Date block ----
    const now = new Date();
    // FIX: Using a simple date formatter to avoid server environment issues with toLocaleString.
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    doc.font('Helvetica').fontSize(10).fillColor('#374151');
    const infoTopY = doc.y;
    doc.text(`Billed to:`, { underline: true });
    doc.moveDown(0.25);
    if (customer?.name) doc.text(customer.name);
    if (customer?.email) doc.text(customer.email);
    if (customer?.phone) doc.text(customer.phone);

    // Draw date information on the right side
    doc.text(`Date Issued: ${formattedDate}`, 350, infoTopY, { align: 'right' });
    doc.text(`Order ID: ${orderId}`, 350, doc.y, { align: 'right' });


    doc.moveDown(2);

    // ---- Items table-like listing ----
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Item Description', 55, tableTop);
    doc.text('Quantity', 320, tableTop, { width: 50, align: 'right' });
    doc.text('Total Price', 400, tableTop, { width: 100, align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(0.5);

    // Items rows
    doc.font('Helvetica');
    orderedItems.forEach((item: any) => {
      const y = doc.y;
      const title = item.title ?? 'Item';
      const qty = Number(item.quantity ?? 1);
      const price = Number(item.discountPrice ?? 0) * qty;

      // FIX: Improved table row drawing to handle wrapping and alignment correctly.
      doc.text(title, 55, y, { width: 260, align: 'left' });
      doc.text(String(qty), 320, y, { width: 50, align: 'right' });
      doc.text(price.toFixed(2), 400, y, { width: 100, align: 'right' });
      doc.moveDown(0.5); // Add padding after each item
    });
    
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(0.5);

    // ---- Pricing summary ----
    const drawTotalRow = (label: string, value: string, options: { bold?: boolean; color?: string } = {}) => {
        const y = doc.y;
        const finalColor = options.color || '#111827';
        doc.font(options.bold ? 'Helvetica-Bold' : 'Helvetica');
        doc.fillColor(options.color || '#6b7280').text(label, 320, y, { width: 150, align: 'right' });
        doc.fillColor(finalColor).text(value, 470, y, { width: 70, align: 'right' });
        doc.moveDown(0.6);
    };

    drawTotalRow('Subtotal', (pricing.subtotal ?? 0).toFixed(2));
    drawTotalRow('Service fee', (pricing.serviceFee ?? 0).toFixed(2));
    drawTotalRow('Taxes & fees', (pricing.tax ?? 0).toFixed(2));

    if ((pricing.discount ?? 0) > 0) {
      drawTotalRow('Discount', `-${(pricing.discount ?? 0).toFixed(2)}`);
    }

    doc.moveDown(0.25);
    drawTotalRow('Total Paid', (pricing.total ?? 0).toFixed(2), { bold: true, color: '#b91c1c' });
    doc.moveDown(1.25);

    // Optional notes
    if (notes) {
      doc.font('Helvetica-Bold').fillColor('#374151').text('Notes:', { underline: true });
      doc.moveDown(0.25);
      doc.font('Helvetica').fontSize(9).fillColor('#4b5563').text(notes, { width: 480 });
      doc.moveDown(0.75);
    }

    // Footer / contact
    const pageBottom = doc.page.height - 80;
    doc.moveTo(50, pageBottom).lineTo(545, pageBottom).strokeColor('#e5e7eb').stroke();
    doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text('If you have any questions, please contact us at support@example.com.', 50, pageBottom + 10, {
      align: 'center',
      width: 500
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
  } catch (err: unknown) {
    console.error('Receipt generation error:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to generate receipt', error: errorMessage }, { status: 500 });
  }
}