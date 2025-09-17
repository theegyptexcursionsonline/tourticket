import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Tour from "@/lib/models/Tour";
import mongoose from "mongoose";

// Helper function to find a tour by ID or Slug
async function findTour(identifier: string) {
    if (mongoose.Types.ObjectId.isValid(identifier)) {
        return Tour.findById(identifier).populate('category').populate('destination');
    }
    return Tour.findOne({ slug: identifier }).populate('category').populate('destination');
}

// GET a single tour by ID or Slug
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await dbConnect();
        const tour = await findTour(params.id);

        if (!tour) {
            return NextResponse.json({ success: false, message: "Tour not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: tour });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

// UPDATE a tour by ID or Slug
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await dbConnect();
        const body = await request.json();

        let updatedTour;
        const options = { new: true, runValidators: true };

        if (mongoose.Types.ObjectId.isValid(params.id)) {
            updatedTour = await Tour.findByIdAndUpdate(params.id, body, options);
        } else {
            updatedTour = await Tour.findOneAndUpdate({ slug: params.id }, body, options);
        }
        
        if (!updatedTour) {
            return NextResponse.json({ success: false, error: "Tour not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedTour });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

// DELETE a tour by ID or Slug
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await dbConnect();

        let deletedTour;
        if (mongoose.Types.ObjectId.isValid(params.id)) {
            deletedTour = await Tour.findByIdAndDelete(params.id);
        } else {
            deletedTour = await Tour.findOneAndDelete({ slug: params.id });
        }

        if (!deletedTour) {
            return NextResponse.json({ success: false, error: "Tour not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: {} });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}