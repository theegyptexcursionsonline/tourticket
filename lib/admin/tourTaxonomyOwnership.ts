import mongoose from 'mongoose';
import Category from '@/lib/models/Category';
import Destination from '@/lib/models/Destination';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

export class TourTaxonomyOwnershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TourTaxonomyOwnershipError';
  }
}

function ids(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : value == null || value === '' ? [] : [value];
  return [...new Set(raw.map((entry) => typeof entry === 'string' ? entry.trim() : '').filter(Boolean))];
}

/**
 * Fail closed when an admin write references taxonomy owned by another tenant.
 * ObjectId shape is not ownership: every supplied id must resolve inside the
 * default EEO catalogue before the tour may be created or updated.
 */
export async function validateTourTaxonomyOwnership(input: {
  destination?: unknown;
  category?: unknown;
}): Promise<void> {
  const destinationSupplied = input.destination !== undefined;
  const categorySupplied = input.category !== undefined;
  const destinationIds = ids(input.destination);
  const categoryIds = ids(input.category);

  if (destinationSupplied) {
    if (destinationIds.length !== 1 || !mongoose.Types.ObjectId.isValid(destinationIds[0])) {
      throw new TourTaxonomyOwnershipError('Invalid destination ID format');
    }
    const count = await Destination.countDocuments({
      $and: [DEFAULT_TENANT_FILTER, { _id: destinationIds[0] }],
    });
    if (count !== 1) {
      throw new TourTaxonomyOwnershipError('Destination is not available in the main EEO catalogue');
    }
  }

  if (categorySupplied) {
    if (categoryIds.length === 0 || categoryIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      throw new TourTaxonomyOwnershipError('Invalid category ID format');
    }
    const count = await Category.countDocuments({
      $and: [DEFAULT_TENANT_FILTER, { _id: { $in: categoryIds } }],
    });
    if (count !== categoryIds.length) {
      throw new TourTaxonomyOwnershipError('Category is not available in the main EEO catalogue');
    }
  }
}
