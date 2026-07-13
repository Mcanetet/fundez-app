const nodemailer = require('nodemailer');
const company = require('../config/company');

let transporterPromise;

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function extractEmail(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/<([^>]+)>/);
  if (match) return match[1].trim();
  return raw;
}

function formatFromAddress() {
  const raw = process.env.SMTP_FROM || process.env.SMTP_USER || company.supportEmail;
  const email = extractEmail(raw);
  if (!email) return `"Fundez" <${company.supportEmail}>`;
  return `"Fundez" <${email}>`;
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

  try {
    const transporter = getTransporter();
    const from = formatFromAddress();
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>')
    });
    console.log(`[mail:sent] → ${to}: ${subject} (${info.messageId || 'ok'})`);
    return { messageId: info.messageId, to, subject };
  } catch (err) {
    console.error(`[mail:error] → ${to}: ${subject}`, err.message);
    return { error: err.message, to, subject };
  }
}

module.exports = { isConfigured, sendMail, formatFromAddress };
