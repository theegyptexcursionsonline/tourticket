type BookingOptionInput = Record<string, unknown> & {
  pricingKey?: string;
  label?: string;
  type?: string;
  difficulty?: string;
  badge?: string;
  description?: string;
  duration?: string;
  groupSize?: string;
  languages?: unknown[];
  highlights?: unknown[];
  price?: unknown;
  originalPrice?: unknown;
  discount?: unknown;
};

const OPTIONAL_TEXT_FIELDS = ['badge', 'description', 'duration', 'groupSize'] as const;
const VALID_DIFFICULTIES = new Set(['Easy', 'Moderate', 'Challenging', 'Difficult']);

export function cleanBookingOptions(value: unknown): BookingOptionInput[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((option): option is Record<string, unknown> => typeof option === 'object' && option !== null)
    .map((option) => {
      const cleanedOption: BookingOptionInput = { ...option };

      if (typeof cleanedOption.difficulty !== 'string' || !VALID_DIFFICULTIES.has(cleanedOption.difficulty)) {
        delete cleanedOption.difficulty;
      }

      for (const field of OPTIONAL_TEXT_FIELDS) {
        if (typeof cleanedOption[field] !== 'string' || cleanedOption[field]?.trim() === '') {
          delete cleanedOption[field];
        }
      }

      if (!Array.isArray(cleanedOption.languages)) cleanedOption.languages = [];
      if (!Array.isArray(cleanedOption.highlights)) cleanedOption.highlights = [];

      for (const field of ['price', 'originalPrice', 'discount'] as const) {
        if (cleanedOption[field] !== undefined && cleanedOption[field] !== '') {
          cleanedOption[field] = Number(cleanedOption[field]);
        }
      }

      return cleanedOption;
    });
}
