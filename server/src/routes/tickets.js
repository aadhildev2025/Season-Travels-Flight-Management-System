import { Router } from 'express';
import * as TicketModel from '../models/Ticket.js';
import * as AuditLogModel from '../models/AuditLog.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { sendEmail, buildThankYouText, buildReminderText } from '../services/email.js';

const router = Router();

/** Helper to write an audit entry */
async function audit(req, action, target = '', details = '') {
  try {
    await AuditLogModel.createAuditLog({
      userId: req.user.userId,
      userName: req.user.name,
      userEmail: req.user.email,
      action, target, details,
      ip: req.ip || '',
    });
  } catch (e) {
    console.error('Audit log failed:', e.message);
  }
}

// GET /api/tickets
router.get('/', requireAuth, async (req, res) => {
  try {
    const rawTickets = await TicketModel.findAllTickets();
    const tickets = rawTickets.map(t => ({
      ...t,
      _id: t.id.toString(),
    }));
    return res.json({ tickets });
  } catch (err) {
    console.error('Get tickets error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tickets/analytics — Admin only
router.get('/analytics', requireAuth, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const in7Days = new Date(now);
    in7Days.setDate(now.getDate() + 7);

    const [
      total,
      todayCount,
      upcomingCount,
      checkinCount,
      remindCount,
      statusGroups,
      routeGroups,
      recentTickets,
    ] = await Promise.all([
      TicketModel.countTickets(),
      TicketModel.countTicketsWhere({
        departureTimeUTC: { gte: startOfDay.toISOString(), lte: endOfDay.toISOString() },
      }),
      TicketModel.countTicketsWhere({
        departureTimeUTC: { gte: now.toISOString(), lte: in7Days.toISOString() },
      }),
      TicketModel.countTicketsWhere({ checkin: true }),
      TicketModel.countTicketsWhere({ remind: true }),
      TicketModel.groupByStatus(),
      TicketModel.groupByRoute(5),
      TicketModel.findRecentTickets(5),
    ]);

    const formattedStatusGroups = statusGroups.map(item => ({
      _id: item.status,
      count: item._count.status,
    }));

    const formattedRouteGroups = routeGroups.map(item => ({
      _id: { from: item.from, to: item.to },
      count: Number(item.count),
    }));

    const formattedRecentTickets = recentTickets.map(t => ({
      _id: t.id.toString(),
      passengerName: t.passengerName,
      pnr: t.pnr,
      departureAirport: t.departureAirport,
      arrivalAirport: t.arrivalAirport,
      departureTimeUTC: t.departureTimeUTC,
      createdAt: t.createdAt,
    }));

    return res.json({
      total, todayCount, upcomingCount, checkinCount, remindCount,
      statusGroups: formattedStatusGroups,
      routeGroups: formattedRouteGroups,
      recentTickets: formattedRecentTickets,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tickets
router.post('/', requireAuth, async (req, res) => {
  try {
    const ticket = await TicketModel.createTicket({
      passengerName: req.body.passengerName || '',
      email: req.body.email || '',
      phone: req.body.phone || '',
      airline: req.body.airline || '',
      flightNumber: req.body.flightNumber || '',
      pnr: req.body.pnr || '',
      departureAirport: req.body.departureAirport || '',
      arrivalAirport: req.body.arrivalAirport || '',
      departureTimeUTC: req.body.departureTimeUTC || '',
      originalTimezone: req.body.originalTimezone || 'Asia/Colombo',
      remarks: req.body.remarks || '',
      status: req.body.status || 'No Need Further Actions',
      checkin: req.body.checkin || false,
      remind: req.body.remind || false,
      returnTicket: req.body.returnTicket || false,
      returnLeg: req.body.returnLeg || false,
      returnDepartureAirport: req.body.returnDepartureAirport || '',
      returnArrivalAirport: req.body.returnArrivalAirport || '',
      returnFlightNumber: req.body.returnFlightNumber || '',
      returnPnr: req.body.returnPnr || '',
      returnDepartureTimeUTC: req.body.returnDepartureTimeUTC || '',
      returnOriginalTimezone: req.body.returnOriginalTimezone || '',
      createdBy: req.user.userId,
    });

    audit(req, 'CREATE_TICKET', ticket.pnr,
      `Created ticket for ${ticket.passengerName} · ${ticket.departureAirport}→${ticket.arrivalAirport} · PNR: ${ticket.pnr}`);

    return res.json({ id: ticket.id.toString(), success: true });
  } catch (err) {
    console.error('Create ticket error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tickets/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const before = await TicketModel.findTicketById(req.params.id);
    const ticket = await TicketModel.updateTicket(req.params.id, req.body);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    // Describe what changed
    const changes = [];
    if (req.body.checkin !== undefined) changes.push(`checkin→${req.body.checkin ? 'YES' : 'NO'}`);
    if (req.body.remind !== undefined) changes.push(`remind→${req.body.remind ? 'YES' : 'NO'}`);
    if (req.body.status !== undefined && before?.status !== req.body.status) changes.push(`status→"${req.body.status}"`);
    if (req.body.passengerName) changes.push('name updated');
    const detail = changes.length ? changes.join(', ') : 'ticket updated';

    audit(req, 'UPDATE_TICKET', ticket.pnr,
      `Updated ticket PNR: ${ticket.pnr} · ${detail}`);

    return res.json({ success: true, ticket });
  } catch (err) {
    console.error('Update ticket error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tickets/expire-departed - Mark departed tickets as thanked, then remove them
router.post('/expire-departed', requireAuth, async (req, res) => {
  try {
    const now = new Date();

    const toThank = await TicketModel.findTicketsToThank();

    for (const ticket of toThank) {
      try {
        if (ticket.email) {
          const text = buildThankYouText(ticket);
          await sendEmail({ to: ticket.email, subject: text.subject, text: text.body });
        }
        await TicketModel.markThankYouSent(ticket.id);
        audit(req, 'SEND_THANK_YOU', ticket.pnr,
          `Sent thank-you email to ${ticket.passengerName} · ${ticket.pnr}`);
      } catch (err) {
        console.error('Thank-you email failed:', err);
      }
    }

    const result = await TicketModel.deleteManyTickets({
      departureTimeUTC: { lte: now.toISOString() },
    });
    return res.json({ success: true, deletedCount: result.count, thankedCount: toThank.length });
  } catch (err) {
    console.error('Expire departed tickets error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tickets/send-reminders - Auto-send reminders for departures within 24 hours
router.post('/send-reminders', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcoming = await TicketModel.findUpcomingReminders();

    for (const ticket of upcoming) {
      try {
        if (ticket.email) {
          const text = buildReminderText(ticket);
          await sendEmail({ to: ticket.email, subject: text.subject, text: text.body });
        }
        await TicketModel.markReminderSent(ticket.id);
        audit(req, 'SEND_REMINDER', ticket.pnr,
          `Sent reminder email to ${ticket.passengerName} · ${ticket.pnr}`);
      } catch (err) {
        console.error('Reminder email failed:', err);
      }
    }

    return res.json({ success: true, remindedCount: upcoming.length });
  } catch (err) {
    console.error('Send reminders error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/tickets/:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const ticket = await TicketModel.findTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    await TicketModel.deleteTicket(req.params.id);

    audit(req, 'DELETE_TICKET', ticket.pnr,
      `Deleted ticket for ${ticket.passengerName} · PNR: ${ticket.pnr}`);

    return res.json({ success: true });
  } catch (err) {
    console.error('Delete ticket error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
