const express = require('express');
const router = express.Router();
const store = require('../models/store');
const { requireRole } = require('../middleware/auth');

router.get('/', requireRole('provider'), (req, res) => {
  const provider = store.getUserById(req.session.user.id);
  const myRequests = store.getRequestsByProvider(req.session.user.id);
  const pending = store.getPendingRequestsForProvider(req.session.user.id);

  res.render('provider/dashboard', {
    title: 'Zilo — Panel Proveedor',
    user: req.session.user,
    provider,
    services: store.SERVICES,
    myRequests: myRequests.slice(0, 10),
    pendingCount: pending.length,
    formatCLP: store.formatCLP
  });
});

router.post('/toggle-online', requireRole('provider'), (req, res) => {
  const provider = store.getUserById(req.session.user.id);
  const online = req.body.online === 'true' || req.body.online === true;
  store.setProviderOnline(provider.id, online);
  res.json({ success: true, online });
});

router.post('/accept/:requestId', requireRole('provider'), (req, res) => {
  const request = store.assignProvider(req.params.requestId, req.session.user.id);
  if (!request) {
    return res.status(404).json({ error: 'Solicitud no encontrada' });
  }

  const io = req.app.get('io');
  io.emit(`request_update_${request.id}`, {
    request,
    provider: store.getUserById(req.session.user.id)
  });

  res.json({ success: true, request });
});

router.post('/status/:requestId', requireRole('provider'), (req, res) => {
  const { status } = req.body;
  const request = store.updateRequestStatus(req.params.requestId, status);
  if (!request || request.providerId !== req.session.user.id) {
    return res.status(404).json({ error: 'Solicitud no encontrada' });
  }

  const io = req.app.get('io');
  io.emit(`request_update_${request.id}`, { request });

  res.json({ success: true, request });
});

module.exports = router;
