// app/api/admin/discounts/[id]/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Discount from '@/lib/models/Discount';

// --- PATCH: Update a specific discount (e.g., toggle its status) ---
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  await dbConnect();

  try {
    const body = await request.json();
    const { isActive } = body; // Expecting something like { isActive: true/false }

    const updatedDiscount = await Discount.findByIdAndUpdate(
      id,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!updatedDiscount) {
      return NextResponse.json({ message: 'Discount not found' }, { status: 404 });
    }

    return NextResponse.json(updatedDiscount);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to update discount', error: (error as Error).message }, { status: 500 });
  }
}


// --- DELETE: Remove a specific discount ---
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  await dbConnect();

  try {
    const deletedDiscount = await Discount.findByIdAndDelete(id);

    if (!deletedDiscount) {
      return NextResponse.json({ message: 'Discount not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Discount deleted successfully' });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to delete discount', error: (error as Error).message }, { status: 500 });
  }
}