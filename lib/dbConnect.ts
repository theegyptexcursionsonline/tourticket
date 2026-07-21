/* eslint-disable @typescript-eslint/no-require-imports */
import mongoose from 'mongoose';
import { connectWithTransientRetry } from './mongoConnectionPolicy';
export { isTransientMongoConnectionError } from './mongoConnectionPolicy';

type Cache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = global as typeof globalThis & { mongoose?: Cache };
const cached = globalWithMongoose.mongoose ?? (globalWithMongoose.mongoose = {
  conn: null,
  promise: null,
});

export function isDatabaseAvailable(): boolean {
  return !!process.env.MONGODB_URI;
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }
  return uri;
}

function loadModels() {
  const models: [string, string][] = [
    ['User', './models/user'], ['Tour', './models/Tour'],
    ['Destination', './models/Destination'], ['Category', './models/Category'],
    ['Review', './models/Review'], ['Booking', './models/Booking'],
    ['Blog', './models/Blog'], ['AttractionPage', './models/AttractionPage'],
    ['Discount', './models/Discount'], ['Job', './models/Job'], ['Otp', './models/Otp'],
  ];
  for (const [name, path] of models) {
    if (!mongoose.models[name]) require(path);
  }
}

const connectOptions: mongoose.ConnectOptions = {
  bufferCommands: false,
  maxPoolSize: 5,
  minPoolSize: 0,
  maxConnecting: 1,
  maxIdleTimeMS: 60_000,
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
  family: 4,
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function connectWithRetry(): Promise<typeof mongoose> {
  // One short retry absorbs occasional Atlas/Netlify TLS handshakes without
  // turning a real outage into a retry storm.
  return connectWithTransientRetry(
    () => mongoose.connect(getMongoUri(), connectOptions),
    () => wait(250 + Math.floor(Math.random() * 250)),
  );
}

async function dbConnect() {
  if (!isDatabaseAvailable()) getMongoUri();

  if (cached.conn && mongoose.connection.readyState === mongoose.ConnectionStates.connected) {
    return cached.conn;
  }

  if (cached.conn && mongoose.connection.readyState !== mongoose.ConnectionStates.connected) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    const attempt = connectWithRetry();
    cached.promise = attempt;
    attempt.catch(() => {
      if (cached.promise === attempt) cached.promise = null;
      cached.conn = null;
    });
  }

  const connection = await cached.promise;
  cached.conn = connection;
  loadModels();
  return connection;
}

export function getConnectionStatus() {
  return ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';
}

export async function closeConnection() {
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.disconnected) {
    await mongoose.connection.close();
  }
  cached.conn = null;
  cached.promise = null;
}

export default dbConnect;
