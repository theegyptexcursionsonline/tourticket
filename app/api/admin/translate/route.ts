import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import {
  autoTranslateTour,
  autoTranslateDestination,
  autoTranslateCategory,
  autoTranslateAttractionPage,
} from '@/lib/i18n/autoTranslate';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

const VALID_MODEL_TYPES = ['tour', 'destination', 'category', 'attraction-page'] as const;
type ModelType = (typeof VALID_MODEL_TYPES)[number];
async function defaultTenantTourExists(id: string) {
  if (typeof Tour.exists === 'function') return Tour.exists({ _id: id, ...DEFAULT_TENANT_FILTER });
  // Some isolated test doubles expose only findById. Production Mongoose
  // always takes the filtered branch above.
  const doc = await Tour.findById(id).lean();
  return doc && (!doc.tenantId || doc.tenantId === 'default');
}

async function defaultTenantDestinationExists(id: string) {
  if (typeof Destination.exists === 'function') return Destination.exists({ _id: id, ...DEFAULT_TENANT_FILTER });
  const doc = await Destination.findById(id).lean() as unknown as { tenantId?: string } | null;
  return doc && (!doc.tenantId || doc.tenantId === 'default');
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { modelType, id } = (await request.json()) as {
      modelType: ModelType;
      id: string;
    };

    if (!modelType || !VALID_MODEL_TYPES.includes(modelType)) {
      return NextResponse.json(
        { success: false, error: `Invalid modelType. Must be one of: ${VALID_MODEL_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing id' },
        { status: 400 }
      );
    }

    const translators: Record<ModelType, (id: string) => Promise<void>> = {
      tour: autoTranslateTour,
      destination: autoTranslateDestination,
      category: autoTranslateCategory,
      'attraction-page': autoTranslateAttractionPage,
    };

    await dbConnect();
    const inScope = modelType === 'tour'
      ? await defaultTenantTourExists(id)
      : modelType === 'destination'
        ? await defaultTenantDestinationExists(id)
        : true;
    if (!inScope) return NextResponse.json({ success: false, error: `${modelType} not found` }, { status: 404 });

    await translators[modelType](id);

    return NextResponse.json({
      success: true,
      message: `Translations generated for ${modelType} ${id}`,
    });
  } catch (error) {
    console.error('Manual translate error:', error);
    const message = error instanceof Error ? error.message : 'Translation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
