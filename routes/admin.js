const express = require('express');
const router = express.Router();
const store = require('../models/store');
const { requireRole } = require('../middleware/auth');

router.get('/', requireRole('admin'), (req, res) => {
  const allRequests = store.getAllRequests();
  const providers = store.USERS.filter(u => u.role === 'provider');
  const clients = store.USERS.filter(u => u.role === 'client');
  const onlineCount = providers.filter(p => p.online).length;

  const stats = {
    totalRequests: allRequests.length,
    activeRequests: allRequests.filter(r => ['searching', 'assigned', 'in_progress'].includes(r.status)).length,
    completedRequests: allRequests.filter(r => r.status === 'completed').length,
    onlineProviders: onlineCount,
    totalProviders: providers.length,
    totalClients: clients.length,
    activeServices: store.getActiveServices().length,
    totalServices: store.SERVICES.length
  };

  res.render('admin/dashboard', {
    title: 'Zilo — Admin',
    user: req.session.user,
    stats,
    services: store.SERVICES,
    requests: allRequests.slice(0, 20),
    providers,
    formatCLP: store.formatCLP
  });
});

router.post('/toggle-service', requireRole('admin'), (req, res) => {
  const { serviceId, enabled } = req.body;
  const service = store.toggleService(serviceId, enabled === true || enabled === 'true');

  if (!service) {
    return res.status(404).json({ error: 'Servicio no encontrado' });
  }

  const io = req.app.get('io');
  io.emit('services_updated', { services: store.SERVICES });

  res.json({ success: true, service });
});

module.exports = router;
