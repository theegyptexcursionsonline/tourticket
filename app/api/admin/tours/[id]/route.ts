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
        const { id } = await params;
        
        console.log(`Fetching tour with identifier: ${id}`);
        
        const tour = await findTour(id);

        if (!tour) {
            console.log(`Tour not found with identifier: ${id}`);
            return NextResponse.json({ success: false, message: "Tour not found" }, { status: 404 });
        }

        console.log(`Successfully found tour: ${tour.title}`);
        return NextResponse.json({ success: true, data: tour });
    } catch (error: any) {
        console.error('Error fetching tour:', error);
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
        const { id } = await params;
        const body = await request.json();

        console.log(`Updating tour with identifier: ${id}`);
        console.log('Request body received:', JSON.stringify(body, null, 2));

        // Extract all the fields from the request body
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
            faqs,  // Form sends 'faqs'
            bookingOptions,
            addOns,
            isPublished,
            difficulty,
            maxGroupSize,
            tags,
            isFeatured,
            availability,
            // Additional fields that might be present
            price,
            cancellationPolicy,
            meetingPoint,
            languages,
            ageRestriction,
            operatedBy,
            location,
            ...otherFields
        } = body;

        // Validate required fields
        if (!title || !slug || !description || !duration || discountPrice === undefined) {
            return NextResponse.json({ 
                success: false, 
                error: "Missing required fields: title, slug, description, duration, or discountPrice" 
            }, { status: 400 });
        }

        // Process tags (convert string to array if needed)
        let processedTags = tags;
        if (typeof tags === 'string') {
            processedTags = tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
        }

        // Process availability with defaults
        const processedAvailability = availability && typeof availability === 'object' ? {
            type: availability.type || 'daily',
            availableDays: availability.availableDays || [0, 1, 2, 3, 4, 5, 6],
            slots: availability.slots && Array.isArray(availability.slots) ? availability.slots : [{ time: '10:00', capacity: 10 }],
            blockedDates: availability.blockedDates || []
        } : {
            type: 'daily',
            availableDays: [0, 1, 2, 3, 4, 5, 6],
            slots: [{ time: '10:00', capacity: 10 }]
        };

        // Build update object with proper field mapping
        const updateData = {
            $set: {
                title: title.trim(),
                slug: slug.toLowerCase().trim(),
                description: description.trim(),
                longDescription: longDescription ? longDescription.trim() : description.trim(),
                duration: duration.trim(),
                discountPrice: parseFloat(discountPrice) || 0,
                originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
                destination: destination,
                category: categories?.[0] || category, // Handle both category and categories
                // FIX: Only update image if a new one is provided and not empty
                ...(image && image.trim() !== '' && { image: image }),
                images: Array.isArray(images) ? images : [],
                highlights: Array.isArray(highlights) ? highlights.filter(Boolean) : [],
                includes: Array.isArray(includes) ? includes.filter(Boolean) : [],
                whatsIncluded: Array.isArray(whatsIncluded) ? whatsIncluded.filter(Boolean) : [],
                whatsNotIncluded: Array.isArray(whatsNotIncluded) ? whatsNotIncluded.filter(Boolean) : [],
                itinerary: Array.isArray(itinerary) ? itinerary : [],
                faq: Array.isArray(faqs) ? faqs : [], // CRITICAL: Map 'faqs' from form to 'faq' in model
                bookingOptions: Array.isArray(bookingOptions) ? bookingOptions : [],
                addOns: Array.isArray(addOns) ? addOns : [],
                isPublished: Boolean(isPublished),
                difficulty: difficulty || 'Easy',
                maxGroupSize: parseInt(maxGroupSize) || 10,
                tags: Array.isArray(processedTags) ? processedTags : [],
                isFeatured: Boolean(isFeatured),
                availability: processedAvailability,
                // Additional fields
                price: price ? parseFloat(price) : parseFloat(discountPrice) || 0,
                cancellationPolicy: cancellationPolicy || 'Free cancellation up to 24 hours in advance',
                meetingPoint: meetingPoint || '',
                languages: Array.isArray(languages) ? languages : ['English'],
                ageRestriction: ageRestriction || 'Suitable for all ages',
                operatedBy: operatedBy || '',
                location: location || null,
                // Include any other fields that might be needed
                ...otherFields,
                // Update timestamps
                updatedAt: new Date()
            }
        };

        console.log('Update data prepared:', JSON.stringify(updateData, null, 2));
        console.log('Image field being saved:', image); // Add this line

        let updatedTour;
        const options = { 
            new: true, 
            runValidators: true,
            // Include populated fields in response
            populate: [
                { path: 'category', select: 'name slug' },
                { path: 'destination', select: 'name slug' }
            ]
        };

        // Try to update by ID first, then by slug
        if (mongoose.Types.ObjectId.isValid(id)) {
            console.log(`Updating tour by ID: ${id}`);
            updatedTour = await Tour.findByIdAndUpdate(id, updateData, options);
        } else {
            console.log(`Updating tour by slug: ${id}`);
            updatedTour = await Tour.findOneAndUpdate({ slug: id }, updateData, options);
        }
        
        if (!updatedTour) {
            console.log(`Tour not found for update with identifier: ${id}`);
            return NextResponse.json({ success: false, error: "Tour not found" }, { status: 404 });
        }

        console.log(`Successfully updated tour: ${updatedTour.title}`);
        return NextResponse.json({ success: true, data: updatedTour });
        
    } catch (error: any) {
        console.error('Tour update error:', error);
        
        // Handle specific MongoDB errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0];
            return NextResponse.json({ 
                success: false, 
                error: `A tour with this ${field} already exists` 
            }, { status: 409 });
        }
        
        // Handle validation errors
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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        console.log(`Deleting tour with identifier: ${id}`);

        let deletedTour;
        
        if (mongoose.Types.ObjectId.isValid(id)) {
            console.log(`Deleting tour by ID: ${id}`);
            deletedTour = await Tour.findByIdAndDelete(id);
        } else {
            console.log(`Deleting tour by slug: ${id}`);
            deletedTour = await Tour.findOneAndDelete({ slug: id });
        }

        if (!deletedTour) {
            console.log(`Tour not found for deletion with identifier: ${id}`);
            return NextResponse.json({ success: false, error: "Tour not found" }, { status: 404 });
        }

        console.log(`Successfully deleted tour: ${deletedTour.title}`);
        return NextResponse.json({ success: true, data: {} });
        
    } catch (error: any) {
        console.error('Tour deletion error:', error);
        return NextResponse.json({ 
            success: false, 
            error: error.message || 'An unexpected error occurred while deleting the tour'
        }, { status: 500 });
    }
}