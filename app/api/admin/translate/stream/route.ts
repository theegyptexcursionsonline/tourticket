import { verifyAdmin } from '@/lib/auth/verifyAdmin';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import AttractionPage from '@/lib/models/AttractionPage';
import {
  translateEntityFieldsForLocale,
  translateTourContentForLocale,
  translateStructuredSpecContentForLocale,
  extractFields,
  extractStructuredTourContent,
  extractStructuredSpecContent,
} from '@/lib/i18n/autoTranslate';
import {
  translatableLocales,
  localeNames,
  tourTranslationFields,
  destinationTranslationFields,
  categoryTranslationFields,
  attractionPageTranslationFields,
  destinationStructuredFields,
  categoryStructuredFields,
  attractionPageStructuredFields,
  type StructuredTranslationSpec,
} from '@/lib/i18n/translationFields';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { revalidateStorefrontContent } from '@/lib/storefront/revalidateTourStorefront';

const VALID_MODEL_TYPES = ['tour', 'destination', 'category', 'attraction-page'] as const;
type ModelType = (typeof VALID_MODEL_TYPES)[number];

export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth instanceof NextResponse) return auth;

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

  const fieldDefsMap = {
    tour: tourTranslationFields,
    destination: destinationTranslationFields,
    category: categoryTranslationFields,
    'attraction-page': attractionPageTranslationFields,
  };

  const fieldDefs = fieldDefsMap[modelType];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // Persist one locale at a time so a partial run (timeout, one bad
      // locale) never wipes other locales or manual translations. The old
      // whole-map `$set: { translations }` did exactly that.
      const saveLocale = async (locale: string, bucket: Record<string, unknown>) => {
        const setOp = { $set: { [`translations.${locale}`]: bucket } };
        if (modelType === 'tour') {
          await Tour.findOneAndUpdate({ _id: id, ...DEFAULT_TENANT_FILTER }, setOp);
        } else if (modelType === 'destination') {
          await Destination.findOneAndUpdate({ _id: id, ...DEFAULT_TENANT_FILTER }, setOp);
        } else if (modelType === 'category') {
          await Category.findByIdAndUpdate(id, setOp);
        } else if (modelType === 'attraction-page') {
          await AttractionPage.findByIdAndUpdate(id, setOp);
        }
      };

      try {
        await dbConnect();

        // Fetch the document
        let doc: Record<string, unknown> | null = null;
        if (modelType === 'tour') {
          doc = await Tour.findOne({ _id: id, ...DEFAULT_TENANT_FILTER }).lean() as Record<string, unknown> | null;
        } else if (modelType === 'destination') {
          doc = await Destination.findOne({ _id: id, ...DEFAULT_TENANT_FILTER }).lean() as Record<string, unknown> | null;
        } else if (modelType === 'category') {
          doc = await Category.findById(id).lean() as Record<string, unknown> | null;
        } else if (modelType === 'attraction-page') {
          doc = await AttractionPage.findById(id).lean() as Record<string, unknown> | null;
        }

        if (!doc) {
          send('error', { error: `${modelType} not found` });
          controller.close();
          return;
        }

        const fields = extractFields(doc, fieldDefs);
        const structuredTourContent = modelType === 'tour'
          ? extractStructuredTourContent(doc)
          : null;
        const structuredSpecs: StructuredTranslationSpec[] = modelType === 'destination'
          ? destinationStructuredFields
          : modelType === 'category'
            ? categoryStructuredFields
          : modelType === 'attraction-page'
            ? attractionPageStructuredFields
            : [];
        const structuredEntityContent = structuredSpecs.length > 0
          ? extractStructuredSpecContent(doc, structuredSpecs)
          : {};

        const hasFlatFields = Object.keys(fields).length > 0;
        const hasTourStructuredFields = modelType === 'tour' && structuredTourContent
          ? ['itinerary', 'faq', 'bookingOptions', 'addOns', 'imageMetadata'].some((key) => {
              const value = structuredTourContent[key as keyof typeof structuredTourContent];
              return Array.isArray(value) && value.length > 0;
            })
          : false;
        const hasEntityStructuredFields = Object.keys(structuredEntityContent).length > 0;

        if (!hasFlatFields && !hasTourStructuredFields && !hasEntityStructuredFields) {
          send('error', { error: 'No translatable content found' });
          controller.close();
          return;
        }

        send('start', {
          locales: translatableLocales,
          localeNames,
          totalLocales: translatableLocales.length,
        });

        for (const locale of translatableLocales) {
          send('translating', {
            locale,
            localeName: localeNames[locale] || locale,
            total: translatableLocales.length,
          });
        }

        // Translate every locale in parallel (a sequential loop regularly
        // blew the 26s serverless budget) and stream each result as it lands.
        const succeeded: string[] = [];
        const failed: Array<{ locale: string; error: string }> = [];

        await Promise.all(translatableLocales.map(async (locale, i) => {
          const localeName = localeNames[locale] || locale;
          try {
            let translated: Record<string, unknown>;
            if (modelType === 'tour') {
              translated = await translateTourContentForLocale(fields, structuredTourContent || {
                  itinerary: [],
                  faq: [],
                  imageMetadata: [],
                  bookingOptions: [],
                  addOns: [],
                }, locale);
            } else {
              const [flat, structured] = await Promise.all([
                translateEntityFieldsForLocale(fields, fieldDefs, modelType, locale),
                translateStructuredSpecContentForLocale(
                  structuredEntityContent,
                  modelType,
                  locale,
                  structuredSpecs
                ),
              ]);
              translated = { ...flat, ...structured };
            }

            if (Object.keys(translated).length === 0) {
              throw new Error('No translated content returned');
            }

            await saveLocale(locale, translated);
            succeeded.push(locale);
            send('locale_done', {
              locale,
              localeName,
              index: i,
              total: translatableLocales.length,
              translations: translated,
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Translation failed';
            failed.push({ locale, error: message });
            send('locale_error', {
              locale,
              localeName,
              index: i,
              total: translatableLocales.length,
              error: message,
            });
          }
        }));

        if (succeeded.length > 0) {
          revalidateStorefrontContent();
        }

        send('done', {
          success: failed.length === 0,
          translatedLocales: succeeded,
          failedLocales: failed,
        });
      } catch (error) {
        console.error('Streaming translate error:', error);
        send('error', {
          error: error instanceof Error ? error.message : 'Translation failed',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
