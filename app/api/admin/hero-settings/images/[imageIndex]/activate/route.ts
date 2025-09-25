// app/api/admin/hero-settings/images/[imageIndex]/activate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import HeroSettings from '@/lib/models/HeroSettings';

export async function PUT(
  request: NextRequest,
  { params }: { params: { imageIndex: string } }
) {
  try {
    await dbConnect();
    
    const heroSettings = await HeroSettings.findOne({ isActive: true });
    
    if (!heroSettings) {
      return NextResponse.json(
        { success: false, error: 'Hero settings not found' },
        { status: 404 }
      );
    }

    const imageIndex = parseInt(params.imageIndex);
    
    if (imageIndex < 0 || imageIndex >= heroSettings.backgroundImages.length) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    // Deactivate all images and activate the selected one
    heroSettings.backgroundImages.forEach((img, index) => {
      img.isActive = index === imageIndex;
    });

    heroSettings.currentActiveImage = heroSettings.backgroundImages[imageIndex].desktop;
    await heroSettings.save();

    return NextResponse.json({
      success: true,
      data: heroSettings,
      message: 'Active image updated successfully'
    });
  } catch (error) {
    console.error('Error setting active image:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}