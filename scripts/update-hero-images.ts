// scripts/update-hero-images.ts
// Updates HeroSettings to use .jpg instead of .png for hero images

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

async function updateHeroImages() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const heroSettingsCollection = db.collection('herosettings');

    // Find all hero settings
    const settings = await heroSettingsCollection.find({}).toArray();
    console.log(`📊 Found ${settings.length} hero settings documents`);

    for (const setting of settings) {
      let updated = false;
      const updates: any = {};

      // Update backgroundImages array
      if (setting.backgroundImages && Array.isArray(setting.backgroundImages)) {
        const updatedImages = setting.backgroundImages.map((img: any) => {
          if (img.desktop) {
            // Replace .png with .jpg
            if (img.desktop === '/hero2.png') {
              updated = true;
              return { ...img, desktop: '/hero2.jpg' };
            }
            if (img.desktop === '/hero3.png') {
              updated = true;
              return { ...img, desktop: '/hero3.jpg' };
            }
          }
          return img;
        });

        if (updated) {
          updates.backgroundImages = updatedImages;
        }
      }

      // Update currentActiveImage
      if (setting.currentActiveImage) {
        if (setting.currentActiveImage === '/hero2.png') {
          updates.currentActiveImage = '/hero2.jpg';
          updated = true;
        } else if (setting.currentActiveImage === '/hero3.png') {
          updates.currentActiveImage = '/hero3.jpg';
          updated = true;
        }
      }

      // Perform update if needed
      if (updated) {
        await heroSettingsCollection.updateOne(
          { _id: setting._id },
          { $set: updates }
        );
        console.log(`✅ Updated hero settings: ${setting._id}`);
        console.log('   Updated fields:', Object.keys(updates));
      }
    }

    console.log('');
    console.log('✅ Hero image paths updated successfully!');
    console.log('');
    console.log('Updated paths:');
    console.log('  /hero2.png → /hero2.jpg');
    console.log('  /hero3.png → /hero3.jpg');
    console.log('');

  } catch (error) {
    console.error('❌ Error updating hero images:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the update
updateHeroImages();
