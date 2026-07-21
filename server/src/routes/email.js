import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { sendEmail } from '../services/email.js';

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
    return res.status(500).json({ error: 'Failed to send email' });
  }
});

export default router;
