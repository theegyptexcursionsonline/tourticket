import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Buffer } from 'buffer';
import fs from 'fs/promises';
import path from 'path';

// Helper function to convert hex colors to a format pdf-lib understands
const hexToPdfLibRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return rgb(0, 0, 0);
  return rgb(
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  );
};

export async function POST(request: NextRequest) {
  try {
    // --- Data Parsing ---
    const body = await request.json();
    const { orderId, customer, orderedItems, pricing, notes } = body;
    const currencySymbol = pricing?.symbol || '$';

    // --- Document Setup ---
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const margin = 50;

    // --- Asset Loading ---
    const fontBytes = await fs.readFile(path.join(process.cwd(), 'public/fonts/Roboto-Regular.ttf'));
    const fontBoldBytes = await fs.readFile(path.join(process.cwd(), 'public/fonts/Roboto-Bold.ttf'));
    const logoPath = path.join(process.cwd(), 'public/EEO-logo.png');
    const logoBytes = await fs.readFile(logoPath);
    
    pdfDoc.registerFontkit({
        create: () => ({
            regular: fontBytes,
            bold: fontBoldBytes,
        })
    });
    const customFont = await pdfDoc.embedFont('regular');
    const customBoldFont = await pdfDoc.embedFont('bold');
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const logoDims = logoImage.scale(0.25); // Adjust logo size

    // --- Colors ---
    const colors = {
      primary: hexToPdfLibRgb('#111827'), // Dark Gray
      secondary: hexToPdfLibRgb('#6B7280'), // Medium Gray
      accent: hexToPdfLibRgb('#EF4444'), // Red
      lightGray: hexToPdfLibRgb('#F3F4F6'), // Light Gray for background
      lineColor: hexToPdfLibRgb('#E5E7EB'),
    };

    // --- Header ---
    page.drawRectangle({
      x: 0,
      y: height - 120,
      width,
      height: 120,
      color: colors.lightGray,
    });
    page.drawImage(logoImage, {
      x: margin,
      y: height - margin - logoDims.height + 20,
      width: logoDims.width,
      height: logoDims.height,
    });
    page.drawText('INVOICE / RECEIPT', {
      x: width - margin - 200,
      y: height - margin,
      font: customBoldFont,
      size: 24,
      color: colors.primary,
    });
    page.drawText(`Order ID: ${orderId ?? `ORD-${Date.now()}`}`, {
        x: width - margin - 200,
        y: height - margin - 25,
        font: customFont,
        size: 10,
        color: colors.secondary,
    });

    let y = height - 160;

    // --- Billing Info ---
    page.drawText('BILLED TO', { x: margin, y, font: customBoldFont, size: 10, color: colors.secondary });
    page.drawText('FROM', { x: width / 2, y, font: customBoldFont, size: 10, color: colors.secondary });
    y -= 15;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: colors.lineColor });
    y -= 20;

    page.drawText(customer?.name || 'Valued Customer', { x: margin, y, font: customBoldFont, size: 12, color: colors.primary });
    page.drawText('Egypt Excursions Online', { x: width / 2, y, font: customBoldFont, size: 12, color: colors.primary });
    y -= 15;
    page.drawText(customer?.email || '', { x: margin, y, font: customFont, size: 10, color: colors.secondary });
    page.drawText('123 Nile Street', { x: width / 2, y, font: customFont, size: 10, color: colors.secondary });
    y -= 15;
    page.drawText(customer?.phone || '', { x: margin, y, font: customFont, size: 10, color: colors.secondary });
    page.drawText('Cairo, Egypt', { x: width / 2, y, font: customFont, size: 10, color: colors.secondary });

    y -= 40;

    // --- Table Header ---
    page.drawRectangle({ x: margin, y: y - 10, width: width - margin * 2, height: 30, color: colors.lightGray, opacity: 0.5 });
    y -= 5;
    page.drawText('DESCRIPTION', { x: margin + 15, y, font: customBoldFont, size: 10, color: colors.secondary });
    page.drawText('QTY', { x: width - margin - 150, y, font: customBoldFont, size: 10, color: colors.secondary });
    page.drawText('TOTAL', { x: width - margin - 60, y, font: customBoldFont, size: 10, color: colors.secondary });
    y -= 25;

    // --- Table Rows ---
    orderedItems.forEach((item: any, i: number) => {
      const rowY = y;
      const title = item.title ?? 'Item';
      const qty = Number(item.quantity ?? 1);
      const total = (Number(item.discountPrice ?? 0) * qty).toFixed(2);
      
      if (i % 2 !== 0) { // Alternating row color
          page.drawRectangle({ x: margin, y: rowY - 15, width: width - margin * 2, height: 30, color: colors.lightGray, opacity: 0.5 });
      }

      page.drawText(title, { x: margin + 15, y: rowY - 5, font: customFont, size: 10, color: colors.primary, maxWidth: 300 });
      page.drawText(String(qty), { x: width - margin - 150, y: rowY - 5, font: customFont, size: 10, color: colors.primary });
      const totalText = `${currencySymbol}${total}`;
      const totalWidth = customFont.widthOfTextAtSize(totalText, 10);
      page.drawText(totalText, { x: width - margin - totalWidth, y: rowY - 5, font: customFont, size: 10, color: colors.primary });
      
      y -= 30;
    });
    
    y -= 10;
    page.drawLine({ start: { x: width / 2, y }, end: { x: width - margin, y }, thickness: 1, color: colors.lineColor });
    y -= 25;
    
    // --- Pricing Summary ---
    const drawTotalRow = (label: string, value: string, isBold = false) => {
      const font = isBold ? customBoldFont : customFont;
      const color = isBold ? colors.primary : colors.secondary;
      page.drawText(label, { x: width - margin - 200, y, font, size: 10, color });
      const valueWidth = font.widthOfTextAtSize(value, 10);
      page.drawText(value, { x: width - margin - valueWidth, y, font, size: 10, color });
      y -= 20;
    };

    drawTotalRow('Subtotal', `${currencySymbol}${(pricing.subtotal ?? 0).toFixed(2)}`);
    drawTotalRow('Service Fee', `${currencySymbol}${(pricing.serviceFee ?? 0).toFixed(2)}`);
    drawTotalRow('Taxes & Fees', `${currencySymbol}${(pricing.tax ?? 0).toFixed(2)}`);
    if ((pricing.discount ?? 0) > 0) {
      drawTotalRow('Discount', `-${currencySymbol}${(pricing.discount ?? 0).toFixed(2)}`);
    }
    y -= 10;

    page.drawRectangle({ x: width / 2 - 25, y: y + 10, width: width / 2 - margin + 25, height: 35, color: colors.lightGray });
    drawTotalRow('TOTAL PAID', `${currencySymbol}${(pricing.total ?? 0).toFixed(2)}`, true);
    y -= 20;

    // --- Footer ---
    const footerY = margin + 20;
    page.drawLine({ start: { x: margin, y: footerY }, end: { x: width - margin, y: footerY }, thickness: 1, color: colors.lineColor });
    const footerText = 'Thank you for your business! If you have any questions, please contact support@example.com.';
    const footerWidth = customFont.widthOfTextAtSize(footerText, 8);
    page.drawText(footerText, { x: (width - footerWidth) / 2, y: footerY - 20, font: customFont, size: 8, color: colors.secondary });

    const pdfBytes = await pdfDoc.save();
    const finalBuffer = Buffer.from(pdfBytes);

    return new NextResponse(finalBuffer, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="receipt-${orderId}.pdf"` },
    });

  } catch (err: unknown) {
    console.error('Receipt generation error:', err);
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    return NextResponse.json({ message: 'Failed to generate receipt', error: errorMessage }, { status: 500 });
  }
}