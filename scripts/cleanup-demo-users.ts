#!/usr/bin/env tsx
/**
 * Cleanup script to remove demo/test users
 * Keeps only the first 2 demo users as examples (Owen Roberts + one more)
 * Keeps all properly configured admin users (with role set)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Simple User schema
const UserSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  role: String,
  isActive: Boolean,
  createdAt: Date,
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function cleanup() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Find demo users (no role set, OR inactive non-customers)
    console.log('🔍 Finding demo/test users...');
    const demoUsers = await User.find({
      $or: [
        { role: { $exists: false } }, // No role
        { role: null }, // Null role
        { 
          role: { $ne: 'customer' }, 
          $or: [
            { isActive: false },
            { isActive: { $exists: false } }
          ]
        }
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    console.log(`📊 Found ${demoUsers.length} demo/test users\n`);

    if (demoUsers.length === 0) {
      console.log('✅ No demo users to clean up');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Keep the first 2 as demo examples (Owen Roberts + one more)
    const usersToKeep = demoUsers.slice(0, 2);
    const usersToDelete = demoUsers.slice(2);

    if (usersToDelete.length === 0) {
      console.log(
        `✅ Only ${usersToKeep.length} demo users found, nothing to delete\n`,
      );
      console.log('Kept demo users:');
      usersToKeep.forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.firstName} ${u.lastName} (${u.email})`);
      });
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('🗑️  Will delete the following demo/test users:');
    usersToDelete.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.firstName} ${u.lastName} (${u.email})`);
    });

    console.log('\n✅ Will keep these 2 as demo examples:');
    usersToKeep.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.firstName} ${u.lastName} (${u.email})`);
    });

    console.log(`\n⚠️  This will permanently delete ${usersToDelete.length} users`);
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to proceed...\n');

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Delete the excess demo users
    const idsToDelete = usersToDelete.map((u) => u._id);
    const result = await User.deleteMany({
      _id: { $in: idsToDelete },
    });

    console.log(`\n✅ Successfully deleted ${result.deletedCount} demo/test users`);
    console.log(`✅ Kept ${usersToKeep.length} demo examples\n`);

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanup();

