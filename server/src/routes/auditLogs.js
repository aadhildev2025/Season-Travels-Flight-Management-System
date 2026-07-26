import { Router } from 'express';
import * as AuditLogModel from '../models/AuditLog.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/audit-logs — Admin only, paginated
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const { logs, total } = await AuditLogModel.findAllAuditLogs(skip, limit);

    return res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Audit logs error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
