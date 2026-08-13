import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'Staff' },
  timezone: { type: String, default: 'Europe/Stockholm' },
  permissions: { type: [String], default: ['dashboard', 'note-summarizer', 'password-credential', 'spreadsheets', 'staff-calendar'] },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema);

export async function findUserByEmail(email) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  return user ? formatUser(user) : null;
}

export async function findUserById(id) {
  try {
    const user = await User.findById(id);
    return user ? formatUser(user) : null;
  } catch {
    return null;
  }
}

export async function createUser(data) {
  const passwordHash = await bcrypt.hash(data.password || 'staff123', 10);
  const user = await User.create({
    name: data.name,
    email: data.email.toLowerCase().trim(),
    passwordHash,
    role: data.role || 'Staff',
    timezone: data.timezone || 'Europe/Stockholm',
    permissions: data.permissions || ['dashboard', 'note-summarizer', 'password-credential', 'spreadsheets', 'staff-calendar'],
  });
  return formatUser(user);
}

export async function updateUser(id, data) {
  const updateData = {};
  if (data.name) updateData.name = data.name.trim();
  if (data.email) updateData.email = data.email.toLowerCase().trim();
  if (data.timezone) updateData.timezone = data.timezone;
  if (data.role) updateData.role = data.role;
  if (data.permissions !== undefined) updateData.permissions = data.permissions;
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }

  const user = await User.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
  return user ? formatUser(user) : null;
}

export async function deleteUser(id) {
  return User.findByIdAndDelete(id);
}

export async function countUsers() {
  return User.countDocuments();
}

export async function findAllUsers() {
  const users = await User.find().sort({ name: 1 });
  return users.map(formatUser);
}

export async function findUserByEmailExcludingId(email, excludeId) {
  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    _id: { $ne: excludeId },
  });
  return user ? formatUser(user) : null;
}

export async function findUsersByEmails(emails) {
  const users = await User.find({ email: { $in: emails } });
  return users.map(formatUser);
}

function formatUser(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  const idStr = obj._id ? obj._id.toString() : (obj.id ? String(obj.id) : '');
  const roleName = typeof obj.role === 'object' && obj.role ? (obj.role.name || 'Staff') : (obj.role || 'Staff');
  const defaultPerms = ['dashboard', 'note-summarizer', 'password-credential', 'spreadsheets', 'staff-calendar'];
  return {
    id: idStr,
    _id: idStr,
    name: obj.name,
    email: obj.email,
    passwordHash: obj.passwordHash,
    role: roleName,
    timezone: obj.timezone || 'Europe/Stockholm',
    permissions: Array.isArray(obj.permissions) ? obj.permissions : defaultPerms,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}
