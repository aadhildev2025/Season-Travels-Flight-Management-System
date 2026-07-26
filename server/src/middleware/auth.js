import jwt from 'jsonwebtoken';
import * as UserModel from '../models/User.js';

const SECRET = process.env.JWT_SECRET || 'season-travels-secret-key-change-in-production';

// ── In-memory user cache to avoid a DB round-trip on every request ──
// Entries expire after 60 s so stale role/name changes propagate quickly.
const userCache = new Map();
const USER_CACHE_TTL_MS = 60_000;

function getCachedUser(id) {
  const entry = userCache.get(id);
  if (!entry) return null;
  if (Date.now() - entry.ts > USER_CACHE_TTL_MS) {
    userCache.delete(id);
    return null;
  }
  return entry.user;
}

function setCachedUser(id, user) {
  userCache.set(id, { user, ts: Date.now() });
  // Prevent unbounded growth — evict oldest entries when cache exceeds 500 items
  if (userCache.size > 500) {
    const firstKey = userCache.keys().next().value;
    userCache.delete(firstKey);
  }
}

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '365d' });
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

export async function requireAuth(req, res, next) {
  const token = req.cookies?.['st-session'] || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = verifyToken(token);
    const userId = decoded.userId;

    // Try cache first to skip a DB round-trip on every request
    let user = getCachedUser(userId);
    if (!user) {
      user = await UserModel.findUserById(userId);
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      setCachedUser(userId, user);
    }

    req.user = {
      userId: user.id.toString(),
      name: user.name,
      email: user.email,
      role: user.role?.name || user.role,
      timezone: user.timezone,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'Admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
