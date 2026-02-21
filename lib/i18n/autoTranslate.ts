import { getOpenAIClient } from '@/lib/openai';
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';
import Destination from '@/lib/models/Destination';
import Category from '@/lib/models/Category';
import {
  TranslationFieldDef,
  translatableLocales,
  localeNames,
  tourTranslationFields,
  destinationTranslationFields,
  categoryTranslationFields,
} from './translationFields';

type FieldValues = Record<string, string | string[]>;
type TranslationsMap = Record<string, Record<string, string | string[]>>;

/**
 * Translate a set of English field values into all target locales using OpenAI.
 * Returns { ar: { field: value }, he: { ... }, es: { ... }, fr: { ... }, de: { ... } }
 */
export async function translateEntityFields(
  fields: FieldValues,
  fieldDefs: TranslationFieldDef[],
  entityContext: string
): Promise<TranslationsMap> {
  const openai = getOpenAIClient();
  if (!openai) return {};

  // Filter to only fields that have content
  const fieldsToTranslate: FieldValues = {};
  for (const def of fieldDefs) {
    const val = fields[def.key];
    if (!val) continue;
    if (typeof val === 'string' && val.trim().length === 0) continue;
    if (Array.isArray(val) && val.filter(Boolean).length === 0) continue;
    fieldsToTranslate[def.key] = val;
  }

  if (Object.keys(fieldsToTranslate).length === 0) return {};

  const localeList = translatableLocales.map(l => `${l} (${localeNames[l] || l})`).join(', ');

  const prompt = `You are a professional translator for a tour booking website. Translate the following English ${entityContext} content into these locales: ${localeList}.

Content to translate:
${JSON.stringify(fieldsToTranslate, null, 2)}

Rules:
- Keep proper nouns (city names, brand names) in their commonly known local form (e.g. Cairo → القاهرة in Arabic)
- For Arabic (ar), produce proper RTL text
- Keep translations natural and fluent, not literal word-for-word
- For SEO fields (metaTitle, metaDescription), optimize for the target language
- Array fields must remain arrays with the same number of items, each item translated
- Return ONLY a JSON object with this structure: { "ar": { ...fields }, "es": { ...fields }, "fr": { ...fields }, "de": { ...fields } }`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a translation API. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    });

    const text = response.choices[0]?.message?.content;
    if (!text) return {};

    const parsed = JSON.parse(text) as TranslationsMap;

    // Validate structure: ensure each locale key exists and is an object
    const validated: TranslationsMap = {};
    for (const locale of translatableLocales) {
      if (parsed[locale] && typeof parsed[locale] === 'object') {
        validated[locale] = parsed[locale];
      }
    }

    return validated;
  } catch (error) {
    console.error(`Auto-translate failed for ${entityContext}:`, error);
    return {};
  }
}

// ── Convenience helpers that fetch, translate, and save back ──

function extractFields(doc: Record<string, unknown>, fieldDefs: TranslationFieldDef[]): FieldValues {
  const fields: FieldValues = {};
  for (const def of fieldDefs) {
    const val = doc[def.key];
    if (typeof val === 'string') {
      fields[def.key] = val;
    } else if (Array.isArray(val)) {
      fields[def.key] = val.filter((item): item is string => typeof item === 'string');
    }
  }
  return fields;
}

export async function autoTranslateTour(tourId: string): Promise<void> {
  await dbConnect();
  const tour = await Tour.findById(tourId).lean();
  if (!tour) return;

  const fields = extractFields(tour as Record<string, unknown>, tourTranslationFields);
  const translations = await translateEntityFields(fields, tourTranslationFields, 'tour');
  if (Object.keys(translations).length === 0) return;

  await Tour.findByIdAndUpdate(tourId, { $set: { translations } });
  console.log(`Auto-translated tour ${tourId} into ${Object.keys(translations).join(', ')}`);
}

export async function autoTranslateDestination(destinationId: string): Promise<void> {
  await dbConnect();
  const dest = await Destination.findById(destinationId).lean();
  if (!dest) return;

  const fields = extractFields(dest as Record<string, unknown>, destinationTranslationFields);
  const translations = await translateEntityFields(fields, destinationTranslationFields, 'destination');
  if (Object.keys(translations).length === 0) return;

  await Destination.findByIdAndUpdate(destinationId, { $set: { translations } });
  console.log(`Auto-translated destination ${destinationId} into ${Object.keys(translations).join(', ')}`);
}

export async function autoTranslateCategory(categoryId: string): Promise<void> {
  await dbConnect();
  const cat = await Category.findById(categoryId).lean();
  if (!cat) return;

  const fields = extractFields(cat as Record<string, unknown>, categoryTranslationFields);
  const translations = await translateEntityFields(fields, categoryTranslationFields, 'category');
  if (Object.keys(translations).length === 0) return;

  await Category.findByIdAndUpdate(categoryId, { $set: { translations } });
  console.log(`Auto-translated category ${categoryId} into ${Object.keys(translations).join(', ')}`);
}
