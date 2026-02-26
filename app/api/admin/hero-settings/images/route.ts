// app/api/admin/hero-settings/images/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import HeroSettings from '@/lib/models/HeroSettings';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';

export async function POST(request: NextRequest) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();
    const { imageData } = await request.json();
    
    if (!imageData.desktop || !imageData.alt) {
      return NextResponse.json(
        { success: false, error: 'Desktop image and alt text are required' },
        { status: 400 }
      );
    }

    const heroSettings = await HeroSettings.findOne({ isActive: true });
    
    if (!heroSettings) {
      return NextResponse.json(
        { success: false, error: 'Hero settings not found' },
        { status: 404 }
      );
    }

    // If this should be the active image, deactivate others
    if (imageData.isActive) {
      heroSettings.backgroundImages.forEach(img => {
        img.isActive = false;
      });
    }

    // Add new image
    heroSettings.backgroundImages.push(imageData);
    await heroSettings.save();

    return NextResponse.json({
      success: true,
      data: heroSettings,
      message: 'Background image added successfully'
    });
  } catch (error) {
    console.error('Error adding background image:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}