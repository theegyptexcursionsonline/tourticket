// File: app/api/upload/route.ts

import { withAdminAudit } from '@/lib/admin/adminAudit';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import { requireAdminAuth } from '@/lib/auth/adminAuth';

// Configure Cloudinary with credentials from .env.local
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper function to convert a Buffer to a Readable Stream
function bufferToStream(buffer: Buffer): Readable {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null); // Signifies the end of the stream
  return stream;
}

async function POSTHandler(request: NextRequest) {
  try {
    const auth = await requireAdminAuth(request, { permissions: ['manageContent'] });
    if (auth instanceof NextResponse) return auth;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded.' }, { status: 400 });
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Only JPEG, PNG, WebP, and AVIF images are allowed.' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          // --- THIS IS THE REQUIRED FIX ---
          // Add the upload_preset from your environment variables
          upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
          folder: 'tours', // Optional: organize uploads in a folder
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary stream upload error:', error);
            reject(error);
          } else if (result) {
            resolve(result);
          } else {
            reject(new Error('Cloudinary returned no upload result'));
          }
        }
      );
      bufferToStream(fileBuffer).pipe(uploadStream);
    });

    return NextResponse.json({ success: true, url: result.secure_url });

  } catch (error) {
    console.error('Server-side upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    // Provide a clearer error message if the preset is missing
    if (errorMessage.toLowerCase().includes('upload preset not found')) {
        return NextResponse.json({ success: false, error: 'Server configuration error: Cloudinary upload preset is missing or invalid. Please check your .env.local file.' }, { status: 500 });
    }
    return NextResponse.json({ success: false, error: 'Upload failed on the server.' }, { status: 500 });
  }
}

export const POST = withAdminAudit(POSTHandler);
