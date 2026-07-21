import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sendEmail, buildReminderText } from '../services/email.js';

const router = Router();

router.post('/send-reminder', requireAuth, async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ error: 'Recipient and subject are required' });
    }

    const info = await sendEmail({ to, subject, text, html });
    return res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('Send email error:', err);
    const message = err?.message || 'Failed to send email';
    return res.status(500).json({ error: message });
  }
});

router.post('/send-custom', requireAuth, async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;
    if (!to || !subject || !text) {
      return res.status(400).json({ error: 'Recipient, subject, and message body are required' });
    }

    const info = await sendEmail({ to, subject, text, html });
    return res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('Send custom email error:', err);
    const message = err?.message || 'Failed to send email';
    return res.status(500).json({ error: message });
  }
});

export default router;
