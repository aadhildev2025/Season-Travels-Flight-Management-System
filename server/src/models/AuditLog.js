import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId: { type: String, default: 'system' },
  userName: { type: String, default: 'System' },
  userEmail: { type: String, default: '' },
  action: { type: String, required: true },
  target: { type: String, default: '' },
  details: { type: String, default: '' },
  ip: { type: String, default: '' },
}, { timestamps: true });

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);

export async function createAuditLog(data) {
  const log = await AuditLog.create({
    userId: String(data.userId || 'system'),
    userName: String(data.userName || 'System'),
    userEmail: String(data.userEmail || ''),
    action: String(data.action || ''),
    target: String(data.target || ''),
    details: String(data.details || ''),
    ip: String(data.ip || ''),
  });
  return formatAuditLog(log);
}

export async function findAllAuditLogs(skip = 0, limit = 50) {
  const [logs, total] = await Promise.all([
    AuditLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(),
  ]);

  return {
    logs: logs.map(formatAuditLog),
    total,
  };
}

function formatAuditLog(doc) {
  const obj = doc.toObject ? doc.toObject() : doc;
  const idStr = obj._id ? obj._id.toString() : (obj.id ? String(obj.id) : '');
  return {
    id: idStr,
    _id: idStr,
    userId: obj.userId,
    userName: obj.userName,
    userEmail: obj.userEmail,
    action: obj.action,
    target: obj.target,
    details: obj.details,
    ip: obj.ip,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}
