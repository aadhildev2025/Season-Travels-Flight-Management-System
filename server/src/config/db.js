import mongoose from 'mongoose';

export async function connectDB() {
  try {
    const connStr = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/season-travels';
    await mongoose.connect(connStr);
    console.log('MongoDB connected successfully via Mongoose');
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
}

export async function isDBReady() {
  return mongoose.connection.readyState === 1;
}

export default mongoose;
