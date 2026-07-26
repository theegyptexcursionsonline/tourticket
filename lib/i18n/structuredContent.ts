import type {
  StructuredObjectTranslationSpec,
  StructuredTranslationSpec,
} from './translationFields';

const hasText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * Pull the customer-readable text out of repeated sub-documents (FAQs, travel
 * tips). Non-text keys are dropped so the translator never sees or rewrites ids.
 */
export function extractStructuredSpecContent(
  doc: Record<string, unknown>,
  specs: StructuredTranslationSpec[]
): Record<string, Array<Record<string, string>>> {
  const out: Record<string, Array<Record<string, string>>> = {};

  for (const spec of specs) {
    const source = doc[spec.key];
    if (!Array.isArray(source) || source.length === 0) continue;

    const entries = source.map((item) => {
      const record = (item || {}) as Record<string, unknown>;
      const entry: Record<string, string> = {};
      if (spec.identityField && hasText(record[spec.identityField])) {
        entry[spec.identityField] = record[spec.identityField] as string;
      }
      for (const field of spec.fields) {
        if (hasText(record[field])) {
          entry[field] = record[field] as string;
        } else if (spec.generateMissingFields) {
          entry[field] = '';
        }
      }
      return entry;
    });

    if (
      entries.some((entry) =>
        spec.fields.some((field) => hasText(entry[field])) ||
        Boolean(spec.generateMissingFields && spec.identityField && hasText(entry[spec.identityField]))
      )
    ) {
      out[spec.key] = entries;
    }
  }

  return out;
}

/** Pull readable fields out of nested objects such as averageTemperature. */
export function extractStructuredObjectContent(
  doc: Record<string, unknown>,
  specs: StructuredObjectTranslationSpec[]
): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};

  for (const spec of specs) {
    const source = doc[spec.key];
    if (!source || typeof source !== 'object' || Array.isArray(source)) continue;

    const record = source as Record<string, unknown>;
    const entry: Record<string, string> = {};
    for (const field of spec.fields) {
      if (hasText(record[field])) entry[field] = record[field] as string;
    }
    if (Object.keys(entry).length > 0) out[spec.key] = entry;
  }

  return out;
}

/**
 * Accept only the translated fields we asked for, preserve stable identities
 * such as image URLs, and keep array positions aligned for fallback merging.
 */
export function normalizeStructuredTranslationContent(
  source: Record<string, unknown>,
  translated: Record<string, unknown>,
  arraySpecs: StructuredTranslationSpec[],
  objectSpecs: StructuredObjectTranslationSpec[] = []
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const spec of arraySpecs) {
    const sourceEntries = source[spec.key];
    const translatedEntries = translated[spec.key];
    if (!Array.isArray(sourceEntries) || !Array.isArray(translatedEntries)) continue;

    normalized[spec.key] = sourceEntries.map((sourceItem, index) => {
      const original =
        sourceItem && typeof sourceItem === 'object' && !Array.isArray(sourceItem)
          ? sourceItem as Record<string, unknown>
          : {};
      let replacement =
        translatedEntries[index] &&
        typeof translatedEntries[index] === 'object' &&
        !Array.isArray(translatedEntries[index])
          ? translatedEntries[index] as Record<string, unknown>
          : {};

      if (spec.identityField && hasText(original[spec.identityField])) {
        const identity = original[spec.identityField];
        const matched = translatedEntries.find((entry) =>
          Boolean(
            entry &&
            typeof entry === 'object' &&
            !Array.isArray(entry) &&
            (entry as Record<string, unknown>)[spec.identityField as string] === identity
          )
        );
        if (matched && typeof matched === 'object' && !Array.isArray(matched)) {
          replacement = matched as Record<string, unknown>;
        }
      }

      const entry: Record<string, string> = {};
      if (spec.identityField && hasText(original[spec.identityField])) {
        entry[spec.identityField] = original[spec.identityField] as string;
      }
      for (const field of spec.fields) {
        if (hasText(replacement[field])) entry[field] = replacement[field] as string;
      }
      return entry;
    });
  }

  for (const spec of objectSpecs) {
    const sourceObject = source[spec.key];
    const translatedObject = translated[spec.key];
    if (
      !sourceObject ||
      typeof sourceObject !== 'object' ||
      Array.isArray(sourceObject) ||
      !translatedObject ||
      typeof translatedObject !== 'object' ||
      Array.isArray(translatedObject)
    ) {
      continue;
    }

    const replacement = translatedObject as Record<string, unknown>;
    const entry: Record<string, string> = {};
    for (const field of spec.fields) {
      if (hasText(replacement[field])) entry[field] = replacement[field] as string;
    }
    if (Object.keys(entry).length > 0) normalized[spec.key] = entry;
  }

  return normalized;
}
