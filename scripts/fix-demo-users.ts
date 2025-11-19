#!/usr/bin/env tsx
/**
 * Fix the 2 demo users to have proper roles and isActive status
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
  permissions: [String],
  createdAt: Date,
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function fixDemoUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Find demo users (no role set)
    const demoUsers = await User.find({
      $or: [
        { role: { $exists: false } },
        { role: null },
      ],
    }).sort({ createdAt: 1 });

    console.log(`📊 Found ${demoUsers.length} demo users to fix\n`);

    if (demoUsers.length === 0) {
      console.log('✅ No demo users to fix');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Update each demo user
    for (const user of demoUsers) {
      user.role = 'viewer'; // Give them a viewer role
      user.isActive = false; // Mark as inactive
      user.permissions = ['manageDashboard', 'manageReports']; // Give basic view permissions
      await user.save();
      
      console.log(`✅ Fixed: ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - Active: ${user.isActive}`);
      console.log(`   - Permissions: ${user.permissions.join(', ')}\n`);
    }

    console.log(`\n✅ Successfully fixed ${demoUsers.length} demo users`);

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixDemoUsers();

