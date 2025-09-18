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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params; // Await params first
        const tour = await findTour(id);

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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params; // Await params first
        const body = await request.json();

        // Extract all the new fields from the request body
        const {
            title,
            slug,
            description,
            longDescription,
            duration,
            discountPrice,
            originalPrice,
            destination,
            category,
            categories,
            image,
            images,
            highlights,
            includes,
            whatsIncluded,
            whatsNotIncluded,
            itinerary,
            faqs,
            bookingOptions,
            addOns,
            isPublished,
            difficulty,
            maxGroupSize,
            tags,
            isFeatured,
            availability,
            ...otherFields
        } = body;

        // Build update object with all fields
        const updateData = {
            $set: {
                title,
                slug,
                description,
                longDescription,
                duration,
                discountPrice: parseFloat(discountPrice) || 0,
                originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
                destination,
                category: categories?.[0] || category, // Handle both category and categories
                image,
                images: images || [],
                highlights: highlights || [],
                includes: includes || [],
                whatsIncluded: whatsIncluded || [],
                whatsNotIncluded: whatsNotIncluded || [],
                itinerary: itinerary || [],
                faq: faqs || [], // Note: model uses 'faq', form uses 'faqs'
                bookingOptions: bookingOptions || [],
                addOns: addOns || [],
                isPublished: Boolean(isPublished),
                difficulty: difficulty || '',
                maxGroupSize: parseInt(maxGroupSize) || 10,
                tags: tags || [],
                isFeatured: Boolean(isFeatured),
                availability: availability || {
                    type: 'daily',
                    availableDays: [0, 1, 2, 3, 4, 5, 6],
                    slots: [{ time: '10:00', capacity: 10 }]
                },
                ...otherFields
            }
        };

        let updatedTour;
        const options = { new: true, runValidators: true };

        if (mongoose.Types.ObjectId.isValid(id)) {
            updatedTour = await Tour.findByIdAndUpdate(id, updateData, options);
        } else {
            updatedTour = await Tour.findOneAndUpdate({ slug: id }, updateData, options);
        }
        
        if (!updatedTour) {
            return NextResponse.json({ success: false, error: "Tour not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updatedTour });
    } catch (error: any) {
        console.error('Tour update error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

// DELETE a tour by ID or Slug
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params; // Await params first

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
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}