// app/admin/destinations/page.tsx
// Add this line at the top of the file after the imports
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import Tour from '@/lib/models/Tour';
import { IDestination } from '@/lib/models/Destination';
import DestinationManager from './DestinationManager';
import { dedupeAdminDestinations } from '@/lib/admin/destinationDeduplication';
import { DEFAULT_TENANT_FILTER } from '@/lib/tenant/defaultTenantFilter';

type LeanDestination = Record<string, unknown> & {
  _id?: { toString: () => string } | string;
  name?: string;
  country?: string;
  description?: string;
  image?: string;
  slug?: string;
  coordinates?: {
    lat?: number;
    lng?: number;
  };
};

async function getDestinations(): Promise<IDestination[]> {
  await dbConnect();
  // Scope to the default tenant. Other-tenant Destination records (e.g.
  // German `aegypten-ausfluege` variants of Alexandria/Cairo) live in the
  // shared DB and otherwise show up here as duplicate cards. The dedupe
  // helper can't always collapse them because tenant variants get
  // different slugs (alexandria-de, etc.).
  const destinations = await Destination.find({ ...DEFAULT_TENANT_FILTER })
    .sort({ name: 1 })
    .lean<LeanDestination[]>();

  // Tour counts also scoped to the default tenant so other-tenant tours
  // don't inflate destination counts in the EEO admin.
  const tours = await Tour.find({ ...DEFAULT_TENANT_FILTER }).select('destination').lean();

  // Count tours per destination
  const tourCounts: Record<string, number> = {};
  tours.forEach(tour => {
    const destId = tour.destination?.toString();
    if (destId) {
      tourCounts[destId] = (tourCounts[destId] || 0) + 1;
    }
  });

  // Sanitize all destinations by providing defaults for missing coordinates
  const sanitizedDestinations = destinations.map(destObj => {
    const destId = destObj._id?.toString() || '';
    return {
      ...destObj,
      coordinates: {
        lat: destObj.coordinates?.lat ?? 0,
        lng: destObj.coordinates?.lng ?? 0
      },
      name: destObj.name || '',
      country: destObj.country || '',
      description: destObj.description || '',
      image: destObj.image || '',
      slug: destObj.slug || '',
      tourCount: tourCounts[destId] || 0
    };
  });

  return JSON.parse(JSON.stringify(dedupeAdminDestinations(sanitizedDestinations, tourCounts)));
}

export default async function DestinationsPage() {
  const destinations = await getDestinations();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Destinations</h1>
        <p className="text-slate-600 mt-1">
          Manage the destinations where your tours are available.
        </p>
      </div>
      
      <DestinationManager initialDestinations={destinations} />
    </div>
  );
}
