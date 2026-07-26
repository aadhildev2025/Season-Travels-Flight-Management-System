import 'dotenv/config';
import { connectDB } from './config/db.js';
import { User, createUser } from './models/User.js';
import { Ticket } from './models/Ticket.js';
import { AuditLog } from './models/AuditLog.js';

export const ADMIN_USER = {
  name: 'Lars Svensson',
  email: 'lars.s@seasontravels.se',
  password: 'admin123',
  role: 'Admin',
  timezone: 'Europe/Stockholm',
};

export async function clearAndSeedAdmin() {
  try {
    console.log('Clearing database collections...');
    await User.deleteMany({});
    await Ticket.deleteMany({});
    await AuditLog.deleteMany({});

    console.log('Creating Admin user...');
    const admin = await createUser(ADMIN_USER);
    console.log(`Database reset successfully! Created Admin user: ${admin.email} (${admin.name})`);
    return admin;
  } catch (err) {
    console.error('Reset database failed:', err.message);
    throw err;
  }
}

export async function seedUsers() {
  try {
    const count = await User.countDocuments();
    if (count > 0) {
      console.log(`Database already initialized with ${count} user(s).`);
      return;
    }

    console.log('Initializing database with default Admin user...');
    await createUser(ADMIN_USER);
    console.log('Admin user seeded successfully.');
  } catch (err) {
    console.error('Seed error:', err.message);
  }
}

if (process.argv[1] && (process.argv[1].endsWith('seed.js') || process.argv[1].endsWith('seed'))) {
  connectDB().then(async () => {
    await clearAndSeedAdmin();
    process.exit(0);
  });
}
