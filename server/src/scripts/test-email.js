import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sendEmail, buildReminderMessage, buildThankYouMessage } from '../services/email.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const dummyTicket = {
    pnr: '111111',
    passengerName: 'Passenger',
    email: 'test@seasontravels.com',
    departureAirport: 'CMB',
    arrivalAirport: 'ARN',
    departureTimeUTC: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    originalTimezone: 'Asia/Colombo',
  };

  const mode = process.argv[2] || 'preview';

  if (mode === 'preview') {
    // Just generate HTML locally — no email send
    console.log('Generating thank-you email HTML preview...');
    const { subject, body } = buildThankYouMessage(dummyTicket);
    // Call sendEmail with a dummy "to" that will fail — but capture the HTML before send
    try {
      const info = await sendEmail({ to: '__preview_only__@invalid.local', subject, text: body });
      if (info && info.html) {
        const outputPath = path.join(__dirname, 'last_sent.html');
        fs.writeFileSync(outputPath, info.html);
        console.log(`✅ Thank-you email HTML written to: ${outputPath}`);
      }
    } catch {
      // Read last_sent.html written inside sendEmail (before the send attempt)
      const lastSent = path.join(__dirname, 'last_sent.html');
      if (fs.existsSync(lastSent)) {
        console.log(`✅ Preview HTML written to: ${lastSent}`);
      } else {
        console.log('Preview written inside sendEmail to last_sent.html');
      }
    }
    return;
  }

  const toEmail = mode;
  console.log(`Building reminder email for PNR ${dummyTicket.pnr}...`);
  const { subject, body } = buildReminderMessage(dummyTicket);

  console.log(`Sending test email to ${toEmail}...`);
  try {
    const info = await sendEmail({ to: toEmail, subject, text: body });
    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);

    if (info && info.html) {
      const outputPath = path.join(__dirname, 'test_output.html');
      fs.writeFileSync(outputPath, info.html);
      console.log(`Generated HTML email written to: ${outputPath}`);
    }
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

main();
