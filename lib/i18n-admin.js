const { createTranslator } = require('./i18n');
const { getNavForAccess: buildNav } = require('./adminPermissions');

function moduleKey(id, field) {
  return `modules.${id}.${field}`;
}

function serviceKey(id, field) {
  return `services.${id}.${field}`;
}

function trOr(t, key, fallback) {
  const v = t(key);
  return !v || v === key ? fallback : v;
}

function localizeModules(modules, t) {
  return modules.map((m) => ({
    ...m,
    name: trOr(t, moduleKey(m.id, 'name'), m.name),
    description: trOr(t, moduleKey(m.id, 'desc'), m.description)
  }));
}

function localizeServices(services, t) {
  return services.map((s) => ({
    ...s,
    name: trOr(t, serviceKey(s.id, 'name'), s.name),
    description: trOr(t, serviceKey(s.id, 'desc'), s.description)
  }));
}

function getNavForLocale(access, t) {
  return buildNav(access, t);
}

function getAdminStrings(t) {
  const panels = {};
  [
    'resumen', 'finanzas', 'documentos', 'contratos', 'notificaciones', 'modulos', 'cobertura',
    'servicios', 'demo', 'pagos', 'proveedores', 'reclamos', 'whatsapp', 'aland',
    'mensajes', 'datos', 'backups', 'equipo', 'seguridad'
  ].forEach((id) => {
    panels[id] = t(`admin.panels.${id}`);
  });

  return {
    panels,
    profiles: {
      superadmin: t('admin.profiles.superadmin'),
      custom: t('admin.profiles.custom')
    },
    status: {
      on: t('admin.status.on'),
      off: t('admin.status.off'),
      active: t('admin.status.active'),
      inactive: t('admin.status.inactive')
    },
    resumen: {
      revenue: t('admin.resumen.revenue'),
      commission: t('admin.resumen.commission'),
      providerDebt: t('admin.resumen.provider_debt'),
      openComplaints: t('admin.resumen.open_complaints'),
      active: t('admin.resumen.active'),
      waChats: t('admin.resumen.wa_chats'),
      consent: t('admin.resumen.consent'),
      configLegal: t('admin.resumen.config_legal'),
      pricing: t('admin.prices'),
      financeCenter: t('admin.resumen.finance_center'),
      privacy: t('footer.privacy'),
      terms: t('footer.terms'),
      cookies: t('footer.cookies')
    },
    modulos: {
      title: t('admin.modulos.title'),
      activeCount: t('admin.modulos.active_count'),
      hint: t('admin.modulos.hint'),
      client: t('admin.modulos.client'),
      provider: t('admin.modulos.provider')
    },
    cobertura: {
      title: t('admin.cobertura.title'),
      activeCount: t('admin.cobertura.active_count'),
      hint: t('admin.cobertura.hint'),
      communesHint: t('admin.cobertura.communes_hint'),
      enableAll: t('admin.cobertura.enable_all'),
      disableAll: t('admin.cobertura.disable_all')
    },
    servicios: {
      title: t('admin.servicios.title'),
      activeCount: t('admin.servicios.active_count'),
      visit: t('admin.servicios.visit')
    },
    js: {
      newAdmin: t('admin.js.new_admin'),
      editAdmin: t('admin.js.edit_admin'),
      createAdmin: t('admin.js.create_admin'),
      saveChanges: t('admin.js.save_changes'),
      passwordHint: t('admin.js.password_hint'),
      generating: t('admin.js.generating'),
      generateBackup: t('admin.js.generate_backup'),
      uploading: t('admin.js.uploading'),
      addHistory: t('admin.js.add_history'),
      restoring: t('admin.js.restoring'),
      importRestore: t('admin.js.import_restore'),
      restore: t('admin.js.restore'),
      noKb: t('admin.js.no_kb'),
      noConversations: t('admin.js.no_conversations'),
      alandError: t('admin.js.aland_error'),
      alandReady: t('admin.js.aland_ready'),
      alandMissing: t('admin.js.aland_missing')
    }
  };
}

function getAdminClientBundle(locale) {
  const t = createTranslator(locale);
  return getAdminStrings(t);
}

module.exports = {
  localizeModules,
  localizeServices,
  getNavForLocale,
  getAdminStrings,
  getAdminClientBundle
};
