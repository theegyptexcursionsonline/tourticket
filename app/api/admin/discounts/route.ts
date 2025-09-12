// app/api/admin/discounts/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Discount from '@/lib/models/Discount';

// GET all discounts
export async function GET() {
  await dbConnect();
  try {
    const discounts = await Discount.find({}).sort({ createdAt: -1 });
    return NextResponse.json(discounts);
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch discounts', error: (error as Error).message }, { status: 500 });
  }
}

// POST a new discount
export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    
    // Check if a discount with the same code already exists
    const existingDiscount = await Discount.findOne({ code: body.code.toUpperCase() });
    if (existingDiscount) {
        return NextResponse.json({ message: `Discount code '${body.code}' already exists.` }, { status: 409 });
    }

    const newDiscount = new Discount(body);
    await newDiscount.save();
    
    return NextResponse.json(newDiscount, { status: 201 });
  } catch (error: any) {
    // Handle validation errors specifically
    if (error.name === 'ValidationError') {
        let errors: { [key: string]: string } = {};
        for (const field in error.errors) {
            errors[field] = error.errors[field].message;
        }
        return NextResponse.json({ message: 'Validation failed', errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to create discount', error: error.message }, { status: 500 });
  }
}