// app/api/admin/fix-data/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';

export async function POST() {
  // Verify admin authentication
  const auth = await verifyAdmin();
  if (auth instanceof NextResponse) return auth;

  await dbConnect();
  
  try {
    // Delete the problematic entries
    await Destination.deleteMany({
      name: { $in: ['paris', 'paris 2'] }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cleaned up existing destinations' 
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}