import dbConnect from '@/lib/dbConnect';
import Tour from '@/lib/models/Tour';

async function findTourSlugs() {
  await dbConnect();

  const searchTerms = [
    'Hurghada: Luxury VIP Hammam',
    'Turkish Bath and Full Body Massage',
    'Couples Spa Retreat',
    'Cleopatra Plus Spa',
    'Pyramids & Nile Cruise',
    'Nile Felucca Sailing',
    'Spa Experience with Hammam'
  ];

  console.log('Finding tour slugs...\n');

  for (const term of searchTerms) {
    const tours = await Tour.find({
      title: { $regex: term, $options: 'i' },
      isPublished: true
    }).select('title slug').lean();

    if (tours.length > 0) {
      tours.forEach(tour => {
        console.log(`${tour.title}`);
        console.log(`  -> slug: ${tour.slug}\n`);
      });
    } else {
      console.log(`No matches for: ${term}\n`);
    }
  }

  process.exit(0);
}

findTourSlugs();
