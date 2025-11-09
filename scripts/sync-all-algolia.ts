// scripts/sync-all-algolia.ts
// Script to sync ALL data from MongoDB to Algolia (Tours, Destinations, Categories, Blogs)

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import dbConnect from '../lib/dbConnect';
import Tour from '../lib/models/Tour';
import Destination from '../lib/models/Destination';
import Category from '../lib/models/Category';
import Blog from '../lib/models/Blog';

import {
  syncToursToAlgolia,
  syncDestinationsToAlgolia,
  syncCategoriesToAlgolia,
  syncBlogsToAlgolia,
  configureAlgoliaIndex
} from '../lib/algolia';

async function syncAllToAlgolia() {
  try {
    console.log('🚀 Starting comprehensive Algolia sync...\n');

    // Connect to database
    await dbConnect();
    console.log('✅ Connected to MongoDB\n');

    let totalSynced = 0;

    // =================================================================
    // SYNC TOURS
    // =================================================================
    console.log('📦 Syncing Tours...');
    await configureAlgoliaIndex();

    const tours = await Tour.find({ isPublished: true })
      .populate('category', 'name')
      .populate('destination', 'name')
      .lean();

    if (tours.length > 0) {
      const tourBatchSize = 100;
      for (let i = 0; i < tours.length; i += tourBatchSize) {
        const batch = tours.slice(i, i + tourBatchSize);
        await syncToursToAlgolia(batch);
      }
      console.log(`✅ Synced ${tours.length} tours\n`);
      totalSynced += tours.length;
    } else {
      console.log('⚠️  No published tours found\n');
    }

    // =================================================================
    // SYNC DESTINATIONS
    // =================================================================
    console.log('🗺️  Syncing Destinations...');
    const destinations = await Destination.find({ isPublished: true }).lean();

    if (destinations.length > 0) {
      await syncDestinationsToAlgolia(destinations);
      console.log(`✅ Synced ${destinations.length} destinations\n`);
      totalSynced += destinations.length;
    } else {
      console.log('⚠️  No published destinations found\n');
    }

    // =================================================================
    // SYNC CATEGORIES
    // =================================================================
    console.log('🏷️  Syncing Categories...');
    const categories = await Category.find({ isPublished: true }).lean();

    if (categories.length > 0) {
      await syncCategoriesToAlgolia(categories);
      console.log(`✅ Synced ${categories.length} categories\n`);
      totalSynced += categories.length;
    } else {
      console.log('⚠️  No published categories found\n');
    }

    // =================================================================
    // SYNC BLOGS
    // =================================================================
    console.log('📝 Syncing Blogs...');
    const blogs = await Blog.find({ status: 'published' }).lean();

    if (blogs.length > 0) {
      await syncBlogsToAlgolia(blogs);
      console.log(`✅ Synced ${blogs.length} blog posts\n`);
      totalSynced += blogs.length;
    } else {
      console.log('⚠️  No published blogs found\n');
    }

    // =================================================================
    // SUMMARY
    // =================================================================
    console.log('═══════════════════════════════════════════════');
    console.log('🎉 SYNC COMPLETE!');
    console.log(`📊 Total items synced: ${totalSynced}`);
    console.log('   - Tours: ' + tours.length);
    console.log('   - Destinations: ' + destinations.length);
    console.log('   - Categories: ' + categories.length);
    console.log('   - Blogs: ' + blogs.length);
    console.log('═══════════════════════════════════════════════');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing to Algolia:', error);
    process.exit(1);
  }
}

// Run the sync
syncAllToAlgolia();
