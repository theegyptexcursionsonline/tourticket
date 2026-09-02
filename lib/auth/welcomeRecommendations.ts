import Tour from '@/lib/models/Tour';
import { PUBLIC_CONTENT_FILTER } from '@/lib/content/publicContentFilter';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

export type WelcomeTourRecommendation = {
  title: string;
  slug: string;
  images?: string[];
  discountPrice?: number;
  urlType?: string;
};

/** Only recommend current, public tours owned by the main EEO tenant. */
export async function loadWelcomeTourRecommendations(limit = 3) {
  const safeLimit = Math.max(1, Math.min(3, Math.floor(Number(limit)) || 3));
  return Tour.find({ ...DEFAULT_TENANT_FILTER, ...PUBLIC_CONTENT_FILTER })
    .select('title slug images discountPrice urlType')
    .sort({ updatedAt: -1, _id: -1 })
    .limit(safeLimit)
    .lean<WelcomeTourRecommendation[]>();
}
