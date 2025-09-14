// app/api/checkout/receipt/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Buffer } from 'buffer';
import fs from 'fs/promises';
import path from 'path';

// Try to import qrcode generator (optional)
// If you don't want to install this dependency, the route will still work when client sends qrImageBase64.
let QR: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  QR = require('qrcode');
} catch (e) {
  QR = null;
  // It's fine - we'll accept client-provided base64 instead.
}

// ----------------- Helpers -----------------
const hexToPdfLibRgb = (hex: string) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!r) return rgb(0, 0, 0);
  return rgb(parseInt(r[1], 16) / 255, parseInt(r[2], 16) / 255, parseInt(r[3], 16) / 255);
};
const toNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number) => Math.round(n * 100) / 100;
const pickUnitPrice = (item: any) => toNumber(item?.finalPrice ?? item?.discountPrice ?? item?.price ?? 0);

// ----------------- Route -----------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      orderId,
      customer = {},
      orderedItems = [],
      pricing = {},
      booking = {},
      qrImageBase64,
      qrData,
      notes,
    } = body;

    const currencySymbol = pricing?.symbol ?? '$';
    // compute subtotal from items (source-of-truth)
    const computedSubtotal = round2(
      orderedItems.reduce((acc: number, it: any) => {
        const qty = Math.max(1, toNumber(it.quantity ?? 1));
        const unit = pickUnitPrice(it);
        return acc + unit * qty;
      }, 0)
    );

    const providedSubtotal = pricing?.subtotal != null ? round2(toNumber(pricing.subtotal)) : undefined;
    const subtotal = providedSubtotal != null ? providedSubtotal : computedSubtotal;

    let serviceFee = 0;
    if (pricing?.serviceFee != null) {
      serviceFee = round2(toNumber(pricing.serviceFee));
    } else if (pricing?.serviceRate != null) {
      let rate = toNumber(pricing.serviceRate);
      if (rate > 1) rate = rate / 100;
      serviceFee = round2(subtotal * rate);
    } else {
      serviceFee = round2(subtotal * 0.03); // fallback 3% if none provided (match UI)
    }

    const tax = pricing?.tax != null ? round2(toNumber(pricing.tax)) : round2(subtotal * 0.05);
    const discount = pricing?.discount != null ? round2(toNumber(pricing.discount)) : 0;
    const computedTotal = round2(subtotal + serviceFee + tax - discount);
    const total = pricing?.total != null ? round2(toNumber(pricing.total)) : computedTotal;

    // --- Prepare PDF ---
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const margin = 48;

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const colors = {
      primary: hexToPdfLibRgb('#111827'),
      secondary: hexToPdfLibRgb('#6B7280'),
      lightGray: hexToPdfLibRgb('#F3F4F6'),
      lineColor: hexToPdfLibRgb('#E5E7EB'),
    };

    // Header background
    const headerH = 110;
    page.drawRectangle({ x: 0, y: height - headerH, width, height: headerH, color: colors.lightGray });

    // Logo (safe)
    try {
      const logoPath = path.join(process.cwd(), 'public/EEO-logo.png');
      const bytes = await fs.readFile(logoPath);
      const logo = await pdfDoc.embedPng(bytes);
      const desiredW = 90;
      const scale = desiredW / logo.width;
      const logoW = logo.width * scale;
      const logoH = logo.height * scale;
      const logoX = margin;
      const logoY = height - headerH / 2 - logoH / 2;
      page.drawImage(logo, { x: logoX, y: logoY, width: logoW, height: logoH });
    } catch (err) {
      // skip if missing
      console.warn('Logo not embedded:', err);
    }

    // Header text
    const headerTextX = width - margin - 260;
    page.drawText('INVOICE / RECEIPT', { x: headerTextX, y: height - margin + 6, font: boldFont, size: 24, color: colors.primary });
    page.drawText(`Order ID: ${orderId ?? `ORD-${Date.now()}`}`, { x: headerTextX, y: height - margin - 20, font, size: 10, color: colors.secondary });

    // Start Y
    let y = height - headerH - 24;

    // BILLED TO / FROM
    page.drawText('BILLED TO', { x: margin, y, font: boldFont, size: 10, color: colors.secondary });
    page.drawText('FROM', { x: width / 2, y, font: boldFont, size: 10, color: colors.secondary });
    y -= 16;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: colors.lineColor });
    y -= 18;

    page.drawText(customer?.name ?? 'Valued Customer', { x: margin, y, font: boldFont, size: 12, color: colors.primary });
    page.drawText('Egypt Excursions Online', { x: width / 2, y, font: boldFont, size: 12, color: colors.primary });
    y -= 14;
    if (customer?.email) page.drawText(String(customer.email), { x: margin, y, font, size: 10, color: colors.secondary });
    if (customer?.phone) page.drawText(String(customer.phone), { x: margin, y: y - 12, font, size: 10, color: colors.secondary });
    page.drawText('123 Nile Street', { x: width / 2, y, font, size: 10, color: colors.secondary });
    page.drawText('Cairo, Egypt', { x: width / 2, y: y - 12, font, size: 10, color: colors.secondary });

    y -= 44;

    // Table header
    page.drawRectangle({ x: margin, y: y - 10, width: width - margin * 2, height: 30, color: colors.lightGray, opacity: 0.55 });
    y -= 6;
    page.drawText('DESCRIPTION', { x: margin + 12, y, font: boldFont, size: 10, color: colors.secondary });
    page.drawText('QTY', { x: width - margin - 150, y, font: boldFont, size: 10, color: colors.secondary });
    page.drawText('TOTAL', { x: width - margin - 60, y, font: boldFont, size: 10, color: colors.secondary });
    y -= 26;

    // Table rows
    orderedItems.forEach((it: any, idx: number) => {
      const rowY = y;
      const title = String(it.title ?? it.name ?? 'Item');
      const qty = Math.max(1, toNumber(it.quantity ?? 1));
      const unit = pickUnitPrice(it);
      const itemTotal = round2(unit * qty);

      if (idx % 2 !== 0) {
        page.drawRectangle({ x: margin, y: rowY - 15, width: width - margin * 2, height: 30, color: colors.lightGray, opacity: 0.45 });
      }

      // Title & details
      page.drawText(title, { x: margin + 12, y: rowY - 5, font, size: 10, color: colors.primary, maxWidth: 320 });
      page.drawText(String(qty), { x: width - margin - 150, y: rowY - 5, font, size: 10, color: colors.primary });
      const totalText = `${currencySymbol}${itemTotal.toFixed(2)}`;
      const tw = font.widthOfTextAtSize(totalText, 10);
      page.drawText(totalText, { x: width - margin - tw, y: rowY - 5, font, size: 10, color: colors.primary });

      y -= 30;
    });

    y -= 8;
    page.drawLine({ start: { x: width / 2, y }, end: { x: width - margin, y }, thickness: 1, color: colors.lineColor });
    y -= 22;

    // Pricing block (right side)
    const drawRow = (label: string, value: number | string, bold = false) => {
      const f = bold ? boldFont : font;
      const color = bold ? colors.primary : colors.secondary;
      const valueStr = typeof value === 'number' ? `${currencySymbol}${value.toFixed(2)}` : String(value);
      page.drawText(label, { x: width - margin - 220, y, font: f, size: 10, color });
      const wVal = f.widthOfTextAtSize(valueStr, 10);
      page.drawText(valueStr, { x: width - margin - wVal, y, font: f, size: 10, color });
      y -= 18;
    };

    drawRow('Subtotal', subtotal);
    drawRow('Service Fee', serviceFee);
    drawRow('Taxes & Fees', tax);
    if (discount > 0) drawRow('Discount', -discount);
    y -= 6;
    // highlight total
    page.drawRectangle({ x: width / 2 - 25, y: y + 12, width: width / 2 - margin + 25, height: 36, color: colors.lightGray });
    drawRow('TOTAL PAID', total, true);

    // --- Booking Details section (left side below items) ---
    // reposition a yLeft to be a bit below last item area
    let yLeft = height - headerH - 200; // starting area under billing. adjust if you want it higher/lower
    const leftX = margin;
    page.drawText('Booking Details', { x: leftX, y: yLeft, font: boldFont, size: 12, color: colors.primary });
    yLeft -= 16;
    page.drawLine({ start: { x: leftX, y: yLeft }, end: { x: leftX + 320, y: yLeft }, thickness: 1, color: colors.lineColor });
    yLeft -= 12;
    if (booking?.date) page.drawText(`Date: ${String(booking.date)}`, { x: leftX, y: yLeft, font, size: 10, color: colors.secondary });
    if (booking?.time) page.drawText(`Time: ${String(booking.time)}`, { x: leftX + 180, y: yLeft, font, size: 10, color: colors.secondary });
    yLeft -= 14;
    const guests = orderedItems.reduce((s: number, it: any) => s + Math.max(1, toNumber(it.quantity)), 0);
    page.drawText(`Guests: ${guests}`, { x: leftX, y: yLeft, font, size: 10, color: colors.secondary });
    if (booking?.pickup) page.drawText(`Pickup: ${String(booking.pickup)}`, { x: leftX + 180, y: yLeft, font, size: 10, color: colors.secondary });
    yLeft -= 14;
    if (booking?.specialRequests || notes) {
      const noteText = (booking?.specialRequests ?? notes ?? '').toString();
      // wrap note text if long
      const maxWidth = 380;
      const lineHeight = 12;
      let curY = yLeft;
      const words = noteText.split(' ');
      let line = '';
      for (let i = 0; i < words.length; i++) {
        const test = line ? `${line} ${words[i]}` : words[i];
        const w = font.widthOfTextAtSize(test, 9);
        if (w > maxWidth) {
          page.drawText(line, { x: leftX, y: curY, font, size: 9, color: colors.secondary });
          line = words[i];
          curY -= lineHeight;
        } else {
          line = test;
        }
      }
      if (line) {
        page.drawText(line, { x: leftX, y: curY, font, size: 9, color: colors.secondary });
        yLeft = curY - lineHeight;
      } else {
        yLeft -= 12;
      }
    } else {
      yLeft -= 8;
    }

    // --- QR Code embed (bottom-right area) ---
    // Preferred: client sends `qrImageBase64` (data:image/png;base64,...)
    // Fallback: server will try to generate PNG from `qrData` using qrcode lib if present
    let qrPngBuffer: Buffer | null = null;
    if (qrImageBase64 && typeof qrImageBase64 === 'string' && qrImageBase64.startsWith('data:image')) {
      // strip header
      const base = qrImageBase64.split(',')[1];
      if (base) qrPngBuffer = Buffer.from(base, 'base64');
    } else if (qrData && QR) {
      try {
        // generate PNG buffer from data URL (use low error correction and small scale)
        const pngBuffer = await QR.toBuffer(String(qrData), { type: 'png', width: 240, margin: 1 });
        qrPngBuffer = Buffer.from(pngBuffer);
      } catch (err) {
        console.warn('QR generation failed:', err);
        qrPngBuffer = null;
      }
    }

    if (qrPngBuffer) {
      try {
        const qrImage = await pdfDoc.embedPng(qrPngBuffer);
        const qrW = 110;
        const qrH = (qrImage.height / qrImage.width) * qrW;
        const qrX = width - margin - qrW;
        const qrY = margin + 16;
        page.drawImage(qrImage, { x: qrX, y: qrY, width: qrW, height: qrH });

        // small caption
        const caption = 'Scan for booking details';
        const capW = font.widthOfTextAtSize(caption, 8);
        page.drawText(caption, { x: qrX + (qrW - capW) / 2, y: qrY - 12, font, size: 8, color: colors.secondary });
      } catch (err) {
        console.warn('Failed embedding QR into PDF:', err);
      }
    }

    // Footer message
    const footerY = margin;
    const footerMsg = 'Thank you for your booking. For support, contact support@example.com';
    const fw = font.widthOfTextAtSize(footerMsg, 8);
    page.drawText(footerMsg, { x: (width - fw) / 2, y: footerY / 2 + 6, font, size: 8, color: colors.secondary });

    // Save
    const pdfBytes = await pdfDoc.save();
    const finalBuffer = Buffer.from(pdfBytes);

    return new NextResponse(finalBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${orderId ?? Date.now()}.pdf"`,
      },
    });
  } catch (err: any) {
    console.error('Receipt route error:', err);
    return NextResponse.json({ message: 'Failed to generate receipt', error: String(err?.message ?? err) }, { status: 500 });
  }
}
