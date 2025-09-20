import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Tour from "@/lib/models/Tour";
import Destination from "@/lib/models/Destination";
import Category from "@/lib/models/Category";
import mongoose from "mongoose";

// Helper function to find a tour by ID or Slug with safe population
async function findTour(identifier: string) {
    try {
        let tour;
        
        if (mongoose.Types.ObjectId.isValid(identifier)) {
            tour = await Tour.findById(identifier);
        } else {
            tour = await Tour.findOne({ slug: identifier });
        }

        if (!tour) {
            return null;
        }

        // Manually populate to avoid potential circular reference issues
        if (tour.category) {
            try {
                const category = await Category.findById(tour.category);
                tour.category = category;
            } catch (err) {
                console.warn('Failed to populate category:', err);
            }
        }

        if (tour.destination) {
            try {
                const destination = await Destination.findById(tour.destination);
                tour.destination = destination;
            } catch (err) {
                console.warn('Failed to populate destination:', err);
            }
        }

        return tour;
    } catch (error) {
        console.error('Error in findTour:', error);
        throw error;
    }
}

// GET a single tour by ID or Slug
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await dbConnect();
        const { id } = params;
        
        console.log('Fetching tour with ID:', id);
        
        const tour = await findTour(id);

        if (!tour) {
            console.log('Tour not found for ID:', id);
            return NextResponse.json({ success: false, message: "Tour not found" }, { status: 404 });
        }

        console.log('Tour found successfully');
        return NextResponse.json({ success: true, data: tour });
        
    } catch (error: any) {
        console.error('Error fetching tour:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || 'Failed to fetch tour',
            error: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
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

        console.log('Updating tour with ID:', id);

        // Ensure category is correctly assigned from categories array if it exists
        if (body.categories && body.categories.length > 0) {
            body.category = body.categories[0];
            delete body.categories; // Remove to avoid confusion
        }

        // Map 'faqs' from form to 'faq' in the database model
        if (body.faqs) {
            body.faq = body.faqs;
            delete body.faqs;
        }

        // Ensure availability has proper structure
        if (body.availability) {
            if (!body.availability.type) {
                body.availability.type = 'daily';
            }
            if (!body.availability.slots || body.availability.slots.length === 0) {
                body.availability.slots = [{ time: '10:00', capacity: 10 }];
            }
            if (!body.availability.availableDays) {
                body.availability.availableDays = [0, 1, 2, 3, 4, 5, 6];
            }
        } else {
            body.availability = {
                type: 'daily',
                availableDays: [0, 1, 2, 3, 4, 5, 6],
                slots: [{ time: '10:00', capacity: 10 }]
            };
        }

        const updatedTour = await Tour.findByIdAndUpdate(
            id,
            body,
            { 
                new: true, 
                runValidators: true,
                upsert: false
            }
        );
        
        if (!updatedTour) {
            return NextResponse.json({ success: false, error: "Tour not found" }, { status: 404 });
        }

        console.log('Tour updated successfully');
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