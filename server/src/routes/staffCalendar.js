import { Router } from 'express';
import {
  findAllCalendarStaff,
  createCalendarStaff,
  deleteCalendarStaff,
  deleteAllCalendarStaff,
  findAllCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  deleteAllCalendarEvents,
  CalendarStaff,
  CalendarEvent,
} from '../models/StaffCalendar.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/staff-calendar/staff
router.get('/staff', requireAuth, async (_req, res) => {
  try {
    const staff = await findAllCalendarStaff();
    return res.json({ staff });
  } catch (err) {
    console.error('Get calendar staff error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/staff-calendar/staff (Clear all staff)
router.delete('/staff', requireAuth, async (_req, res) => {
  try {
    await deleteAllCalendarStaff();
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete all calendar staff error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/staff-calendar/staff
router.post('/staff', requireAuth, async (req, res) => {
  try {
    const { name, role, department, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Staff name is required' });
    }
    const staff = await createCalendarStaff({
      name: name.trim(),
      role: role || 'Staff',
      department: department || 'General',
      color: color || '#6366f1',
    });
    return res.json({ staff, success: true });
  } catch (err) {
    console.error('Create calendar staff error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/staff-calendar/staff/:id
router.delete('/staff/:id', requireAuth, async (req, res) => {
  try {
    await deleteCalendarStaff(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete calendar staff error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/staff-calendar/events
router.get('/events', requireAuth, async (_req, res) => {
  try {
    const events = await findAllCalendarEvents();
    return res.json({ events });
  } catch (err) {
    console.error('Get calendar events error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/staff-calendar/events (Clear all events)
router.delete('/events', requireAuth, async (_req, res) => {
  try {
    await deleteAllCalendarEvents();
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete all calendar events error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/staff-calendar/events
router.post('/events', requireAuth, async (req, res) => {
  try {
    const { title, staffId, staffName, date, startTime, finishTime, department, color, location, notes } = req.body;
    if (!title || !date || !startTime || !finishTime || !staffName) {
      return res.status(400).json({ error: 'Missing required shift fields' });
    }
    const event = await createCalendarEvent({
      title: title.trim(),
      staffId,
      staffName,
      date,
      startTime,
      finishTime,
      department: department || 'General',
      color: color || '#6366f1',
      location: location || '',
      notes: notes || '',
    });
    return res.json({ event, success: true });
  } catch (err) {
    console.error('Create calendar event error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/staff-calendar/events/:id
router.put('/events/:id', requireAuth, async (req, res) => {
  try {
    const event = await updateCalendarEvent(req.params.id, req.body);
    return res.json({ event, success: true });
  } catch (err) {
    console.error('Update calendar event error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/staff-calendar/events/:id
router.delete('/events/:id', requireAuth, async (req, res) => {
  try {
    await deleteCalendarEvent(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete calendar event error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/staff-calendar/seed
router.post('/seed', requireAuth, async (_req, res) => {
  try {
    await seedDefaultCalendar();
    const staff = await findAllCalendarStaff();
    const events = await findAllCalendarEvents();
    return res.json({ staff, events, success: true });
  } catch (err) {
    console.error('Seed calendar error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
