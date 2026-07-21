import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'send.one.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER || 'eu@seasontravels.com',
    pass: process.env.SMTP_PASS || '',
  },
});

export async function sendEmail({ to, subject, text, html }) {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_USER || 'eu@seasontravels.com',
      to,
      subject,
      text,
      html,
    });
    return info;
  } catch (error) {
    console.error('Nodemailer error details:', error);
    throw error;
  }
}
