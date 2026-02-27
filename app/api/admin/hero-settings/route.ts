// app/api/admin/hero-settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import HeroSettings from '@/lib/models/HeroSettings';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';

export async function GET(request: NextRequest) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();
    
    let settings = await HeroSettings.findOne({ isActive: true });

    // Migrate local paths to Cloudinary URLs
    const heroCloudinary: Record<string, string> = {
      '/hero1.jpg': 'https://res.cloudinary.com/dm3sxllch/image/upload/v1772219754/eeo/hero/hero1.jpg',
      '/hero2.jpg': 'https://res.cloudinary.com/dm3sxllch/image/upload/v1772219765/eeo/hero/hero2.jpg',
      '/hero3.jpg': 'https://res.cloudinary.com/dm3sxllch/image/upload/v1772219769/eeo/hero/hero3.jpg',
      '/hero2.png': 'https://res.cloudinary.com/dm3sxllch/image/upload/v1772219765/eeo/hero/hero2.jpg',
      '/hero3.png': 'https://res.cloudinary.com/dm3sxllch/image/upload/v1772219769/eeo/hero/hero3.jpg',
      '/uploads/hero/hero-1758831253590-1o2r7qimcmc.png': 'https://res.cloudinary.com/dm3sxllch/image/upload/v1772220313/eeo/hero/hero-1758831253590-1o2r7qimcmc.png',
      '/uploads/hero/hero-1758831785080-xs4df9a3ly.png': 'https://res.cloudinary.com/dm3sxllch/image/upload/v1772220319/eeo/hero/hero-1758831785080-xs4df9a3ly.png',
    };
    if (settings) {
      let needsSave = false;
      for (const img of settings.backgroundImages) {
        if (heroCloudinary[img.desktop]) {
          img.desktop = heroCloudinary[img.desktop];
          needsSave = true;
        }
      }
      if (settings.currentActiveImage && heroCloudinary[settings.currentActiveImage]) {
        settings.currentActiveImage = heroCloudinary[settings.currentActiveImage];
        needsSave = true;
      }
      if (needsSave) await settings.save();
    }

    if (!settings) {
      // Create default settings if none exist
      settings = new HeroSettings({
        backgroundImages: [
          {
            desktop: 'https://res.cloudinary.com/dm3sxllch/image/upload/v1772219765/eeo/hero/hero2.jpg',
            alt: 'Pyramids of Giza at sunrise',
            isActive: true,
          },
          {
            desktop: 'https://res.cloudinary.com/dm3sxllch/image/upload/v1772219754/eeo/hero/hero1.jpg',
            alt: 'Felucca on the Nile at sunset',
            isActive: false,
          },
          {
            desktop: 'https://res.cloudinary.com/dm3sxllch/image/upload/v1772219769/eeo/hero/hero3.jpg',
            alt: 'Luxor temple columns at golden hour',
            isActive: false,
          }
        ],
        currentActiveImage: 'https://res.cloudinary.com/dm3sxllch/image/upload/v1772219765/eeo/hero/hero2.jpg',
        title: {
          main: 'Explore Egypt\'s Pyramids & Nile',
        },
        searchSuggestions: [
          "Where are you going?",
          "Find your next adventure",
          "Discover hidden gems",
          "Book unique experiences",
          "Explore new destinations",
          "Create lasting memories"
        ],
        floatingTags: {
          isEnabled: true,
          tags: [
            "PYRAMID TOURS", "NILE CRUISES", "LUXOR TEMPLES", "SPHINX VISITS",
            "SUNSET FELUCCA", "ASWAN EXCURSIONS", "VALLEY OF THE KINGS", "CAMEL RIDES",
            "DESERT SAFARI", "RED SEA RESORTS", "HURGHADA DIVING", "ABU SIMBEL",
            "EGYPTIAN MUSEUM", "PHILAE TEMPLE", "LUXURY CRUISES", "CULTURAL TOURS",
            "MARKET BAZAARS", "NUBIAN VILLAGES", "ANCIENT TEMPLES", "HOT AIR BALLOON",
            "LOCAL CUISINE", "HISTORICAL SITES", "ADVENTURE SPORTS"
          ],
          animationSpeed: 5,
          tagCount: {
            desktop: 9,
            mobile: 5
          }
        },
        trustIndicators: {
          travelers: '2M+ travelers',
          rating: '4.9/5 rating',
          ratingText: '★★★★★',
          isVisible: true,
        },
        overlaySettings: {
          opacity: 0.6,
          gradientType: 'dark',
        },
        animationSettings: {
          slideshowSpeed: 6,
          fadeSpeed: 900,
          enableAutoplay: true
        },
        isActive: true,
      });
      
      await settings.save();
    }

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching hero settings:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  // Verify admin authentication
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await dbConnect();
    const body = await request.json();
    
    const settings = await HeroSettings.findOneAndUpdate(
      { isActive: true },
      body,
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error updating hero settings:', error);
    const message = error instanceof Error ? error.message : 'Unknown server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}