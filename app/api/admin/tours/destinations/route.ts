import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';

export async function GET() {
  try {
    await dbConnect();
    
    // Get all destinations with tour counts
    const destinations = await Destination.aggregate([
      {
        $lookup: {
          from: 'tours',
          localField: '_id',
          foreignField: 'destination',
          as: 'tours'
        }
      },
      {
        $addFields: {
          tourCount: { $size: '$tours' }
        }
      },
      {
        $project: {
          tours: 0 // Remove the tours array, we only want the count
        }
      },
      {
        $sort: { name: 1 }
      }
    ]);

    return NextResponse.json({ success: true, data: destinations });
  } catch (error) {
    console.error('Error fetching destinations:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch destinations' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const data = await request.json();
    
    // Create new destination
    const destination = new Destination(data);
    await destination.save();
    
    return NextResponse.json({ 
      success: true, 
      data: destination,
      message: 'Destination created successfully' 
    });
  } catch (error: any) {
    console.error('Error creating destination:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return NextResponse.json({ 
        success: false, 
        error: `${field} already exists` 
      }, { status: 400 });
    }
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json({ 
        success: false, 
        error: messages.join(', ') 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create destination' 
    }, { status: 500 });
  }
}