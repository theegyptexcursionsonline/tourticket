// scripts/debug-categories.ts
import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

async function debugCategories() {
  await dbConnect();

  const allTours = await Tour.find({}).lean();
  const toursWithCategories = allTours.filter(tour =>
    tour.category && Array.isArray(tour.category) && tour.category.length > 0
  );
  const toursWithoutCategories = allTours.filter(tour =>
    !tour.category || !Array.isArray(tour.category) || tour.category.length === 0
  );

  console.log('Total tours:', allTours.length);
  console.log('Tours WITH categories:', toursWithCategories.length);
  console.log('Tours WITHOUT categories:', toursWithoutCategories.length);
  console.log('');

  if (toursWithoutCategories.length > 0) {
    console.log('Sample tours without categories:');
    for (let i = 0; i < Math.min(5, toursWithoutCategories.length); i++) {
      const sample = toursWithoutCategories[i];
      console.log(`\n${i + 1}. ${sample.title}`);
      console.log('   Category field:', sample.category);
      console.log('   Category type:', typeof sample.category);
      console.log('   Is array?:', Array.isArray(sample.category));
    }
  }

  process.exit(0);
}

debugCategories();
