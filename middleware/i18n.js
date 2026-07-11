const {
  resolveLocale,
  createTranslator,
  setLocaleCookie,
  getClientBundle,
  SUPPORTED,
  LOCALES
} = require('../lib/i18n');

function i18nMiddleware(req, res, next) {
  const locale = resolveLocale(req);
  if (req.session) req.session.locale = locale;

  const t = createTranslator(locale);
  req.locale = locale;
  req.t = t;

  res.locals.locale = locale;
  res.locals.lang = locale;
  res.locals.t = t;
  res.locals.locales = LOCALES;
  res.locals.clientI18n = getClientBundle(locale);

  next();
}

module.exports = { i18nMiddleware, setLocaleCookie, SUPPORTED, LOCALES };
