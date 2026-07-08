const nodemailer = require('nodemailer');

let transporterPromise;

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (!isConfigured()) return null;
  if (!transporterPromise) {
    const port = parseInt(process.env.SMTP_PORT, 10) || 587;
    transporterPromise = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  return transporterPromise;
}

async function sendMail({ to, subject, text, html }) {
  if (!to) return { skipped: true, reason: 'no_recipient' };
  if (!isConfigured()) {
    console.log(`[mail:demo] → ${to}: ${subject}`);
    return { demo: true, to, subject };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: `"Fundez" <${from}>`,
    to,
    subject,
    text,
    html: html || text.replace(/\n/g, '<br>')
  });
  return { messageId: info.messageId, to, subject };
}

module.exports = { isConfigured, sendMail };
