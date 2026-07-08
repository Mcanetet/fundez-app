const DEFAULT_PRICING = {
  visitPrice: 50000,
  servicePrice: 60000,
  cancellationFee: 35000,
  laborCommissionRate: 0.25,
  materialsCommissionRate: 0.05,
  urgencyTiers: [
    {
      id: 'immediate',
      label: 'Inmediato (1-3 h)',
      description: 'Un técnico puede llegar entre 1 y 3 horas',
      adjustmentPercent: 50,
      enabled: true,
      sortOrder: 1
    },
    {
      id: 'today',
      label: 'Hoy (4-8 h)',
      description: 'Servicio programado para hoy, entre 4 y 8 horas',
      adjustmentPercent: 25,
      enabled: true,
      sortOrder: 2
    },
    {
      id: 'tomorrow',
      label: 'Mañana',
      description: 'Al día siguiente — precio normal',
      adjustmentPercent: 0,
      enabled: true,
      sortOrder: 3
    },
    {
      id: 'two_days',
      label: 'En 2 días',
      description: 'Programado con anticipación — 10% de descuento en la visita',
      adjustmentPercent: -10,
      enabled: true,
      sortOrder: 4
    }
  ]
};

function normalizePricing(raw) {
  const base = { ...DEFAULT_PRICING, ...(raw || {}) };
  base.visitPrice = Math.max(0, parseInt(base.visitPrice, 10) || DEFAULT_PRICING.visitPrice);
  base.servicePrice = Math.max(0, parseInt(base.servicePrice, 10) || DEFAULT_PRICING.servicePrice);
  base.cancellationFee = Math.max(0, parseInt(base.cancellationFee, 10) || DEFAULT_PRICING.cancellationFee);
  base.laborCommissionRate = clampRate(base.laborCommissionRate, DEFAULT_PRICING.laborCommissionRate);
  base.materialsCommissionRate = clampRate(base.materialsCommissionRate, DEFAULT_PRICING.materialsCommissionRate);

  const tiers = Array.isArray(raw?.urgencyTiers) && raw.urgencyTiers.length
    ? raw.urgencyTiers
    : DEFAULT_PRICING.urgencyTiers;

  base.urgencyTiers = tiers.map((t, i) => ({
    id: t.id || `tier-${i}`,
    label: t.label || `Opción ${i + 1}`,
    description: t.description || '',
    adjustmentPercent: parseInt(t.adjustmentPercent, 10) || 0,
    enabled: t.enabled !== false,
    sortOrder: parseInt(t.sortOrder, 10) || i + 1
  })).sort((a, b) => a.sortOrder - b.sortOrder);

  return base;
}

function clampRate(val, fallback) {
  const n = parseFloat(val);
  if (Number.isNaN(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function getActiveUrgencyTiers(pricing) {
  return (pricing.urgencyTiers || []).filter(t => t.enabled !== false).sort((a, b) => a.sortOrder - b.sortOrder);
}

function getUrgencyTier(pricing, tierId) {
  const tiers = getActiveUrgencyTiers(pricing);
  return tiers.find(t => t.id === tierId) || tiers.find(t => t.adjustmentPercent === 0) || tiers[0] || null;
}

function calculateVisitPricing(pricing, tierId) {
  const cfg = normalizePricing(pricing);
  const tier = getUrgencyTier(cfg, tierId);
  if (!tier) return null;

  const baseVisit = cfg.visitPrice;
  const adjustmentAmount = Math.round(baseVisit * tier.adjustmentPercent / 100);
  const visitTotal = Math.max(0, baseVisit + adjustmentAmount);

  return {
    tier,
    baseVisit,
    adjustmentPercent: tier.adjustmentPercent,
    adjustmentAmount,
    visitTotal,
    servicePrice: cfg.servicePrice,
    estimatedTotal: visitTotal + cfg.servicePrice
  };
}

function formatAdjustmentLabel(percent) {
  if (percent > 0) return `+${percent}%`;
  if (percent < 0) return `${percent}%`;
  return 'Precio normal';
}

function computeRequestFinancials(request, pricing) {
  const cfg = normalizePricing(pricing);
  const visitPaid = request.visitPricePaid ?? request.visitTotal ?? request.basePrice ?? cfg.visitPrice;
  let serviceAmount = request.approvedServicePrice ?? request.servicePriceBase ?? cfg.servicePrice;

  const sr = request.siteReport;
  if (sr?.budgetStatus === 'approved' && sr.budgetAmount) {
    serviceAmount = Math.max(serviceAmount, sr.budgetAmount - visitPaid);
  }

  const materialsTotal = (sr?.materials || []).reduce((s, m) => s + (parseInt(m.amount, 10) || 0), 0);
  const laborTotal = visitPaid + serviceAmount;
  const laborCommission = Math.round(laborTotal * cfg.laborCommissionRate);
  const laborProvider = laborTotal - laborCommission;
  const materialsCommission = Math.round(materialsTotal * cfg.materialsCommissionRate);
  const materialsProvider = materialsTotal - materialsCommission;

  return {
    visitPaid,
    serviceAmount,
    materialsTotal,
    laborTotal,
    laborCommission,
    laborProvider,
    materialsCommission,
    materialsProvider,
    appTotal: laborCommission + materialsCommission,
    providerTotal: laborProvider + materialsProvider,
    grandTotal: laborTotal + materialsTotal,
    laborCommissionRate: cfg.laborCommissionRate,
    materialsCommissionRate: cfg.materialsCommissionRate
  };
}

module.exports = {
  DEFAULT_PRICING,
  normalizePricing,
  getActiveUrgencyTiers,
  getUrgencyTier,
  calculateVisitPricing,
  formatAdjustmentLabel,
  computeRequestFinancials
};
