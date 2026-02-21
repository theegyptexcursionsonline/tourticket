// lib/utils/qrcode.ts
import QRCode from 'qrcode';

export interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generate QR code as Data URL (base64 image)
 * @param text - The text/URL to encode in the QR code
 * @param options - QR code generation options
 * @returns Promise<string> - Data URL of the QR code image
 */
export async function generateQRCode(
  text: string,
  options: QRCodeOptions = {}
): Promise<string> {
  try {
    const defaultOptions = {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      ...options,
    };

    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(text, defaultOptions);
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code as buffer (for server-side usage)
 * @param text - The text/URL to encode in the QR code
 * @param options - QR code generation options
 * @returns Promise<Buffer> - Buffer of the QR code image
 */
export async function generateQRCodeBuffer(
  text: string,
  options: QRCodeOptions = {}
): Promise<Buffer> {
  try {
    const defaultOptions = {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      ...options,
    };

    // Generate QR code as buffer
    const qrCodeBuffer = await QRCode.toBuffer(text, defaultOptions);
    return qrCodeBuffer;
  } catch (error) {
    console.error('Error generating QR code buffer:', error);
    throw new Error('Failed to generate QR code buffer');
  }
}

/**
 * Generate booking verification URL
 * @param bookingReference - The unique booking reference
 * @returns string - Full URL to the booking verification page
 */
export function generateBookingVerificationURL(bookingReference: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  return `${baseUrl}/booking/verify/${bookingReference}`;
}

