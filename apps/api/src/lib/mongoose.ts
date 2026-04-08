import mongoose from 'mongoose';

let isConnected = false;

export async function connectMongoose(): Promise<void> {
  if (isConnected) return;

  const MONGODB_URI = process.env['MONGODB_URI'];
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  isConnected = true;
  console.log('[mongoose] Connected to MongoDB');

  mongoose.connection.on('error', (err: unknown) => {
    console.error('[mongoose] Connection error:', err);
    isConnected = false;
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[mongoose] Disconnected from MongoDB');
    isConnected = false;
  });
}

export async function disconnectMongoose(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  console.log('[mongoose] Disconnected');
}
