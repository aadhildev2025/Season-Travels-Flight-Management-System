import { Router } from 'express';
import * as TicketModel from '../models/Ticket.js';
import * as AuditLogModel from '../models/AuditLog.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { sendEmail, buildThankYouMessage, buildReminderMessage } from '../services/email.js';

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

// GET /api/tickets - List all tickets
router.get('/', requireAuth, async (req, res) => {
  try {
    const tickets = await TicketModel.findAllTickets();
    return res.json({ tickets });
  } catch (err) {
    console.error('Get tickets error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tickets/analytics - Summary metrics for dashboard
router.get('/analytics', requireAuth, async (req, res) => {
  try {
    const total = await TicketModel.countTickets();

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const todayCount = await TicketModel.countTicketsWhere({
      departureTimeUTC: { gte: startOfDay, lte: endOfDay },
    });

    const upcomingCount = await TicketModel.countTicketsWhere({
      departureTimeUTC: { gte: now.toISOString(), lte: in24Hours },
    });

    const checkinCount = await TicketModel.countTicketsWhere({ checkin: true });
    const remindCount = await TicketModel.countTicketsWhere({ remind: true });

    const statusGroups = await TicketModel.groupByStatus();
    const routeRaw = await TicketModel.groupByRoute(5);
    const routeGroups = routeRaw.map(r => ({
      _id: { from: r.from, to: r.to },
      count: Number(r.count),
    }));

    const recentTickets = await TicketModel.findRecentTickets(5);

    return res.json({
      total,
      todayCount,
      upcomingCount,
      checkinCount,
      remindCount,
      statusGroups,
      routeGroups,
      recentTickets,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tickets - Create ticket
router.post('/', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    if (!data.passengerName) {
      return res.status(400).json({ error: 'passengerName is required' });
    }

    const newTicket = await TicketModel.createTicket({
      ...data,
      createdBy: req.user.userId,
    });

    audit(req, 'CREATE_TICKET', newTicket.pnr || newTicket.passengerName,
      `Created ticket for ${newTicket.passengerName} · PNR: ${newTicket.pnr || 'N/A'}`);

    return res.json({ ticket: newTicket });
  } catch (err) {
    console.error('Create ticket error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tickets/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const ticket = await TicketModel.findTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    return res.json({ ticket });
  } catch (err) {
    console.error('Get ticket error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/tickets/:id
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const existing = await TicketModel.findTicketById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Ticket not found' });

    const updated = await TicketModel.updateTicket(req.params.id, req.body);

    audit(req, 'UPDATE_TICKET', updated.pnr || updated.passengerName,
      `Updated ticket for ${updated.passengerName} · PNR: ${updated.pnr || 'N/A'}`);

    return res.json({ ticket: updated });
  } catch (err) {
    console.error('Update ticket error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/tickets/expire-departed
// Phase 1: At departure time → mark as departed (UI removes them immediately)
// Phase 2: 48h after departure → send thank-you email, then delete
router.post('/expire-departed', requireAuth, async (req, res) => {
  try {
    const now = new Date();

    // --- Phase 1: Mark newly-departed tickets ---
    // Find tickets whose departure time has passed but are not yet marked as departed
    const allTickets = await TicketModel.findAllTickets();
    const newlyDeparted = allTickets.filter(t =>
      t.departureTimeUTC && new Date(t.departureTimeUTC) <= now && !t.departed
    );
    for (const ticket of newlyDeparted) {
      await TicketModel.markDeparted(ticket.id || ticket._id);
    }

    // --- Phase 2: Send thank-you emails and delete tickets departed 48h+ ago ---
    const toThank = await TicketModel.findTicketsToThank();
    for (const ticket of toThank) {
      try {
        if (ticket.email) {
          const { subject, body } = buildThankYouMessage(ticket);
          await sendEmail({ to: ticket.email, subject, text: body });
        }
        await TicketModel.markThankYouSent(ticket.id || ticket._id);
        audit(req, 'SEND_THANK_YOU', ticket.pnr,
          `Sent thank-you email to ${ticket.passengerName} · ${ticket.pnr}`);
      } catch (err) {
        console.error('Thank-you email failed:', err);
      }
    }

    // Delete tickets after thank-you has been sent
    const result = await TicketModel.deleteManyTickets({ thankYouSent: { not: false } });

    return res.json({
      success: true,
      markedDepartedCount: newlyDeparted.length,
      thankedCount: toThank.length,
      deletedCount: result?.deletedCount || 0,
    });
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
          const { subject, body } = buildReminderMessage(ticket);
          await sendEmail({ to: ticket.email, subject, text: body });
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
