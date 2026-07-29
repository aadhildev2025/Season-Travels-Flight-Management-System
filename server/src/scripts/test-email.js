import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { sendEmail, buildReminderMessage } from '../services/email.js';

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

  const toEmail = process.argv[2] || 'test@example.com';
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
