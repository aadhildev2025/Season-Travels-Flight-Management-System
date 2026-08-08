import mongoose from 'mongoose';

const credentialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  username: { type: String, default: '' },
  password: { type: String, required: true },
  notes: { type: String, default: '' },
  folder: { type: String, default: 'Notes' },
  createdBy: { type: String, default: null },
}, { timestamps: true });

credentialSchema.index({ title: 1 });
credentialSchema.index({ createdAt: -1 });

export const Credential = mongoose.models.Credential || mongoose.model('Credential', credentialSchema);

export async function findAllCredentials() {
  const docs = await Credential.find().sort({ createdAt: -1 });
  return docs.map(formatCredential);
}

export async function findCredentialById(id) {
  try {
    const doc = await Credential.findById(id);
    return doc ? formatCredential(doc) : null;
  } catch {
    return null;
  }
}

export async function createCredential(data) {
  const doc = await Credential.create({
    title: data.title,
    username: data.username || '',
    password: data.password,
    notes: data.notes || '',
    folder: data.folder || 'Notes',
    createdBy: data.createdBy ? String(data.createdBy) : null,
  });
  return formatCredential(doc);
}

export async function updateCredential(id, data) {
  const updateData = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.username !== undefined) updateData.username = data.username;
  if (data.password !== undefined) updateData.password = data.password;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.folder !== undefined) updateData.folder = data.folder;

  const doc = await Credential.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
  return doc ? formatCredential(doc) : null;
}

export async function deleteCredential(id) {
  return Credential.findByIdAndDelete(id);
}

function formatCredential(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  const idStr = obj._id ? obj._id.toString() : (obj.id ? String(obj.id) : '');
  return {
    id: idStr,
    _id: idStr,
    title: obj.title,
    username: obj.username || '',
    password: obj.password,
    notes: obj.notes || '',
    folder: obj.folder || 'Notes',
    createdBy: obj.createdBy || null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}