import { Router } from 'express';
import {
  CalendarStaff,
  findAllCalendarStaff,
  createCalendarStaff,
  deleteCalendarStaff,
  deleteAllCalendarStaff,
  findAllCalendarEvents,
  createCalendarEvent,
  createManyCalendarEvents,
  updateCalendarEvent,
  deleteCalendarEvent,
  deleteAllCalendarEvents,
  findAllHolidayRequests,
  createHolidayRequest,
  updateHolidayRequestStatus,
  deleteHolidayRequest,
  deleteAllHolidayRequests,
} from '../models/StaffCalendar.js';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const DEPARTMENTS = [
  'Ticketing & Sales',
  'Flight Operations',
  'Customer Support',
  'Visa & Finance',
  'Executive Ops'
];

const PALETTE = [
  '#6366f1', '#a855f7', '#0284c7', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6',
  '#14b8a6', '#84cc16'
];

async function ensureCalendarStaffSeeded(staffList) {
  if (staffList && staffList.length > 0) return staffList;
  try {
    const mainUsers = await User.find().lean();
    if (mainUsers && mainUsers.length > 0) {
      const staffToCreate = mainUsers.map((u, idx) => ({
        name: u.name || u.email,
        role: u.role || 'Staff',
        department: u.department || DEPARTMENTS[idx % DEPARTMENTS.length],
        color: PALETTE[idx % PALETTE.length],
        active: true
      }));
      const createdDocs = await CalendarStaff.insertMany(staffToCreate);
      return createdDocs.map(d => {
        const obj = d.toObject ? d.toObject() : d;
        const idStr = obj._id ? obj._id.toString() : String(obj.id || '');
        return { ...obj, id: idStr, _id: idStr };
      });
    }
  } catch (err) {
    console.warn('Auto-seed calendar staff failed:', err);
  }
  return staffList || [];
}


// GET /api/staff-calendar/all (Batch endpoint for instant 1-request loading)
router.get('/all', requireAuth, async (_req, res) => {
  try {
    let [staff, events, holidays] = await Promise.all([
      findAllCalendarStaff(),
      findAllCalendarEvents(),
      findAllHolidayRequests(),
    ]);

    staff = await ensureCalendarStaffSeeded(staff);

    return res.json({ staff, events, holidays });
  } catch (err) {
    console.error('Get all staff calendar data error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/staff-calendar/staff
router.get('/staff', requireAuth, async (_req, res) => {
  try {
    let staff = await findAllCalendarStaff();
    staff = await ensureCalendarStaffSeeded(staff);
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

// POST /api/staff-calendar/events (Supports single creation or array of dates for multi-weekday creation)
router.post('/events', requireAuth, async (req, res) => {
  try {
    const { title, staffId, staffName, date, dates, startTime, finishTime, timezone, department, color, location, notes } = req.body;
    if (!title || !startTime || !finishTime || !staffName) {
      return res.status(400).json({ error: 'Missing required shift fields' });
    }

    if (Array.isArray(dates) && dates.length > 0) {
      const eventsData = dates.map(d => ({
        title: title.trim(),
        staffId,
        staffName,
        date: d,
        startTime,
        finishTime,
        timezone: timezone || 'CET',
        department: department || 'General',
        color: color || '#6366f1',
        location: location || '',
        notes: notes || '',
      }));
      const events = await createManyCalendarEvents(eventsData);
      return res.json({ events, success: true });
    }

    if (!date) {
      return res.status(400).json({ error: 'Date or dates array is required' });
    }

    const event = await createCalendarEvent({
      title: title.trim(),
      staffId,
      staffName,
      date,
      startTime,
      finishTime,
      timezone: timezone || 'CET',
      department: department || 'General',
      color: color || '#6366f1',
      location: location || '',
      notes: notes || '',
    });
    return res.json({ event, events: [event], success: true });
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

// ════════════════════ HOLIDAY REQUESTS ════════════════════

// GET /api/staff-calendar/holidays
router.get('/holidays', requireAuth, async (_req, res) => {
  try {
    const holidays = await findAllHolidayRequests();
    return res.json({ holidays });
  } catch (err) {
    console.error('Get holiday requests error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/staff-calendar/holidays (Create Holiday Request)
router.post('/holidays', requireAuth, async (req, res) => {
  try {
    const { staffId, staffName, startDate, endDate, reason } = req.body;
    if (!staffId || !staffName || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required holiday fields' });
    }
    const holiday = await createHolidayRequest({
      staffId,
      staffName,
      startDate,
      endDate,
      reason: reason || ''
    });
    return res.json({ holiday, success: true });
  } catch (err) {
    console.error('Create holiday request error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/staff-calendar/holidays/:id/status (Approve or Reject)
router.put('/holidays/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const holiday = await updateHolidayRequestStatus(req.params.id, status);
    return res.json({ holiday, success: true });
  } catch (err) {
    console.error('Update holiday status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/staff-calendar/holidays (Clear all holiday requests)
router.delete('/holidays', requireAuth, async (_req, res) => {
  try {
    await deleteAllHolidayRequests();
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete all holiday requests error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/staff-calendar/holidays/:id
router.delete('/holidays/:id', requireAuth, async (req, res) => {
  try {
    await deleteHolidayRequest(req.params.id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Delete holiday request error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
