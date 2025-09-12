// app/api/admin/categories/[id]/route.ts
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import { NextResponse } from 'next/server';

interface Params {
  id: string;
}

// PUT (update) a category
export async function PUT(request: Request, { params }: { params: Params }) {
  await dbConnect();
  try {
    const body = await request.json();
    if (!body.name || !body.slug) {
        return NextResponse.json({ success: false, error: "Name and slug are required" }, { status: 400 });
    }
    const category = await Category.findByIdAndUpdate(params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!category) {
      return NextResponse.json({ success: false, message: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}

// DELETE a category
export async function DELETE(request: Request, { params }: { params: Params }) {
  await dbConnect();
  try {
    const deletedCategory = await Category.deleteOne({ _id: params.id });
    if (deletedCategory.deletedCount === 0) {
      return NextResponse.json({ success: false, message: 'Category not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}