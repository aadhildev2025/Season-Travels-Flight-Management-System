import { Router } from 'express';
import bcrypt from 'bcryptjs';
import * as UserModel from '../models/User.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await UserModel.findAllUsers();
    const sanitized = users.map(u => ({
      id: u.id.toString(),
      name: u.name,
      email: u.email,
      role: u.role?.name || u.role,
      timezone: u.timezone,
      permissions: u.permissions,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
    return res.json({ users: sanitized });
  } catch (err) {
    console.error('Get staff error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role, timezone, permissions } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const existing = await UserModel.findUserByEmail(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const user = await UserModel.createUser({
      name,
      email,
      password: password || 'staff123',
      role: role || 'Staff',
      timezone: timezone || 'Europe/Stockholm',
      permissions: Array.isArray(permissions) ? permissions : undefined,
    });

    return res.json({ id: user.id.toString(), success: true });
  } catch (err) {
    console.error('Create staff error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    await UserModel.deleteUser(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete staff error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, role, timezone, password, permissions } = req.body;
    const user = await UserModel.findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (email) {
      const emailTrimmed = email.toLowerCase().trim();
      if (emailTrimmed !== user.email) {
        const existing = await UserModel.findUserByEmailExcludingId(emailTrimmed, req.params.id);
        if (existing) {
          return res.status(409).json({ error: 'Email already in use' });
        }
      }
    }

    await UserModel.updateUser(req.params.id, req.body);
    return res.json({ success: true });
  } catch (err) {
    console.error('Update staff error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
