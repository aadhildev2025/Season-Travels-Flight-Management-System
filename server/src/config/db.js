import mongoose from 'mongoose';

let connectionPromise = null;

export async function connectDB() {
  if (connectionPromise) return connectionPromise;
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  connectionPromise = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  }).then(() => {
    console.log('MongoDB connected to', uri.split('@')[1]?.split('/')[0] || 'cluster');
    return true;
  }).catch(err => {
    console.error('MongoDB connection error:', err.message);
    connectionPromise = null;
    throw err;
  });
  return connectionPromise;
}

export async function isDBReady() {
  try {
    const state = mongoose.connection.readyState;
    return state === 1 || state === 2 || state === 3;
  } catch {
    return false;
  }
}

export default connectDB;
