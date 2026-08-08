import 'dotenv/config';
import { connectDB } from './config/db.js';
import { Ticket } from './models/Ticket.js';
import mongoose from 'mongoose';

async function run() {
  console.log('Connecting to database...');
  await connectDB();
  console.log('Updating tickets with status "Additional Packages" to "Extra Baggage"...');
  const res = await Ticket.updateMany({ status: 'Additional Packages' }, { status: 'Extra Baggage' });
  console.log(`Successfully updated ${res.modifiedCount} (matched: ${res.matchedCount}) tickets.`);
  await mongoose.disconnect();
  console.log('Disconnected.');
  process.exit(0);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
