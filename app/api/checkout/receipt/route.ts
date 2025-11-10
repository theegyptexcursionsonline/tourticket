// app/api/checkout/receipt/route.ts (Fixed with correct pricing)
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Buffer } from 'buffer';
import fs from 'fs/promises';
import path from 'path';

let QR: any = null;
try {
  QR = require('qrcode');
} catch (e) {
  QR = null;
}

// Helper functions
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

// Use the SAME calculation logic as the checkout page
const calculateItemTotal = (item: any) => {
  const basePrice = item.selectedBookingOption?.price || item.discountPrice || item.price || 0;
  const adultPrice = basePrice * (item.quantity || 1);
  const childPrice = (basePrice / 2) * (item.childQuantity || 0);
  let tourTotal = adultPrice + childPrice;

  let addOnsTotal = 0;
  if (item.selectedAddOns && item.selectedAddOnDetails) {
    Object.entries(item.selectedAddOns).forEach(([addOnId, quantity]) => {
      const addOnDetail = item.selectedAddOnDetails?.[addOnId];
      if (addOnDetail && quantity > 0) {
        const totalGuests = (item.quantity || 0) + (item.childQuantity || 0);
        const addOnQuantity = addOnDetail.perGuest ? totalGuests : 1;
        addOnsTotal += addOnDetail.price * addOnQuantity;
      }
    });
  }

  return tourTotal + addOnsTotal;
};

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
    
 // In app/api/checkout/receipt/route.ts - use the provided pricing exactly
