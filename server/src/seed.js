import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import * as UserModel from './models/User.js';

const SEED_USERS = [
  {
    name: 'Lars Svensson',
    email: 'lars.s@seasontravels.se',
    password: 'admin123',
    role: 'Admin',
    timezone: 'Europe/Stockholm',
  },
  {
    name: 'Anura Perera',
    email: 'anura.p@seasontravels.lk',
    password: 'staff123',
    role: 'Staff',
    timezone: 'Asia/Colombo',
  },
  {
    name: 'Sofia Andersson',
    email: 'sofia.a@seasontravels.se',
    password: 'staff123',
    role: 'Staff',
    timezone: 'Europe/Stockholm',
  },
];

async function seed() {
  try {
    await connectDB();

    const count = await UserModel.countUsers();
    if (count > 0) {
      console.log(`Database already has ${count} users. Skipping seed.`);
      process.exit(0);
    }

    for (const u of SEED_USERS) {
      const user = await UserModel.createUser({
        name: u.name,
        email: u.email,
        password: u.password,
        role: u.role,
        timezone: u.timezone,
      });
      console.log(`Created user: ${user.name} (${user.role?.name || user.role})`);
    }

    console.log('Seed complete.');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();
