#!/usr/bin/env tsx
/**
 * List all team members to see what's in the database
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

async function listTeamMembers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB\n');

    // Find all non-customer users
    const allUsers = await User.find({
      $or: [
        { role: { $exists: true, $ne: 'customer' } },
        { role: { $exists: false } },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📊 Total non-customer users: ${allUsers.length}\n`);

    // Count by status
    const active = allUsers.filter((u) => u.isActive === true).length;
    const inactive = allUsers.filter((u) => u.isActive === false).length;
    const noStatus = allUsers.filter((u) => u.isActive === undefined).length;

    console.log(`✅ Active: ${active}`);
    console.log(`❌ Inactive: ${inactive}`);
    console.log(`❓ Undefined: ${noStatus}\n`);

    console.log('📋 All team members:\n');
    allUsers.forEach((u, i) => {
      const status = u.isActive === true ? '✅' : u.isActive === false ? '❌' : '❓';
      const role = u.role || 'no-role';
      console.log(
        `${i + 1}. ${status} ${u.firstName} ${u.lastName} (${u.email}) - Role: ${role}`,
      );
    });

    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listTeamMembers();

