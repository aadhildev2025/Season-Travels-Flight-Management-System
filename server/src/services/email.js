import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGO_PATH = path.join(__dirname, '../../client/src/logo/1.png');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'send.one.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER || 'eu@seasontravels.com',
    pass: process.env.SMTP_PASS || 'Nord@scandic',
  },
  connectionTimeout: 30000,
  socketTimeout: 60000,
});

export function buildReminderMessage(ticket) {
  const dep = new Date(ticket.departureTimeUTC);
  const tzLabel = ticket.originalTimezone.split('/').pop()?.replace('_',' ') || '';
  const formatted = dep.toLocaleString('en-GB', { timeZone: ticket.originalTimezone, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  return {
    subject: 'Travel Reminder from SeasonTravels',
    body: `Dear Passenger,\n\nThis is a reminder for your upcoming flight.\n\nFlight Details:\nBooking Reference: ${ticket.pnr}\nRoute: ${ticket.departureAirport} → ${ticket.arrivalAirport}\nDeparture: ${formatted} (${tzLabel})\n\nPlease ensure you check in at least 3 hours prior to departure.\n\nWe wish you a safe and pleasant journey!\n\nWarm regards,\nSEASON TRAVELS`,
  };
}

export function buildReminderText(ticket) {
  const { subject, body } = buildReminderMessage(ticket);
  return `${subject}\n\n${body}`;
}

export function buildThankYouMessage(ticket) {
  const dep = new Date(ticket.departureTimeUTC);
  const tzLabel = ticket.originalTimezone.split('/').pop()?.replace('_',' ') || '';
  const formatted = dep.toLocaleString('en-GB', { timeZone: ticket.originalTimezone, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  return {
    subject: 'Thank You for Flying with SeasonTravels',
    body: `Dear Passenger,\n\nThank you for choosing SeasonTravels. It was a pleasure having you on board.\n\nFlight Summary:\nBooking Reference: ${ticket.pnr}\nRoute: ${ticket.departureAirport} → ${ticket.arrivalAirport}\nDeparture: ${formatted} (${tzLabel})\n\nWe would love to serve you again. Safe travels!\n\nWarm regards,\nSEASON TRAVELS`,
  };
}

export function buildThankYouText(ticket) {
  const { subject, body } = buildThankYouMessage(ticket);
  return `${subject}\n\n${body}`;
}

export async function sendEmail({ to, subject, text, html }) {
  try {
    const plainBody = text || (html ? html.replace(/<br\s*\/>/g, '\n').replace(/<[^>]+>/g, '') : '');

    const mailHtml = html || (plainBody ? `
      <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 8px; background-color: #ffffff;">
        <div style="font-weight: bold;">${plainBody.replace(/\n/g, '<br />')}</div>
        <br />
        <div style="border-top: 2px solid #eee; padding-top: 20px; margin-top: 20px; text-align: center;">
          <a href="https://www.seasontravels.com" target="_blank" style="text-decoration: none;">
            <img src="cid:mail-footer" alt="Season Travels" style="width: 100%; max-width: 600px; height: auto; display: block;" />
          </a>
        </div>
      </div>
    ` : undefined);

    const info = await transporter.sendMail({
      from: process.env.SMTP_USER || 'eu@seasontravels.com',
      to,
      subject,
      text: plainBody,
      html: mailHtml,
      attachments: [
        {
          filename: 'logo.png',
          path: LOGO_PATH,
          cid: 'mail-footer',
          contentDisposition: 'inline'
        }
      ]
    });
    return info;
  } catch (error) {
    console.error('Nodemailer error details:', error);
    throw error;
  }
}
