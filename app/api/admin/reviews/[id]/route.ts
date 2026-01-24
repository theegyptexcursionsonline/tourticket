// app/api/admin/reviews/[id]/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Review from '@/lib/models/Review';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';

// --- PATCH: Update a specific review (e.g., approve it) ---
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const auth = await verifyAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await dbConnect();

  try {
    const body = await request.json();
    const { verified } = body; // Expecting { verified: true }

    const updatedReview = await Review.findByIdAndUpdate(
      id,
      { verified },
      { new: true, runValidators: true }
    );

    if (!updatedReview) {
      return NextResponse.json({ message: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json(updatedReview);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to update review', error: (error as Error).message }, { status: 500 });
  }
}

// --- DELETE: Remove a specific review ---
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify admin authentication
  const auth = await verifyAdmin();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await dbConnect();

  try {
    const deletedReview = await Review.findByIdAndDelete(id);

    if (!deletedReview) {
      return NextResponse.json({ message: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Review deleted successfully' });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to delete review', error: (error as Error).message }, { status: 500 });
  }
}