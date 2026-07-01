const express = require('express');
const router = express.Router();
const store = require('../models/store');
const { requireRole } = require('../middleware/auth');

router.get('/', requireRole('client'), (req, res) => {
  res.render('client/dashboard', {
    title: 'Zilo — Servicios',
    user: req.session.user,
    services: store.getActiveServices(),
    formatCLP: store.formatCLP,
    activeRequests: store.getRequestsByClient(req.session.user.id).slice(0, 3)
  });
});

router.get('/servicio/:id', requireRole('client'), (req, res) => {
  const service = store.getServiceById(req.params.id);
  if (!service || !service.enabled) {
    return res.status(404).render('error', {
      title: 'No disponible',
      message: 'Este servicio no está disponible en este momento.',
      code: 404
    });
  }

  res.render('client/service', {
    title: `${service.name} — Zilo`,
    user: req.session.user,
    service,
    formatCLP: store.formatCLP,
    tracking: req.query.tracking || null
  });
});

router.post('/solicitar', requireRole('client'), async (req, res) => {
  const { serviceId, address, notes, lat, lng } = req.body;
  const service = store.getServiceById(serviceId);

  if (!service || !service.enabled) {
    return res.status(400).json({ error: 'Servicio no disponible' });
  }

  try {
    const request = await store.createRequest({
      clientId: req.session.user.id,
      serviceId,
      address,
      notes,
      coords: lat && lng ? { lat, lng } : null
    });

    res.json({ success: true, request });
  } catch (err) {
    console.error('Error creando solicitud:', err.message);
    res.status(500).json({ error: 'Error al crear la solicitud' });
  }
});

router.post('/geocode', requireRole('client'), async (req, res) => {
  const { geocodeAddress } = require('../lib/geocode');
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'Dirección requerida' });
  const result = await geocodeAddress(address);
  res.json({ success: true, coords: { lat: result.lat, lng: result.lng }, displayName: result.displayName });
});

router.get('/solicitud/:id', requireRole('client'), (req, res) => {
  const request = store.requests.find(r => r.id === req.params.id);
  if (!request || request.clientId !== req.session.user.id) {
    return res.status(404).json({ error: 'Solicitud no encontrada' });
  }

  let provider = null;
  if (request.providerId) {
    provider = store.getUserById(request.providerId);
  }

  res.json({ request, provider });
});

module.exports = router;
