import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

export async function PUT(
  request: Request,
  { params }: { params: { tourId: string } }
) {
  try {
    await dbConnect();
    
    const { index, option } = await request.json();
    const { tourId } = params;

    const tour = await Tour.findById(tourId);
    if (!tour) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }

    // Ensure bookingOptions array exists
    if (!tour.bookingOptions) {
      tour.bookingOptions = [];
    }

    // Update or add the option at the specified index
    if (index < tour.bookingOptions.length) {
      tour.bookingOptions[index] = option;
    } else {
      tour.bookingOptions.push(option);
    }

    await tour.save();

    return NextResponse.json({ 
      success: true, 
      message: 'Booking option updated successfully',
      bookingOptions: tour.bookingOptions 
    });

  } catch (error: any) {
    console.error('Update booking option error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update booking option' },
      { status: 500 }
    );
  }
}