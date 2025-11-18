// app/search/page.tsx
import { Suspense } from 'react';
import SearchClient from './SearchClient';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Destination from '@/lib/models/Destination';
import { Loader2 } from 'lucide-react';

// NO CACHING - Real-time data from admin panel
export const revalidate = 0;
export const dynamic = 'force-dynamic';

async function getFilters() {
    await dbConnect();
    try {
        const [categories, destinations] = await Promise.all([
            Category.find({}).sort({ name: 1 }).lean(),
            Destination.find({}).sort({ name: 1 }).lean()
        ]);

        return {
            categories: JSON.parse(JSON.stringify(categories)),
            destinations: JSON.parse(JSON.stringify(destinations)),
        };
    } catch (error) {
        console.error("Failed to fetch filters:", error);
        return { categories: [], destinations: [] };
    }
}

// A fallback component to show while the client component is loading
function Loading() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-red-600" />
            <p className="ml-4 text-slate-500">Loading tours...</p>
        </div>
    );
}

export default async function SearchPage() {
    const { categories, destinations } = await getFilters();

    return (
        <Suspense fallback={<Loading />}>
            <SearchClient
                initialTours={[]}
                categories={categories}
                destinations={destinations}
            />
        </Suspense>
    );
}