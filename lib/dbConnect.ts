// lib/dbConnect.ts

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log('Database connected successfully');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    
    // Ensure models are loaded
    if (!mongoose.models.Tour) {
      require('./models/Tour');
    }
    if (!mongoose.models.Destination) {
      require('./models/Destination');
    }
    if (!mongoose.models.Category) {
      require('./models/Category');
    }
    if (!mongoose.models.User) {
      require('./models/user');
    }
    if (!mongoose.models.Review) {
      require('./models/Review');
    }
    if (!mongoose.models.Blog) {
      require('./models/Blog');
    }
    
  } catch (e) {
    cached.promise = null;
    console.error('Database connection error:', e);
    throw e;
  }

  return cached.conn;
}

export default dbConnect;