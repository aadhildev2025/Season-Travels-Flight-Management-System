import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId:     { type: String, required: true },
  userName:   { type: String, required: true },
  userEmail:  { type: String, required: true },
  action:     { type: String, required: true }, // 'CREATE_TICKET' | 'UPDATE_TICKET' | 'DELETE_TICKET' | 'LOGIN' | 'UPDATE_PROFILE' | 'CREATE_STAFF' | 'DELETE_STAFF'
  target:     { type: String, default: '' },    // ticket PNR or user email
  details:    { type: String, default: '' },    // human-readable summary
  ip:         { type: String, default: '' },
}, { timestamps: true });

// Index for fast pagination sorting
auditLogSchema.index({ createdAt: -1 });

// TTL Index: Auto-delete logs older than 30 days (30 days * 24h * 60m * 60s)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default mongoose.model('AuditLog', auditLogSchema);
