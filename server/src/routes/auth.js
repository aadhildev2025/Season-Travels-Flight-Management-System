import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

/** Helper */
async function audit(req, action, target = '', details = '') {
  try {
    await AuditLog.create({
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

// GET /api/auth/quick-access
router.get('/quick-access', async (req, res) => {
  try {
    const users = await User.find({}, 'name email role');
    return res.json({ users });
  } catch (err) {
    console.error('Quick access users error:', err);
    return res.status(500).json({ error: 'Internal server error' });
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
      user = await User.findOne({ email: input });
    } else {
      const escapedInput = input.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      user = await User.findOne({ email: new RegExp(`^${escapedInput}@`, 'i') });
    }

    if (!user || !bcrypt.compareSync(password, user.passwordHash))
      return res.status(401).json({ error: 'Invalid credentials' });

    const payload = { userId: user._id.toString(), name: user.name, email: user.email, role: user.role, timezone: user.timezone };
    const token   = signToken(payload);

    res.cookie('st-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    // Inline audit (no req.user yet)
    try {
      await AuditLog.create({
        userId: user._id.toString(), userName: user.name, userEmail: user.email,
        action: 'LOGIN', target: user.email, details: `Logged in as ${user.role}`,
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
    const { verifyToken } = await import('../middleware/auth.js');
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) return res.status(200).json({ user: null });
    return res.json({ user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role, timezone: user.timezone } });
  } catch {
    return res.status(200).json({ user: null });
  }
});

// PUT /api/auth/profile — update own name, email, password
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const changes = [];
    if (req.body.name && req.body.name.trim() !== user.name) {
      changes.push(`name: "${user.name}" → "${req.body.name.trim()}"`);
      user.name = req.body.name.trim();
    }
    if (req.body.email && req.body.email.trim().toLowerCase() !== user.email) {
      const exists = await User.findOne({ email: req.body.email.trim().toLowerCase(), _id: { $ne: user._id } });
      if (exists) return res.status(400).json({ error: 'Email already in use' });
      changes.push(`email: "${user.email}" → "${req.body.email.trim().toLowerCase()}"`);
      user.email = req.body.email.trim().toLowerCase();
    }
    if (req.body.currentPassword && req.body.newPassword) {
      if (!bcrypt.compareSync(req.body.currentPassword, user.passwordHash))
        return res.status(400).json({ error: 'Current password is incorrect' });
      user.passwordHash = bcrypt.hashSync(req.body.newPassword, 10);
      changes.push('password changed');
    }

    await user.save();

    // Re-issue token with updated info
    const newPayload = { userId: user._id.toString(), name: user.name, email: user.email, role: user.role, timezone: user.timezone };
    const token = signToken(newPayload);
    res.cookie('st-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', path: '/',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });

    audit(req, 'UPDATE_PROFILE', user.email, `Profile updated: ${changes.join('; ') || 'no changes'}`);

    return res.json({ user: newPayload, success: true });
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
