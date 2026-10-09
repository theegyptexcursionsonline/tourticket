import type { PopulateOptions } from 'mongoose';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';
import { PUBLIC_CONTENT_FILTER } from '@/lib/content/publicContentFilter';

/** Validate only submitted references; omitted fields preserve existing relationships. */
export async function validDefaultBlogReferences(data: Record<string, unknown>): Promise<boolean> {
  for (const field of ['relatedDestinations', 'relatedTours'] as const) {
    if (!Object.hasOwn(data, field)) continue;
    const values = data[field];
    if (!Array.isArray(values) || values.some(id => typeof id !== 'string' || !/^[a-fA-F0-9]{24}$/.test(id))) return false;
    const ids = [...new Set(values.map(id => (id as string).toLowerCase()))];
    if (ids.length) {
      const model = field === 'relatedDestinations'
        ? (await import('@/lib/models/Destination')).default
        : (await import('@/lib/models/Tour')).default;
      if (await model.countDocuments({ _id: { $in: ids }, ...DEFAULT_TENANT_FILTER }) !== ids.length) return false;
    }
  }
  return true;
}

/** Read-side scope remains essential for old references and later tenant reassignment. */
export function blogRelatedPopulations(surface: 'admin' | 'list' | 'detail'): PopulateOptions[] {
  const match = surface === 'admin' ? { ...DEFAULT_TENANT_FILTER } : { ...DEFAULT_TENANT_FILTER, ...PUBLIC_CONTENT_FILTER };
  return [
    { path: 'relatedDestinations', select: surface === 'admin' ? 'name slug' : surface === 'list' ? 'name slug urlType parentPage' : 'name slug image urlType parentPage', match },
    { path: 'relatedTours', select: surface === 'admin' ? 'title slug' : surface === 'list' ? 'title slug urlType parentPage' : 'title slug image discountPrice urlType destination parentPage', match,
      ...(surface === 'detail' ? { populate: { path: 'destination', select: 'slug', match } } : {}) },
  ];
}
