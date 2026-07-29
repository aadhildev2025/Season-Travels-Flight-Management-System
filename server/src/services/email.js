import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'send.one.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER || 'eu@seasontravels.com',
    pass: process.env.SMTP_PASS || 'Nord@scandic',
  },
  connectionTimeout: 10000,
  socketTimeout: 15000,
  greetingTimeout: 10000,
  tls: {
    rejectUnauthorized: false,
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 10,
});

export function buildReminderMessage(ticket) {
  const dep = new Date(ticket.departureTimeUTC);
  const tzLabel = ticket.originalTimezone.split('/').pop()?.replace('_',' ') || '';
  const formatted = dep.toLocaleString('en-GB', { timeZone: ticket.originalTimezone, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  return {
    subject: 'Travel Reminder from SeasonTravels',
    body: `Dear Passenger,\n\nThis is a reminder for your upcoming flight.\n\nFlight Details:\nBooking Reference: ${ticket.pnr}\nRoute: ${ticket.departureAirport} → ${ticket.arrivalAirport}\nDeparture: ${formatted} (${tzLabel})\n\nPlease ensure you check in at least 4 hours prior to departure.\n\nWe wish you a safe and pleasant journey!\n\nWarm regards,\nSEASON TRAVELS`,
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
  const timeoutMs = 20000;
  const withTimeout = (promise) => Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Email send timed out')), timeoutMs))
  ]);

  try {
    const plainBody = text || (html ? html.replace(/<br\s*\/>/g, '\n').replace(/<[^>]+>/g, '') : '');

    const logoDir = path.resolve(__dirname, '../../../client/src/logo');
    const logoFooterPath = path.join(logoDir, 'footer.png');
    const logoIataPath = path.join(logoDir, 'IATA.jpg');

    const hasLogoFooter = fs.existsSync(logoFooterPath);
    const hasLogoIata = fs.existsSync(logoIataPath);

    const attachments = [];

    if (hasLogoFooter) {
      attachments.push({
        content: fs.readFileSync(logoFooterPath),
        cid: 'logo_footer',
        contentType: 'image/png',
        contentDisposition: 'inline'
      });
    }
    if (hasLogoIata) {
      attachments.push({
        content: fs.readFileSync(logoIataPath),
        cid: 'logo_iata',
        contentType: 'image/jpeg',
        contentDisposition: 'inline'
      });
    }

    const mailHtml = html || (plainBody ? (() => {
      const normalizedBody = plainBody.replace(/\r\n/g, '\n');
      const blocks = normalizedBody.split(/\n\s*\n/);
      const htmlBlocks = [];

      for (const block of blocks) {
        const trimmedBlock = block.trim();
        if (!trimmedBlock) continue;

        if (trimmedBlock.startsWith('Flight Details:') || trimmedBlock.startsWith('Flight Summary:')) {
          const lines = trimmedBlock.split('\n');
          const header = lines[0].trim();
          const detailsHtml = lines.slice(1).map(line => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return '';
            return `<div style="color: #dc2626; margin-bottom: 4px; font-weight: bold;">${trimmedLine}</div>`;
          }).filter(Boolean).join('');

          htmlBlocks.push(`
            <div style="margin-bottom: 20px;">
              <div style="font-weight: bold; color: #1f2937; margin-bottom: 8px;">${header}</div>
              ${detailsHtml}
            </div>
          `);
        } else if (trimmedBlock.startsWith('Warm regards,')) {
          const lines = trimmedBlock.split('\n');
          const formattedLines = lines.map(line => line.trim()).join('<br />');
          htmlBlocks.push(`
            <div style="margin-top: 25px; color: #374151; line-height: 1.5;">
              ${formattedLines}
            </div>
          `);
        } else {
          const lines = trimmedBlock.split('\n');
          const formattedLines = lines.map(line => line.trim()).join('<br />');
          htmlBlocks.push(`
            <div style="margin-bottom: 15px; color: #374151;">
              ${formattedLines}
            </div>
          `);
        }
      }
      const formattedBody = htmlBlocks.join('');

      return `
        <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #f0f0f0; border-radius: 8px; background-color: #ffffff; box-sizing: border-box;">
          
          <div style="margin-top: 15px;">
            ${formattedBody}
          </div>

          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 35px; border-top: 1px solid #eee; padding-top: 20px;">
            <tr>
              <td align="left" valign="middle">
                <div style="display: inline-block; text-align: center;">
                  ${hasLogoFooter ? `<img src="cid:logo_footer" alt="Season Travels" style="height: 48px; width: auto; display: block; border: 0; margin: 0 auto;" />` : ''}
                  <div style="margin-top: 6px; font-size: 12px; color: #333; text-align: center;">
                    <a href="https://www.seasontravels.com" target="_blank" style="text-decoration: none; color: #333;">www.seasontravels.com</a>
                  </div>
                </div>
              </td>
              <td align="right" valign="middle">
                ${hasLogoIata ? `<img src="cid:logo_iata" alt="IATA" style="height: 38px; width: auto; display: block; border: 0;" />` : ''}
              </td>
            </tr>
          </table>
        </div>
      `;
    })() : undefined);

    if (mailHtml) {
      try {
        const lastSentPath = path.join(__dirname, '../scripts/last_sent.html');
        fs.writeFileSync(lastSentPath, mailHtml);
      } catch (e) {
        // ignore errors writing last_sent.html
      }
    }

    const info = await withTimeout(transporter.sendMail({
      from: process.env.SMTP_USER || 'eu@seasontravels.com',
      to,
      subject,
      text: plainBody,
      html: mailHtml,
      attachments: attachments.length > 0 ? attachments : undefined,
    }));
    
    // Attach generated HTML to info for test scripts verification
    if (info) {
      info.html = mailHtml;
    }
    
    return info;
  } catch (error) {
    console.error('Nodemailer error details:', error);
    throw error;
  }
}
