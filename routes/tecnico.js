const express = require('express');
const router = express.Router();
const store = require('../models/store');
const { requireRole } = require('../middleware/auth');

router.get('/', requireRole('tecnico'), (req, res) => {
  const tecnico = store.getUserById(req.session.user.id);
  const socio = tecnico && tecnico.parentId ? store.getUserById(tecnico.parentId) : null;

  res.render('tecnico/dashboard', {
    title: 'Fundez — Panel Técnico',
    user: req.session.user,
    tecnico,
    socio,
    services: store.SERVICES,
    formatCLP: store.formatCLP
  });
});

module.exports = router;
