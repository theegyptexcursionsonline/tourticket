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
      // Additional connection options for better performance and reliability
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log('Database connected successfully');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    
    // Ensure all models are loaded - this is crucial for proper model registration
    // Core Models
    if (!mongoose.models.User) {
      require('./models/user');
    }
    
    if (!mongoose.models.Tour) {
      require('./models/Tour');
    }
    
    if (!mongoose.models.Destination) {
      require('./models/Destination');
    }
    
    if (!mongoose.models.Category) {
      require('./models/Category');
    }
    
    if (!mongoose.models.Review) {
      require('./models/Review');
    }
    
    if (!mongoose.models.Booking) {
      require('./models/Booking');
    }
    
    if (!mongoose.models.Blog) {
      require('./models/Blog');
    }
    
    // New Models
    if (!mongoose.models.AttractionPage) {
      require('./models/AttractionPage');
    }
    
    if (!mongoose.models.Discount) {
      require('./models/Discount');
    }
    
    if (!mongoose.models.Job) {
      require('./models/Job');
    }
    
    if (!mongoose.models.Otp) {
      require('./models/Otp');
    }

    // Log loaded models for debugging (optional - remove in production)
    if (process.env.NODE_ENV === 'development') {
      const modelNames = Object.keys(mongoose.models);
      console.log('Loaded models:', modelNames.join(', '));
    }
    
  } catch (e) {
    cached.promise = null;
    console.error('Database connection error:', e);
    throw e;
  }

  return cached.conn;
}

// Helper function to check connection status
export function getConnectionStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  
  return states[mongoose.connection.readyState as keyof typeof states] || 'unknown';
}

// Helper function to close connection (useful for testing)
export async function closeConnection() {
  if (cached.conn) {
    await mongoose.connection.close();
    cached.conn = null;
    cached.promise = null;
    console.log('Database connection closed');
  }
}

// Event listeners for connection monitoring
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

export default dbConnect;