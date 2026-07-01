const express = require('express');
const router = express.Router();
const store = require('../models/store');
const mp = require('../lib/mercadopago');
const { requireRole } = require('../middleware/auth');

function getBaseUrl(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

function notifyProviders(req, request) {
  const io = req.app.get('io');
  const service = store.getServiceById(request.serviceId);
  const client = store.getUserById(request.clientId);
  store.getOnlineProviders(request.serviceId).forEach(provider => {
    const socketId = store.providerSockets.get(provider.id);
    if (socketId) {
      io.to(socketId).emit('new_request', { request, service, client });
    }
  });
}

router.post('/crear', requireRole('client'), async (req, res) => {
  const { requestId } = req.body;
  const request = store.requests.find(r => r.id === requestId);

  if (!request || request.clientId !== req.session.user.id) {
    return res.status(404).json({ error: 'Solicitud no encontrada' });
  }

  const service = store.getServiceById(request.serviceId);
  const baseUrl = getBaseUrl(req);

  if (!mp.isConfigured()) {
    return res.json({
      success: true,
      demo: true,
      checkoutUrl: `${baseUrl}/pagos/demo?ref=${request.id}`
    });
  }

  try {
    const preference = await mp.createPreference({ request, service, baseUrl });
    const checkoutUrl = process.env.MP_SANDBOX === 'true'
      ? preference.sandbox_init_point
      : preference.init_point;

    store.setPaymentPreference(request.id, preference.id);
    res.json({ success: true, demo: false, checkoutUrl, preferenceId: preference.id });
  } catch (err) {
    console.error('Mercado Pago error:', err.message);
    res.status(500).json({ error: 'No se pudo crear el pago. Intenta nuevamente.' });
  }
});

router.get('/demo', requireRole('client'), (req, res) => {
  const request = store.requests.find(r => r.id === req.query.ref);
  if (!request || request.clientId !== req.session.user.id) {
    return res.redirect('/cliente');
  }
  res.render('payments/demo', {
    title: 'Pago — Zilo',
    request,
    service: store.getServiceById(request.serviceId),
    formatCLP: store.formatCLP
  });
});

router.post('/demo/confirmar', requireRole('client'), (req, res) => {
  const request = store.requests.find(r => r.id === req.body.requestId);
  if (!request || request.clientId !== req.session.user.id) {
    return res.status(404).json({ error: 'Solicitud no encontrada' });
  }

  store.markPaymentApproved(request.id, 'demo');
  store.activateRequest(request.id);
  notifyProviders(req, store.requests.find(r => r.id === request.id));

  res.json({ success: true, redirect: `/pagos/exito?ref=${request.id}` });
});

router.get('/exito', requireRole('client'), (req, res) => {
  const request = store.requests.find(r => r.id === req.query.ref);
  if (!request) return res.redirect('/cliente');

  if (req.query.payment_id && request.paymentStatus !== 'approved') {
    store.markPaymentApproved(request.id, req.query.payment_id);
    store.activateRequest(request.id);
    notifyProviders(req, request);
  }

  res.render('payments/success', {
    title: 'Pago exitoso — Zilo',
    request,
    formatCLP: store.formatCLP
  });
});

router.get('/error', requireRole('client'), (req, res) => {
  const request = store.requests.find(r => r.id === req.query.ref);
  res.render('payments/failure', {
    title: 'Pago fallido — Zilo',
    request
  });
});

router.get('/pendiente', requireRole('client'), (req, res) => {
  const request = store.requests.find(r => r.id === req.query.ref);
  res.render('payments/pending', {
    title: 'Pago pendiente — Zilo',
    request
  });
});

router.post('/webhook', async (req, res) => {
  const { type, data } = req.body;

  if (type === 'payment' && data?.id) {
    try {
      const payment = await mp.getPaymentInfo(data.id);
      const ref = payment?.external_reference;
      const request = store.requests.find(r => r.id === ref);

      if (request && payment.status === 'approved') {
        store.markPaymentApproved(request.id, String(data.id));
        store.activateRequest(request.id);
        const io = req.app.get('io');
        const service = store.getServiceById(request.serviceId);
        const client = store.getUserById(request.clientId);
        store.getOnlineProviders(request.serviceId).forEach(provider => {
          const socketId = store.providerSockets.get(provider.id);
          if (socketId) {
            io.to(socketId).emit('new_request', { request, service, client });
          }
        });
      }
    } catch (err) {
      console.error('Webhook error:', err.message);
    }
  }

  res.sendStatus(200);
});

module.exports = router;
