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

// Helper function to clean booking options
function cleanBookingOptions(bookingOptions: any[]): any[] {
    if (!Array.isArray(bookingOptions)) return [];
    
    return bookingOptions.map(option => {
        const cleanedOption = { ...option };
        
        // Remove empty or invalid difficulty values
        if (!cleanedOption.difficulty || cleanedOption.difficulty.trim() === '') {
            delete cleanedOption.difficulty;
        } else {
            // Ensure difficulty is one of the valid enum values
            const validDifficulties = ['Easy', 'Moderate', 'Challenging', 'Difficult'];
            if (!validDifficulties.includes(cleanedOption.difficulty)) {
                delete cleanedOption.difficulty;
            }
        }
        
        // Clean other optional fields
        if (!cleanedOption.badge || cleanedOption.badge.trim() === '') {
            delete cleanedOption.badge;
        }
        
        if (!cleanedOption.description || cleanedOption.description.trim() === '') {
            delete cleanedOption.description;
        }
        
        if (!cleanedOption.duration || cleanedOption.duration.trim() === '') {
            delete cleanedOption.duration;
        }
        
        if (!cleanedOption.groupSize || cleanedOption.groupSize.trim() === '') {
            delete cleanedOption.groupSize;
        }
        
        // Ensure arrays are properly handled
        if (!Array.isArray(cleanedOption.languages)) {
            cleanedOption.languages = [];
        }
        
        if (!Array.isArray(cleanedOption.highlights)) {
            cleanedOption.highlights = [];
        }
        
        // Ensure numeric fields are properly typed
        if (cleanedOption.price) {
            cleanedOption.price = Number(cleanedOption.price);
        }
        
        if (cleanedOption.originalPrice) {
            cleanedOption.originalPrice = Number(cleanedOption.originalPrice);
        }
        
        if (cleanedOption.discount) {
            cleanedOption.discount = Number(cleanedOption.discount);
        }
        
        return cleanedOption;
    });
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
        console.log('Request body:', body);

        // Map 'faqs' from form to 'faq' in the database model
        if (body.faqs) {
            body.faq = body.faqs;
            delete body.faqs;
        }

        // Clean booking options to remove invalid enum values
        if (body.bookingOptions && Array.isArray(body.bookingOptions)) {
            body.bookingOptions = cleanBookingOptions(body.bookingOptions);
        }

        // Validate required fields
        if (!body.title || !body.description || !body.duration || !body.discountPrice || !body.destination || !body.category) {
            return NextResponse.json({ 
                success: false, 
                error: 'Missing required fields: title, description, duration, discountPrice, destination, category' 
            }, { status: 400 });
        }

        // Validate ObjectIds
        if (!mongoose.Types.ObjectId.isValid(body.destination)) {
            return NextResponse.json({ 
                success: false, 
                error: 'Invalid destination ID format' 
            }, { status: 400 });
        }

        if (!mongoose.Types.ObjectId.isValid(body.category)) {
            return NextResponse.json({ 
                success: false, 
                error: 'Invalid category ID format' 
            }, { status: 400 });
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

        if (error.name === 'CastError') {
            return NextResponse.json({ 
                success: false, 
                error: `Invalid ${error.path}: ${error.value}` 
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