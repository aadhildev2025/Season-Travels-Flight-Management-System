import { Router } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/db.js';
import * as UserModel from '../models/User.js';
import * as AuditLogModel from '../models/AuditLog.js';
import { signToken, verifyToken, requireAuth } from '../middleware/auth.js';

const router = Router();

/** Helper */
async function audit(req, action, target = '', details = '') {
  try {
    await AuditLogModel.createAuditLog({
      userId: req.user?.userId || 'system',
      userName: req.user?.name || 'System',
      userEmail: req.user?.email || '',
      action, target, details,
      ip: req.ip || '',
    });
  } catch (e) {
    console.error('Audit log failed:', e.message);
  }
}

// GET /api/auth/quick-access — Return list of active users for fast login
router.get('/quick-access', async (req, res) => {
  try {
    const users = await UserModel.findAllUsers();
    const formatted = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role?.name || 'Staff'
    }));
    return res.json({ users: formatted });
  } catch (err) {
    console.error('Quick access error:', err);
    return res.status(200).json({ users: [], error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const input = email.toLowerCase().trim();
    let user;
    if (input.includes('@')) {
      user = await UserModel.findUserByEmail(input);
    } else {
      const escapedInput = input.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`^${escapedInput}@`, 'i');
      const allUsers = await prisma.user.findMany({
        where: { email: { contains: '@' } },
        include: { role: true },
      });
      user = allUsers.find(u => regex.test(u.email)) || null;
    }

    if (!user || !bcrypt.compareSync(password, user.passwordHash))
      return res.status(401).json({ error: 'Invalid credentials' });

    const payload = {
      userId: user.id.toString(),
      name: user.name,
      email: user.email,
      role: user.role?.name || user.role,
      timezone: user.timezone,
    };
    const token = signToken(payload);

    res.cookie('st-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    // Inline audit (no req.user yet)
    try {
      await AuditLogModel.createAuditLog({
        userId: user.id.toString(),
        userName: user.name,
        userEmail: user.email,
        action: 'LOGIN',
        target: user.email,
        details: `Logged in as ${user.role?.name || user.role}`,
        ip: req.ip || '',
      });
    } catch { /* ignore */ }

    return res.json({ user: payload });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('st-session', { path: '/' });
  return res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const token = req.cookies?.['st-session'] || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(200).json({ user: null });

  try {
    const decoded = verifyToken(token);
    const user = await UserModel.findUserById(decoded.userId);
    if (!user) return res.status(200).json({ user: null });
    return res.json({
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role?.name || user.role,
        timezone: user.timezone,
      }
    });
  } catch {
    return res.status(200).json({ user: null });
  }
});

// PUT /api/auth/profile — update own name, email, password
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const user = await UserModel.findUserById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const changes = [];
    if (req.body.name && req.body.name.trim() !== user.name) {
      changes.push(`name: "${user.name}" → "${req.body.name.trim()}"`);
    }
    if (req.body.email && req.body.email.trim().toLowerCase() !== user.email) {
      const exists = await UserModel.findUserByEmailExcludingId(req.body.email.trim().toLowerCase(), req.user.userId);
      if (exists) return res.status(400).json({ error: 'Email already in use' });
      changes.push(`email: "${user.email}" → "${req.body.email.trim().toLowerCase()}"`);
    }
    if (req.body.currentPassword && req.body.newPassword) {
      if (!bcrypt.compareSync(req.body.currentPassword, user.passwordHash))
        return res.status(400).json({ error: 'Current password is incorrect' });
      changes.push('password changed');
    }

    const updatedUser = await UserModel.updateUser(req.user.userId, req.body);

    // Re-issue token with updated info
    const newPayload = {
      userId: updatedUser.id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role?.name || updatedUser.role,
      timezone: updatedUser.timezone,
    };
    const token = signToken(newPayload);
    res.cookie('st-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', path: '/',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    audit(req, 'UPDATE_PROFILE', updatedUser.email, `Profile updated: ${changes.join('; ') || 'no changes'}`);

    return res.json({ user: newPayload, success: true });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