const subtotal = round2(toNumber(pricing?.subtotal ?? 0));
const serviceFee = round2(toNumber(pricing?.serviceFee ?? 0));
const tax = round2(toNumber(pricing?.tax ?? 0));
const discount = round2(toNumber(pricing?.discount ?? 0));
const total = round2(toNumber(pricing?.total ?? 0));


    // Create PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const { width, height } = page.getSize();
    const margin = 50;

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const colors = {
      primary: hexToPdfLibRgb('#111827'),
      secondary: hexToPdfLibRgb('#6B7280'),
      lightGray: hexToPdfLibRgb('#F9FAFB'),
      lineColor: hexToPdfLibRgb('#E5E7EB'),
      blue: hexToPdfLibRgb('#3B82F6'),
    };

    let currentY = height - margin;

    // --- HEADER ---
    const headerHeight = 80;
    page.drawRectangle({ 
      x: 0, 
      y: currentY - headerHeight, 
      width, 
      height: headerHeight, 
      color: colors.lightGray 
    });

    // Company logo/name
    try {
      const logoPath = path.join(process.cwd(), 'public/EEO-logo.png');
      const bytes = await fs.readFile(logoPath);
      const logo = await pdfDoc.embedPng(bytes);
      const logoWidth = 60;
      const logoHeight = (logo.height / logo.width) * logoWidth;
      
      page.drawImage(logo, {
        x: margin,
        y: currentY - headerHeight/2 - logoHeight/2,
        width: logoWidth,
        height: logoHeight,
      });
    } catch (err) {
      page.drawText('Egypt Excursions Online', {
        x: margin,
        y: currentY - headerHeight/2,
        font: boldFont,
        size: 14,
        color: colors.blue,
      });
    }

    // Invoice title
    page.drawText('INVOICE / RECEIPT', {
      x: width - margin - 180,
      y: currentY - 25,
      font: boldFont,
      size: 18,
      color: colors.primary,
    });
    
    page.drawText(`Order ID: ${orderId ?? `ORD-${Date.now()}`}`, {
      x: width - margin - 180,
      y: currentY - 45,
      font: font,
      size: 10,
      color: colors.secondary,
    });

    currentY -= headerHeight + 20;

    // --- BILLING INFO ---
    const billingY = currentY;
    page.drawText('BILLED TO', { 
      x: margin, 
      y: billingY, 
      font: boldFont, 
      size: 10, 
      color: colors.secondary 
    });
    
    page.drawText('FROM', { 
      x: width - margin - 200, 
      y: billingY, 
      font: boldFont, 
      size: 10, 
      color: colors.secondary 
    });
    
    currentY -= 20;
    page.drawLine({ 
      start: { x: margin, y: currentY }, 
      end: { x: width - margin, y: currentY }, 
      thickness: 1, 
      color: colors.lineColor 
    });
    
    currentY -= 15;

    // Customer details
    page.drawText(customer?.name ?? 'Valued Customer', {
      x: margin,
      y: currentY,
      font: boldFont,
      size: 12,
      color: colors.primary,
    });

    page.drawText('Egypt Excursions Online', {
      x: width - margin - 200,
      y: currentY,
      font: boldFont,
      size: 12,
      color: colors.primary,
    });

    currentY -= 16;

    if (customer?.email) {
      page.drawText(String(customer.email), {
        x: margin,
        y: currentY,
        font: font,
        size: 10,
        color: colors.secondary,
      });
    }

    page.drawText('123 Nile Street', {
      x: width - margin - 200,
      y: currentY,
      font: font,
      size: 10,
      color: colors.secondary,
    });

    currentY -= 14;

    if (customer?.phone) {
      page.drawText(String(customer.phone), {
        x: margin,
        y: currentY,
        font: font,
        size: 10,
        color: colors.secondary,
      });
    }

    page.drawText('Cairo, Egypt', {
      x: width - margin - 200,
      y: currentY,
      font: font,
      size: 10,
      color: colors.secondary,
    });

    currentY -= 30;

    // --- ITEMS TABLE ---
    // Table header
    page.drawRectangle({
      x: margin,
      y: currentY - 20,
      width: width - margin * 2,
      height: 20,
      color: colors.lightGray,
    });

    page.drawText('DESCRIPTION', {
      x: margin + 10,
      y: currentY - 12,
      font: boldFont,
      size: 10,
      color: colors.secondary,
    });

    page.drawText('QTY', {
      x: width - margin - 100,
      y: currentY - 12,
      font: boldFont,
      size: 10,
      color: colors.secondary,
    });

    page.drawText('TOTAL', {
      x: width - margin - 50,
      y: currentY - 12,
      font: boldFont,
      size: 10,
      color: colors.secondary,
    });

    currentY -= 30;

    // Items
    orderedItems.forEach((item: any, index: number) => {
      const itemTotal = calculateItemTotal(item);
      const totalParticipants = (item.quantity || 0) + (item.childQuantity || 0) + (item.infantQuantity || 0);
      
      // Item title
      const title = String(item.title ?? 'Tour Item');
      page.drawText(title, {
        x: margin + 10,
        y: currentY,
        font: font,
        size: 10,
        color: colors.primary,
        maxWidth: width - margin * 2 - 160,
      });

      // Show booking option if available
      if (item.selectedBookingOption?.title) {
        currentY -= 12;
        page.drawText(item.selectedBookingOption.title, {
          x: margin + 10,
          y: currentY,
          font: font,
          size: 8,
          color: colors.blue,
          maxWidth: width - margin * 2 - 160,
        });
      }

      // Participant breakdown
      currentY -= 12;
      const participantText = [
        item.quantity > 0 ? `${item.quantity} Adult${item.quantity > 1 ? 's' : ''}` : '',
        item.childQuantity > 0 ? `${item.childQuantity} Child${item.childQuantity > 1 ? 'ren' : ''}` : '',
        item.infantQuantity > 0 ? `${item.infantQuantity} Infant${item.infantQuantity > 1 ? 's' : ''}` : ''
      ].filter(Boolean).join(', ');

      page.drawText(participantText, {
        x: margin + 10,
        y: currentY,
        font: font,
        size: 8,
        color: colors.secondary,
      });

      // Show add-ons if any
      if (item.selectedAddOns && item.selectedAddOnDetails && Object.keys(item.selectedAddOns).length > 0) {
        currentY -= 12;
        const addOnsList = Object.entries(item.selectedAddOns)
          .map(([addOnId]) => {
            const addOnDetail = item.selectedAddOnDetails?.[addOnId];
            return addOnDetail?.title;
          })
          .filter(Boolean)
          .join(', ');
        
        page.drawText(`Add-ons: ${addOnsList}`, {
          x: margin + 10,
          y: currentY,
          font: font,
          size: 8,
          color: colors.secondary,
          maxWidth: width - margin * 2 - 160,
        });
      }

      // Reset Y to item line for quantity and total
      const itemLineY = currentY + (item.selectedBookingOption?.title ? 24 : 12);
      
      // Quantity
      page.drawText(String(totalParticipants), {
        x: width - margin - 90,
        y: itemLineY,
        font: font,
        size: 10,
        color: colors.primary,
      });

      // Total
      const totalText = `${currencySymbol}${itemTotal.toFixed(2)}`;
      const totalWidth = font.widthOfTextAtSize(totalText, 10);
      page.drawText(totalText, {
        x: width - margin - totalWidth,
        y: itemLineY,
        font: font,
        size: 10,
        color: colors.primary,
      });

      currentY -= 25;
    });

    currentY -= 20;

    // --- PRICING SUMMARY ---
    const summaryX = width - margin - 150;
    page.drawLine({ 
      start: { x: summaryX, y: currentY }, 
      end: { x: width - margin, y: currentY }, 
      thickness: 1, 
      color: colors.lineColor 
    });
    
    currentY -= 15;

    const drawSummaryRow = (label: string, value: number, isBold = false) => {
      const textFont = isBold ? boldFont : font;
      const textColor = isBold ? colors.primary : colors.secondary;
      const valueStr = `${currencySymbol}${value.toFixed(2)}`;

      page.drawText(label, {
        x: summaryX,
        y: currentY,
        font: textFont,
        size: 10,
        color: textColor,
      });

      const valueWidth = textFont.widthOfTextAtSize(valueStr, 10);
      page.drawText(valueStr, {
        x: width - margin - valueWidth,
        y: currentY,
        font: textFont,
        size: 10,
        color: textColor,
      });

      currentY -= 15;
    };

    drawSummaryRow('Subtotal', subtotal);
    drawSummaryRow('Service Fee', serviceFee);
    drawSummaryRow('Taxes & Fees', tax);
    
    if (discount > 0) {
      drawSummaryRow('Discount', -discount);
    }

    currentY -= 5;

    // Total with background
    page.drawRectangle({
      x: summaryX - 10,
      y: currentY - 5,
      width: 160,
      height: 20,
      color: colors.lightGray,
    });

    drawSummaryRow('TOTAL PAID', total, true);

    // --- BOOKING DETAILS ---
    currentY -= 30;

    page.drawText('Booking Details', {
      x: margin,
      y: currentY,
      font: boldFont,
      size: 12,
      color: colors.primary,
    });

    currentY -= 15;
    page.drawLine({ 
      start: { x: margin, y: currentY }, 
      end: { x: margin + 250, y: currentY }, 
      thickness: 1, 
      color: colors.lineColor 
    });

    currentY -= 15;

    if (booking?.date) {
      page.drawText(`Date: ${String(booking.date)}`, {
        x: margin,
        y: currentY,
        font: font,
        size: 10,
        color: colors.secondary,
      });
    }

    if (booking?.time) {
      page.drawText(`Time: ${String(booking.time)}`, {
        x: margin + 150,
        y: currentY,
        font: font,
        size: 10,
        color: colors.secondary,
      });
    }

    currentY -= 15;

    const totalGuests = orderedItems.reduce((sum: number, item: any) => {
      return sum + (item.quantity || 0) + (item.childQuantity || 0) + (item.infantQuantity || 0);
    }, 0);

    page.drawText(`Guests: ${totalGuests}`, {
      x: margin,
      y: currentY,
      font: font,
      size: 10,
      color: colors.secondary,
    });

    // --- QR CODE ---
    if (qrData && QR) {
      try {
        const pngBuffer = await QR.toBuffer(String(qrData), { type: 'png', width: 150 });
        const qrPngBuffer = Buffer.from(pngBuffer);
        const qrImage = await pdfDoc.embedPng(qrPngBuffer);
        
        const qrSize = 60;
        page.drawImage(qrImage, {
          x: width - margin - qrSize,
          y: 60,
          width: qrSize,
          height: qrSize,
        });

        page.drawText('Scan for details', {
          x: width - margin - qrSize - 5,
          y: 45,
          font: font,
          size: 8,
          color: colors.secondary,
        });
      } catch (err) {
        console.warn('QR generation failed:', err);
      }
    }

    // --- FOOTER ---
    page.drawText('Thank you for your booking. For support, contact booking@egypt-excursionsonline.com', {
      x: margin,
      y: 25,
      font: font,
      size: 8,
      color: colors.secondary,
    });

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${orderId ?? Date.now()}.pdf"`,
      },
    });

  } catch (err: any) {
    console.error('Receipt route error:', err);
    return NextResponse.json({ 
      message: 'Failed to generate receipt', 
      error: String(err?.message ?? err) 
    }, { status: 500 });
  }
}