const express = require('express');
const router = express.Router();
const { SUPPORTED, setLocaleCookie } = require('../middleware/i18n');

router.get('/:code', (req, res) => {
  const code = String(req.params.code || '').toLowerCase().slice(0, 2);
  if (!SUPPORTED.includes(code)) {
    return res.redirect(req.query.redirect || '/');
  }

  if (req.session) req.session.locale = code;
  setLocaleCookie(res, code, req);

  let redirect = req.query.redirect || req.get('Referer') || '/';
  if (!redirect.startsWith('/') || redirect.startsWith('//')) redirect = '/';
  res.redirect(redirect);
});

module.exports = router;
