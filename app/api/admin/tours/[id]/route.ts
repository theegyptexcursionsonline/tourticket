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
        const { id } = params;
        
        const tour = await findTour(id);

        if (!tour) {
            return NextResponse.json({ success: false, message: "Tour not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: tour });
    } catch (error: any) {
        console.error('Error fetching tour:', error);
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
        const { id } = params;
        const body = await request.json();

        // --- THIS IS THE CORRECTED LOGIC ---
        // We will pass the 'body' directly to the update function.
        // Mongoose is smart enough to only update the fields that are present in the body.
        // This is simpler and less error-prone.

        // Ensure category is correctly assigned from categories array if it exists
        if (body.categories && body.categories.length > 0) {
            body.category = body.categories[0];
        }

        // Map 'faqs' from form to 'faq' in the database model
        if (body.faqs) {
            body.faq = body.faqs;
            delete body.faqs; // remove the incorrect field before updating
        }

        const updatedTour = await Tour.findByIdAndUpdate(
            id,
            body, // Pass the entire body directly
            { 
              new: true, 
              runValidators: true 
            }
        );
        
        if (!updatedTour) {
            return NextResponse.json({ success: false, error: "Tour not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedTour });
        
    } catch (error: any) {
        console.error('Tour update error:', error);
        
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0];
            return NextResponse.json({ 
                success: false, 
                error: `A tour with this ${field} already exists` 
            }, { status: 409 });
        }
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map((err: any) => err.message);
            return NextResponse.json({ 
                success: false, 
                error: `Validation failed: ${validationErrors.join(', ')}` 
            }, { status: 400 });
        }

        return NextResponse.json({ 
            success: false, 
            error: error.message || 'An unexpected error occurred while updating the tour'
        }, { status: 500 });
    }
}

// DELETE a tour by ID or Slug
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await dbConnect();
        const { id } = params;

        let deletedTour;
        
        if (mongoose.Types.ObjectId.isValid(id)) {
            deletedTour = await Tour.findByIdAndDelete(id);
        } else {
            deletedTour = await Tour.findOneAndDelete({ slug: id });
        }

        if (!deletedTour) {
            return NextResponse.json({ success: false, error: "Tour not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: {} });
        
    } catch (error: any) {
        console.error('Tour deletion error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'An unexpected error occurred while deleting the tour'
        }, { status: 500 });
    }
}