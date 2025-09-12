// app/api/admin/categories/route.ts
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import { NextResponse } from 'next/server';

// GET all categories
export async function GET() {
  await dbConnect();
  try {
    const categories = await Category.find({}).sort({ name: 1 });
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}

// POST a new category
export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    // Basic validation
    if (!body.name || !body.slug) {
        return NextResponse.json({ success: false, error: "Name and slug are required" }, { status: 400 });
    }
    const category = await Category.create(body);
    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 400 });
  }
}