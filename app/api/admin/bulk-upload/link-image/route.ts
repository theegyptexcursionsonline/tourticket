import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import AttractionPage from '@/lib/models/AttractionPage';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';

const models = {
    Tours: Tour,
    Destinations: Destination,
    Attractions: AttractionPage
};

export async function POST(req: NextRequest) {
    // Verify admin authentication
    const auth = await verifyAdmin(req);
    if (auth instanceof NextResponse) return auth;

    await dbConnect();

    try {
        const { docId, modelType, imageField, imageUrl } = await req.json();

        if (!docId || !modelType || !imageField || !imageUrl) {
            return NextResponse.json({ success: false, error: 'Missing required parameters.' }, { status: 400 });
        }
        
        const Model = models[modelType as keyof typeof models];
        if (!Model) {
            return NextResponse.json({ success: false, error: 'Invalid model type.' }, { status: 400 });
        }

        if (!mongoose.Types.ObjectId.isValid(docId)) {
            return NextResponse.json({ success: false, error: 'Invalid document ID.' }, { status: 400 });
        }

        const updateResult = await Model.updateOne(
            { _id: docId },
            { $set: { [imageField]: imageUrl } }
        );

        if (updateResult.matchedCount === 0) {
            return NextResponse.json({ success: false, error: 'Document not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Image linked successfully.' });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: 'An unexpected server error occurred.', details: error.message }, { status: 500 });
    }
}