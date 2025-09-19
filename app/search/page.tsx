// app/search/page.tsx

import SearchClient from './SearchClient';
import dbConnect from '@/lib/dbConnect';
import Category from '@/lib/models/Category';
import Destination from '@/lib/models/Destination';

export const revalidate = 3600; // Revalidate filter data every hour

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

export default async function SearchPage() {
    const { categories, destinations } = await getFilters();

    // Pass an empty array for initialTours. The client will fetch them dynamically.
    return (
        <SearchClient
            initialTours={[]}
            categories={categories}
            destinations={destinations}
        />
    );
}