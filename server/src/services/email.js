import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'send.one.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER || 'eu@seasontravels.com',
    pass: process.env.SMTP_PASS || '',
  },
  connectionTimeout: 10000,
  socketTimeout: 10000,
});

export function buildReminderMessage(ticket) {
  const dep = new Date(ticket.departureTimeUTC);
  const tzLabel = ticket.originalTimezone.split('/').pop()?.replace('_',' ') || '';
  const formatted = dep.toLocaleString('en-GB', { timeZone: ticket.originalTimezone, dateStyle: 'medium', timeStyle: 'short' });
  return {
    subject: `Reminder - Flight ${ticket.pnr} | ${ticket.departureAirport} → ${ticket.arrivalAirport}`,
    body: `Dear ${ticket.passengerName},\n\nThis is a reminder for your upcoming flight.\n\nFlight Details:\nPNR: ${ticket.pnr}\nRoute: ${ticket.departureAirport} → ${ticket.arrivalAirport}\nDeparture: ${formatted} (${tzLabel})\n\nPlease ensure you check in at least 3 hours prior to departure.\n\nWe wish you a safe and pleasant journey!\n\nWarm regards,\nSEASON TRAVELS`,
  };
}

export function buildReminderText(ticket) {
  const { subject, body } = buildReminderMessage(ticket);
  return `${subject}\n\n${body}`;
}

export async function sendEmail({ to, subject, text, html }) {
  try {
    const logoPath = path.join(__dirname, 'logo.png');
    const mailHtml = html || (text ? `
      <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 8px; background-color: #ffffff;">
        <div>${text.replace(/\n/g, '<br />')}</div>
        <br />
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
          <img src="cid:logo" alt="Season Travels" style="width: 200px; height: auto; display: block;" />
        </div>
      </div>
    ` : undefined);

    const attachments = [
      {
        filename: 'logo.png',
        path: logoPath,
        cid: 'logo'
      }
    ];

    const info = await transporter.sendMail({
      from: process.env.SMTP_USER || 'eu@seasontravels.com',
      to,
      subject,
      text,
      html: mailHtml,
      attachments,
    });
    return info;
  } catch (error) {
    console.error('Nodemailer error details:', error);
    throw error;
  }
}
