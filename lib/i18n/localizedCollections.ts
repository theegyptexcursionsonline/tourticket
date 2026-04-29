type UnknownRecord = Record<string, unknown>;

const GERMAN_CONTENT_PATTERN =
  /\b(und|mit|von|nach|tage|stunden|uhr|abholung|ausflug|kreuzfahrt|erlebnis|ganzt[aä]gig|halbt[aä]gig|gef[üu]hrte|privat|inklusive|schnorchel|nil|pyramiden|entdeckung)\b/i;

export const TOUR_LOCALE_FIELDS = [
  'title',
  'description',
  'longDescription',
  'location',
  'duration',
  'includes',
  'highlights',
  'whatsIncluded',
  'whatsNotIncluded',
  'tags',
  'metaTitle',
  'metaDescription',
];

const asRecord = (value: unknown): UnknownRecord | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as UnknownRecord;
};

const normalizeValue = (value: unknown) => String(value || '').trim().toLowerCase();

const collectTextValues = (value: unknown, results: string[]) => {
  if (typeof value === 'string') {
    const normalized = value.replace(/<[^>]+>/g, ' ').trim();
    if (normalized) results.push(normalized);
    return;
  }

  if (!Array.isArray(value)) return;

  for (const item of value) {
    if (typeof item === 'string') {
      const normalized = item.replace(/<[^>]+>/g, ' ').trim();
      if (normalized) results.push(normalized);
    }
  }
};

export const getLocaleBucket = (
  translations: unknown,
  locale: string,
  fallbackLocale?: string
): UnknownRecord | undefined => {
  const record = asRecord(translations);
  if (!record) return undefined;

  const normalizedLocale = locale.toLowerCase();
  const baseLocale = normalizedLocale.split('-')[0];
  const keys = [normalizedLocale, locale, baseLocale];

  if (fallbackLocale) {
    keys.push(fallbackLocale.toLowerCase(), fallbackLocale);
  }

  for (const key of keys) {
    const bucket = asRecord(record[key]);
    if (bucket) {
      return bucket;
    }
  }

  return undefined;
};

const hasUsableLocaleContent = (
  bucket: UnknownRecord | undefined,
  fields: string[]
): boolean =>
  fields.some((field) => {
    const value = bucket?.[field];
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) {
      return value.some((item) => typeof item === 'string' && item.trim().length > 0);
    }
    return false;
  });

const hasAnyTranslations = (item: UnknownRecord) => {
  const translations = asRecord(item.translations);
  return Boolean(translations && Object.keys(translations).length > 0);
};

const hasGermanTranslation = (item: UnknownRecord, fields: string[]) =>
  hasUsableLocaleContent(getLocaleBucket(item.translations, 'de'), fields);

const hasGermanLikeRawContent = (item: UnknownRecord, fields: string[]) => {
  const snippets: string[] = [];
  for (const field of fields) {
    collectTextValues(item[field], snippets);
  }

  return snippets.some((value) => GERMAN_CONTENT_PATTERN.test(value));
};

export const hasGermanLikeContent = (item: UnknownRecord, fields: string[]) =>
  hasGermanTranslation(item, fields) || hasGermanLikeRawContent(item, fields);

type SelectionOptions<T extends UnknownRecord> = {
  locale: string;
  fields: string[];
  getKey: (item: T) => string | null;
  extraScore?: (item: T, locale: string) => number;
};

const scoreLocalizedEntry = <T extends UnknownRecord>(
  item: T,
  locale: string,
  fields: string[],
  extraScore?: (item: T, locale: string) => number
) => {
  let score = extraScore?.(item, locale) ?? 0;
  const localeBucket = getLocaleBucket(item.translations, locale);

  if (hasUsableLocaleContent(localeBucket, fields)) {
    score += 8;
  }

  if (hasAnyTranslations(item)) {
    score += locale.startsWith('de') ? 1 : 3;
  }

  const germanTranslation = hasGermanTranslation(item, fields);
  const germanRawContent = hasGermanLikeRawContent(item, fields);

  if (locale.startsWith('de')) {
    if (germanTranslation) score += 6;
    if (germanRawContent) score += 3;
  } else if (germanRawContent) {
    score -= 8;
  } else {
    score += 4;
    if (germanTranslation) score += 2;
  }

  if (item.isPublished !== false) score += 1;
  if (item.featured === true || item.isFeatured === true) score += 1;
  if (typeof item.name === 'string' && item.name.trim()) score += 1;
  if (typeof item.title === 'string' && item.title.trim()) score += 1;
  if (typeof item.description === 'string' && item.description.trim()) score += 1;
  if (typeof item.slug === 'string' && item.slug.trim()) score += 1;
  if (item.image || item.heroImage || item.icon) score += 1;

  return score;
};

export const selectBestLocalizedEntries = <T extends UnknownRecord>(
  items: T[],
  options: SelectionOptions<T>
): T[] => {
  const bestByKey = new Map<string, T>();

  for (const item of items) {
    const key = options.getKey(item);
    if (!key) continue;

    const existing = bestByKey.get(key);
    if (
      !existing ||
      scoreLocalizedEntry(item, options.locale, options.fields, options.extraScore) >
        scoreLocalizedEntry(existing, options.locale, options.fields, options.extraScore)
    ) {
      bestByKey.set(key, item);
    }
  }

  return Array.from(bestByKey.values());
};

export const selectLocalizedTaxonomyEntries = <T extends UnknownRecord>(
  items: T[],
  locale: string,
  fields: string[]
) =>
  selectBestLocalizedEntries(items, {
    locale,
    fields,
    getKey: (item) => normalizeValue(item.slug) || normalizeValue(item.name) || null,
  });

export const shouldIncludeTourForLocale = (tour: UnknownRecord, locale: string) => {
  if (!locale.startsWith('de')) {
    return true;
  }

  return hasGermanLikeContent(tour, TOUR_LOCALE_FIELDS);
};

export const selectLocalizedTours = <T extends UnknownRecord>(tours: T[], locale: string) =>
  selectBestLocalizedEntries(tours, {
    locale,
    fields: TOUR_LOCALE_FIELDS,
    getKey: (tour) => normalizeValue(tour.slug) || null,
    extraScore: (tour) => {
      const tenantId = normalizeValue(tour.tenantId);
      if (tenantId === 'default') return 4;
      if (!tenantId) return 2;
      return 0;
    },
  }).filter((tour) => shouldIncludeTourForLocale(tour, locale));

export const selectLocalizedTourCandidate = <T extends UnknownRecord>(
  tours: T[],
  locale: string
): T | null => selectLocalizedTours(tours, locale)[0] || null;
