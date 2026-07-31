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
  return {
    subject: 'Thank You for Choosing Season Travels',
    body: `Dear Passenger,\n\nThank you for contacting Season Travels.\n\nWe look forward to plan your next adventure and help you to create unforgetable travel experiences.\n\nWarm regards,\nSEASON TRAVELS`,
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
    
    // Header Left Logo
    const logoHeaderPath = path.join(logoDir, 'logo.png');
    
    // Header Right Logo (IATA)
    let logoIataPath = path.join(logoDir, 'IATA.png');
    if (!fs.existsSync(logoIataPath)) {
      logoIataPath = path.join(logoDir, 'IATA.jpg');
    }
    
    // Footer Logo
    let logoFooterPath = path.join(logoDir, 'Mail Footer.png');
    if (!fs.existsSync(logoFooterPath)) {
      logoFooterPath = path.join(logoDir, 'Mail footer.png');
    }

    const hasLogoHeader = fs.existsSync(logoHeaderPath);
    const hasLogoIata = fs.existsSync(logoIataPath);
    const hasLogoFooter = fs.existsSync(logoFooterPath);

    const attachments = [];

    if (hasLogoHeader) {
      attachments.push({
        content: fs.readFileSync(logoHeaderPath),
        cid: 'logo_header',
        contentType: 'image/png',
        contentDisposition: 'inline'
      });
    }
    if (hasLogoIata) {
      const isPng = logoIataPath.toLowerCase().endsWith('.png');
      attachments.push({
        content: fs.readFileSync(logoIataPath),
        cid: 'logo_iata',
        contentType: isPng ? 'image/png' : 'image/jpeg',
        contentDisposition: 'inline'
      });
    }
    if (hasLogoFooter) {
      attachments.push({
        content: fs.readFileSync(logoFooterPath),
        cid: 'logo_footer',
        contentType: 'image/png',
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

      return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Season Travels</title>
<style>
  /* ── Reset ── */
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { border: 0; display: block; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }

  /* ── Mobile overrides ── */
  @media only screen and (max-width: 620px) {
    .email-wrapper { padding: 12px !important; }
    .email-card   { padding: 18px !important; border-radius: 6px !important; }
    .logo-header  { height: 22px !important; }
    .logo-iata    { height: 18px !important; }
    .logo-footer  { max-width: 100% !important; height: auto !important; }
    .body-text    { font-size: 13px !important; }
    .detail-line  { font-size: 13px !important; }
    .footer-link  { font-size: 11px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background:#f4f4f7;">

<!-- Outer wrapper -->
<table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f4f7;">
  <tr>
    <td align="center" class="email-wrapper" style="padding: 28px 16px;">

      <!-- Card -->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px; background:#ffffff; border-radius:10px; border:1px solid #e8e8ee; box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td class="email-card" style="padding: 28px 30px; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.65; color: #333; box-sizing: border-box;">

            <!-- Header row: brand logo left, IATA right -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:22px; border-bottom:1px solid #eee; padding-bottom:16px;">
              <tr>
                <td align="left" valign="middle" style="padding-bottom:0;">
                  ${hasLogoHeader ? `<img src="cid:logo_header" alt="Season Travels" class="logo-header" style="height:28px; width:auto;" />` : '<span style="font-size:16px;font-weight:bold;color:#111;">Season Travels</span>'}
                </td>
                <td align="right" valign="middle" style="padding-bottom:0;">
                  ${hasLogoIata ? `<img src="cid:logo_iata" alt="IATA" class="logo-iata" style="height:24px; width:auto;" />` : ''}
                </td>
              </tr>
            </table>

            <!-- Body content -->
            <div style="margin-top:8px;" class="body-text">
              ${formattedBody}
            </div>

            <!-- Footer: footer banner + website link -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:32px; border-top:1px solid #eee; padding-top:20px;">
              <tr>
                <td align="center" valign="middle">
                  ${hasLogoFooter ? `<img src="cid:logo_footer" alt="Season Travels" class="logo-footer" style="max-width:100%; height:auto; display:block; margin:0 auto;" />` : ''}
                  <div class="footer-link" style="margin-top:10px; font-size:12px; color:#555; text-align:center;">
                    <a href="https://www.seasontravels.com" target="_blank" style="text-decoration:none; color:#555;">www.seasontravels.com</a>
                  </div>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table><!-- /card -->

    </td>
  </tr>
</table><!-- /outer wrapper -->

</body>
</html>`;
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
