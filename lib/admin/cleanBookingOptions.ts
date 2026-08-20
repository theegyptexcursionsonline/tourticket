import { defaultMinCapacity, minCapacityRequired } from '@/lib/bookings/unitPricing';

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
  minCapacity?: unknown;
  maxCapacity?: unknown;
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

      // Capacities: blank means "not set"; unit-typed options without an
      // authored minimum inherit their type default (couple 2, family 4).
      for (const field of ['minCapacity', 'maxCapacity'] as const) {
        if (cleanedOption[field] === undefined || cleanedOption[field] === '' || cleanedOption[field] === null) {
          delete cleanedOption[field];
        } else {
          cleanedOption[field] = Number(cleanedOption[field]);
        }
      }
      if (cleanedOption.minCapacity === undefined) {
        const fallback = defaultMinCapacity(cleanedOption.type);
        if (fallback !== null && fallback > 1) cleanedOption.minCapacity = fallback;
      }

      return cleanedOption;
    });
}

/**
 * Field-level capacity validation shared by every booking-option write path
 * (tour create, tour update, individual option save). Returns a
 * customer-of-the-admin-facing message naming the option, or null when valid.
 */
export function bookingOptionCapacityError(options: BookingOptionInput[]): string | null {
  for (const [index, option] of options.entries()) {
    const name = option.label?.trim() || `Booking option ${index + 1}`;
    const min = option.minCapacity;
    const max = option.maxCapacity;
    if (min !== undefined && (!Number.isInteger(min) || Number(min) < 1 || Number(min) > 100)) {
      return `${name}: minimum capacity must be a whole number between 1 and 100`;
    }
    if (max !== undefined && (!Number.isInteger(max) || Number(max) < 1 || Number(max) > 1000)) {
      return `${name}: maximum capacity must be a whole number between 1 and 1000`;
    }
    if (min !== undefined && max !== undefined && Number(max) < Number(min)) {
      return `${name}: maximum capacity cannot be below the minimum capacity`;
    }
    if (min === undefined && minCapacityRequired(option.type)) {
      // Couple/Family were defaulted above, so only Per Group can land here.
      return `${name}: a ${String(option.type)} option needs a minimum capacity before it can be saved`;
    }
  }
  return null;
}
