const { v4: uuidv4 } = require('uuid');
const mailer = require('./mailer');
const company = require('../config/company');

const repository = require('../models/repository');

let notifications = [];

function bindStore(store) {
  if (store.notifications) notifications = store.notifications;
}

function isEnabled() {
  return process.env.NOTIFICATIONS_ENABLED !== 'false';
}

function formatCLP(amount) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount || 0);
}

function trackUrl(request) {
  return `${company.appUrl}/seguimiento/${request.guardianToken}`;
}

function whatsappUrl(phone, message) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 9) return null;
  const num = digits.startsWith('56') ? digits : `56${digits.replace(/^0/, '')}`;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

const TEMPLATES = {
  'payment.approved': (ctx) => ({
    subject: `Pago confirmado — ${ctx.request.serviceName}`,
    text: `Hola ${ctx.client.name},\n\nTu pago de ${formatCLP(ctx.amount)} por la visita técnica de ${ctx.request.serviceName} fue confirmado.\n\nDirección: ${ctx.request.address}\nSeguimiento: ${trackUrl(ctx.request)}\n\nGracias por confiar en Fundez.`
  }),
  'payment.transfer_pending': (ctx) => ({
    subject: `Transferencia pendiente — ${ctx.request.serviceName}`,
    text: `Hola ${ctx.client.name},\n\nRegistramos tu solicitud de transferencia por ${formatCLP(ctx.amount)}.\nReferencia: FUNDEZ-${ctx.request.id.slice(0, 8).toUpperCase()}\n\nCuando confirmemos el abono, activaremos la búsqueda de técnico.`
  }),
  'service.searching': (ctx) => ({
    subject: `Nueva solicitud — ${ctx.request.serviceName}`,
    text: `Hola ${ctx.provider.name},\n\nHay una nueva solicitud de ${ctx.request.serviceName} en ${ctx.request.address}.\nMonto visita: ${formatCLP(ctx.amount)}.\n\nIngresa a tu panel Fundez para aceptarla.`
  }),
  'service.assigned': (ctx) => ({
    subject: `Socio asignado — ${ctx.request.serviceName}`,
    text: `Hola ${ctx.client.name},\n\n${ctx.provider.name} fue asignado a tu servicio de ${ctx.request.serviceName}.\n\nSeguimiento en vivo: ${trackUrl(ctx.request)}`
  }),
  'technician.assigned': (ctx) => ({
    subject: `Técnico asignado — ${ctx.request.serviceName}`,
    text: `Hola ${ctx.client.name},\n\nEl técnico ${ctx.request.technicianName} fue asignado a tu visita.\nTeléfono: ${ctx.request.technicianPhone || 'disponible en la app'}\n\nSeguimiento: ${trackUrl(ctx.request)}`
  }),
  'technician.en_route': (ctx) => ({
    subject: `Tu técnico va en camino`,
    text: `Hola ${ctx.client.name},\n\n${ctx.request.technicianName || 'Tu técnico'} está en camino a ${ctx.request.address}.\n\nSigue el servicio: ${trackUrl(ctx.request)}`
  }),
  'technician.arrived': (ctx) => ({
    subject: `Técnico en tu domicilio`,
    text: `Hola ${ctx.client.name},\n\n${ctx.request.technicianName || 'El técnico'} llegó a tu domicilio para el servicio de ${ctx.request.serviceName}.`
  }),
  'budget.sent': (ctx) => ({
    subject: `Presupuesto pendiente — ${ctx.request.serviceName}`,
    text: `Hola ${ctx.client.name},\n\nEl técnico envió un presupuesto de ${formatCLP(ctx.amount)} para tu servicio.\n\nIngresa a Fundez para aprobar o rechazar: ${trackUrl(ctx.request)}`
  }),
  'service.completed': (ctx) => ({
    subject: `Servicio completado — ${ctx.request.serviceName}`,
    text: `Hola ${ctx.client.name},\n\nTu servicio de ${ctx.request.serviceName} fue completado.\n\nGracias por usar Fundez.`
  }),
  'dte.issued': (ctx) => ({
    subject: `Tu ${ctx.docKind} electrónica está lista`,
    text: `Hola ${ctx.client.name},\n\nEmitimos tu ${ctx.docKind} N° ${ctx.folio} por ${formatCLP(ctx.amount)}.\n\nDescárgala aquí: ${company.appUrl}${ctx.pdfUrl}\n\nSolicitud: ${ctx.request.id}`
  })
};

function persistNotification(record) {
  notifications.unshift(record);
  if (notifications.length > 500) notifications.pop();
  repository.persist(() => repository.saveNotification(record), `notif ${record.id}`);
}

async function deliverEmail({ to, subject, text, meta }) {
  try {
    const result = await mailer.sendMail({ to, subject, text });
    return { status: result.skipped ? 'skipped' : (result.demo ? 'sent' : 'sent'), error: null, demo: result.demo };
  } catch (err) {
    return { status: 'failed', error: err.message };
  }
}

async function notify({ event, to, phone, subject, text, requestId, userId, meta = {} }) {
  if (!isEnabled()) return null;

  const record = {
    id: `ntf-${uuidv4().slice(0, 12)}`,
    event,
    channel: 'email',
    status: 'queued',
    recipient: to || null,
    subject,
    body: text,
    meta,
    requestId: requestId || null,
    userId: userId || null,
    error: null,
    createdAt: new Date().toISOString()
  };

  if (to) {
    const emailResult = await deliverEmail({ to, subject, text, meta });
    record.status = emailResult.status;
    record.error = emailResult.error;
    if (emailResult.demo) record.meta = { ...meta, demoMail: true };
  } else {
    record.status = 'skipped';
    record.error = 'sin email';
  }

  persistNotification(record);

  if (phone) {
    const wa = whatsappUrl(phone, text);
    if (wa) {
      persistNotification({
        id: `ntf-${uuidv4().slice(0, 12)}`,
        event,
        channel: 'whatsapp',
        status: 'queued',
        recipient: phone,
        subject: null,
        body: text,
        meta: { ...meta, whatsappUrl: wa },
        requestId: requestId || null,
        userId: userId || null,
        error: null,
        createdAt: new Date().toISOString()
      });
    }
  }

  return record;
}

async function sendEvent(event, ctx) {
  const tpl = TEMPLATES[event];
  if (!tpl) return null;
  const { subject, text } = tpl(ctx);
  const client = ctx.client;
  return notify({
    event,
    to: client?.email || ctx.to,
    phone: client?.phone || ctx.phone,
    subject,
    text,
    requestId: ctx.request?.id,
    userId: client?.id,
    meta: ctx.meta || {}
  });
}

function getRecent(limit = 50) {
  return notifications.slice(0, limit);
}

function getStats() {
  const recent = notifications.slice(0, 200);
  return {
    total: notifications.length,
    sent: recent.filter((n) => n.status === 'sent').length,
    failed: recent.filter((n) => n.status === 'failed').length,
    emailConfigured: mailer.isConfigured()
  };
}

module.exports = {
  bindStore,
  notify,
  sendEvent,
  getRecent,
  getStats,
  whatsappUrl,
  isEnabled
};
