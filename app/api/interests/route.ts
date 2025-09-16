// app/api/interests/route.ts - REPLACE COMPLETELY
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Tour from '@/lib/models/Tour';

export async function GET() {
  await dbConnect();

  try {
    console.log('Fetching dynamic interests...');
    
    // Fetch all categories from the database
    const categories = await Category.find({}).lean();
    console.log('Categories found:', categories.length);

    // For each category, count the number of tours associated with it
    const interestsWithCounts = await Promise.all(
      categories.map(async (category) => {
        const tourCount = await Tour.countDocuments({ category: category._id });
        console.log(`Category ${category.name}: ${tourCount} tours`);
        return {
          name: category.name,
          slug: category.slug,
          products: tourCount,
        };
      })
    );

    console.log('Final interests:', interestsWithCounts);
    return NextResponse.json({ success: true, data: interestsWithCounts });
  } catch (error) {
    console.error('Failed to fetch interests:', error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch interests." },
      { status: 500 }
    );
  }
}