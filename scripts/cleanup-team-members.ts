#!/usr/bin/env tsx
/**
 * Cleanup script to remove inactive demo/test team members
 * Keeps only the first 2 inactive users as examples
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

// Simple User schema (just what we need)
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

    // Find all inactive admin/team users (not customers)
    console.log('🔍 Finding inactive team members...');
    const inactiveUsers = await User.find({
      role: { $ne: 'customer' },
      isActive: false,
    })
      .sort({ createdAt: 1 })
      .lean();

    console.log(`📊 Found ${inactiveUsers.length} inactive team members\n`);

    if (inactiveUsers.length === 0) {
      console.log('✅ No inactive team members to clean up');
      process.exit(0);
    }

    // Keep the first 2 as demo examples, delete the rest
    const usersToKeep = inactiveUsers.slice(0, 2);
    const usersToDelete = inactiveUsers.slice(2);

    if (usersToDelete.length === 0) {
      console.log(
        `✅ Only ${usersToKeep.length} inactive members found, nothing to delete`,
      );
      console.log('\nKept members:');
      usersToKeep.forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.firstName} ${u.lastName} (${u.email})`);
      });
      process.exit(0);
    }

    console.log('🗑️  Will delete the following inactive members:');
    usersToDelete.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.firstName} ${u.lastName} (${u.email})`);
    });

    console.log('\n✅ Will keep these 2 as demo examples:');
    usersToKeep.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.firstName} ${u.lastName} (${u.email})`);
    });

    console.log('\n⚠️  This will permanently delete ' + usersToDelete.length + ' users');
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to proceed...\n');

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Delete the excess inactive users
    const idsToDelete = usersToDelete.map((u) => u._id);
    const result = await User.deleteMany({
      _id: { $in: idsToDelete },
    });

    console.log(`\n✅ Successfully deleted ${result.deletedCount} inactive team members`);
    console.log(`✅ Kept ${usersToKeep.length} demo members\n`);

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanup();

