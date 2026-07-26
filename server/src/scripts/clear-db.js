import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/season-travels';

async function clearDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    for (const collection of collections) {
      const name = collection.name;
      if (name === 'users') {
        console.log(`Skipping collection: ${name}`);
        continue;
      }
      const result = await db.collection(name).deleteMany({});
      console.log(`Cleared collection: ${name} (${result.deletedCount} documents removed)`);
    }

    console.log('Database cleared successfully (users preserved)');
    process.exit(0);
  } catch (err) {
    console.error('Error clearing database:', err.message);
    process.exit(1);
  }
}

clearDatabase();
