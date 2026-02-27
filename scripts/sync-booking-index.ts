/**
 * Script to ensure the unique index on paymentId exists in the Booking collection
 * Run with: npx tsx scripts/sync-booking-index.ts
 * 
 * This is critical to prevent duplicate bookings for the same payment.
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined');
  process.exit(1);
}

async function syncIndexes() {
  console.log('🔧 Syncing Booking indexes to MongoDB...\n');
  
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;
    const bookingsCollection = db.collection('bookings');
    
    // Check existing indexes
    console.log('📋 Current indexes on bookings collection:');
    const existingIndexes = await bookingsCollection.indexes();
    existingIndexes.forEach((index: any) => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)} ${index.unique ? '(unique)' : ''} ${index.sparse ? '(sparse)' : ''}`);
    });
    
    // Check if paymentId unique index exists
    const hasPaymentIdIndex = existingIndexes.some(
      (idx: any) => idx.key?.paymentId === 1 && idx.unique === true
    );
    
    if (hasPaymentIdIndex) {
      console.log('\n✅ paymentId unique index already exists!');
    } else {
      console.log('\n⚠️ paymentId unique index NOT FOUND. Creating...');
      
      // First, check for duplicate paymentIds that would block index creation
      const duplicates = await bookingsCollection.aggregate([
        { $match: { paymentId: { $ne: null, $exists: true } } },
        { $group: { _id: '$paymentId', count: { $sum: 1 }, docs: { $push: '$_id' } } },
        { $match: { count: { $gt: 1 } } }
      ]).toArray();
      
      if (duplicates.length > 0) {
        console.log('\n🚨 DUPLICATE PAYMENTS FOUND! These need to be resolved:');
        for (const dup of duplicates) {
          console.log(`   PaymentId: ${dup._id}`);
          console.log(`   Count: ${dup.count}`);
          console.log(`   Booking IDs: ${dup.docs.join(', ')}`);
          console.log('');
        }
        
        console.log('To fix: Keep one booking per payment and delete the duplicates.');
        console.log('After fixing, run this script again to create the index.\n');
        
        // Option to auto-fix by keeping only the oldest booking
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise<string>((resolve) => {
          rl.question('Auto-fix by keeping oldest booking per payment? (y/n): ', resolve);
        });
        rl.close();
        
        if (answer.toLowerCase() === 'y') {
          for (const dup of duplicates) {
            // Keep first (oldest), remove others
            const toRemove = dup.docs.slice(1);
            console.log(`   Removing ${toRemove.length} duplicate(s) for payment ${dup._id}...`);
            await bookingsCollection.deleteMany({ _id: { $in: toRemove } });
          }
          console.log('\n✅ Duplicates removed.');
        } else {
          console.log('\n⏭️ Skipping auto-fix. Please resolve manually.');
          await mongoose.disconnect();
          process.exit(1);
        }
      }
      
      // Create the unique sparse index
      try {
        await bookingsCollection.createIndex(
          { paymentId: 1 },
          { unique: true, sparse: true, name: 'paymentId_unique_sparse' }
        );
        console.log('✅ Created paymentId unique sparse index!');
      } catch (indexError: any) {
        console.error('❌ Failed to create index:', indexError.message);
        await mongoose.disconnect();
        process.exit(1);
      }
    }
    
    // Verify final state
    console.log('\n📋 Final indexes on bookings collection:');
    const finalIndexes = await bookingsCollection.indexes();
    finalIndexes.forEach((index: any) => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)} ${index.unique ? '(unique)' : ''} ${index.sparse ? '(sparse)' : ''}`);
    });
    
    console.log('\n🎉 Index sync complete!');
    console.log('\nThe unique index on paymentId will now prevent duplicate bookings.');
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

syncIndexes();
