const express = require('express');
const router = express.Router();
const store = require('../models/store');

router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect(getDashboardPath(req.session.user.role));
  }
  res.render('login', { title: 'Iniciar sesión', error: null });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = store.getUserByEmail(email);

  if (!user || user.password !== password) {
    return res.render('login', {
      title: 'Iniciar sesión',
      error: 'Credenciales incorrectas. Intenta nuevamente.'
    });
  }

  req.session.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };

  res.redirect(getDashboardPath(user.role));
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

function getDashboardPath(role) {
  const paths = {
    client: '/cliente',
    provider: '/proveedor',
    admin: '/admin'
  };
  return paths[role] || '/';
}

module.exports = router;
