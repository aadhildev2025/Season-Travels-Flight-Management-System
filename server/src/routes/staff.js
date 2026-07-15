import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.find()
      .select('-passwordHash')
      .sort({ name: 1 });
    return res.json({ users });
  } catch (err) {
    console.error('Get staff error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role, timezone } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const passwordHash = bcrypt.hashSync(password || 'staff123', 10);
    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      role: role || 'Staff',
      timezone: timezone || 'Europe/Stockholm',
    });

    return res.json({ id: user._id.toString(), success: true });
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

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete staff error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, role, timezone, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name !== undefined) user.name = name.trim();
    if (email !== undefined) {
      const emailTrimmed = email.toLowerCase().trim();
      if (emailTrimmed !== user.email) {
        const existing = await User.findOne({ email: emailTrimmed, _id: { $ne: user._id } });
        if (existing) {
          return res.status(409).json({ error: 'Email already in use' });
        }
        user.email = emailTrimmed;
      }
    }
    if (role !== undefined) user.role = role;
    if (timezone !== undefined) user.timezone = timezone;
    if (password !== undefined && password) {
      user.passwordHash = bcrypt.hashSync(password, 10);
    }

    await user.save();
    return res.json({ success: true });
  } catch (err) {
    console.error('Update staff error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
