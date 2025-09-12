// app/admin/destinations/page.tsx
import dbConnect from '@/lib/dbConnect';
import Destination from '@/lib/models/Destination';
import { IDestination } from '@/lib/models/Destination';
import DestinationManager from './DestinationManager';

async function getDestinations(): Promise<IDestination[]> {
  await dbConnect();
  const destinations = await Destination.find({}).sort({ name: 1 });
  return JSON.parse(JSON.stringify(destinations));
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