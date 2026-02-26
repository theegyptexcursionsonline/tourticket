import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import {
  autoTranslateTour,
  autoTranslateDestination,
  autoTranslateCategory,
} from '@/lib/i18n/autoTranslate';

const VALID_MODEL_TYPES = ['tour', 'destination', 'category'] as const;
type ModelType = (typeof VALID_MODEL_TYPES)[number];

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
    };

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
