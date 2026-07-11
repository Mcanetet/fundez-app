const {
  getCommuneKey,
  extractCommuneFromAddress,
  extractCommuneFromNominatim
} = require('./chile-geo');

function resolveCommuneFromGeo({ address, displayName, nominatimAddress }) {
  const fromNominatim = extractCommuneFromNominatim(nominatimAddress);
  if (fromNominatim) return fromNominatim;

  const fromDisplay = extractCommuneFromAddress(displayName);
  if (fromDisplay) return fromDisplay;

  return extractCommuneFromAddress(address);
}

function isCommuneOperational(row) {
  if (!row) return false;
  return Boolean(row.regionEnabled && row.enabled);
}

function buildCoverageResult(commune, coverageMap) {
  if (!commune) {
    return {
      covered: false,
      unknown: true,
      regionCode: null,
      regionName: null,
      communeCode: null,
      communeName: null,
      regionEnabled: false,
      communeEnabled: false,
      messageKey: 'coverage.unknown_commune'
    };
  }

  const key = getCommuneKey(commune.regionCode, commune.code);
  const row = coverageMap.get(key);
  const regionEnabled = row ? Boolean(row.regionEnabled) : false;
  const communeEnabled = row ? Boolean(row.enabled) : false;
  const covered = isCommuneOperational(row);

  let messageKey = null;
  if (!covered) {
    if (!regionEnabled) messageKey = 'coverage.region_disabled';
    else if (!communeEnabled) messageKey = 'coverage.not_available';
    else messageKey = 'coverage.not_available';
  }

  return {
    covered,
    unknown: false,
    regionCode: commune.regionCode,
    regionName: commune.regionName,
    communeCode: commune.code,
    communeName: commune.name,
    regionEnabled,
    communeEnabled,
    messageKey
  };
}

function checkAddressCoverage({ address, displayName, nominatimAddress }, coverageMap) {
  const commune = resolveCommuneFromGeo({ address, displayName, nominatimAddress });
  return buildCoverageResult(commune, coverageMap);
}

function groupCoverageForAdmin(regions, communes) {
  const regionState = new Map(regions.map((r) => [r.regionCode, r]));
  const byRegion = new Map();

  for (const row of communes) {
    if (!byRegion.has(row.regionCode)) {
      const regionMeta = regionState.get(row.regionCode);
      byRegion.set(row.regionCode, {
        code: row.regionCode,
        name: row.regionName,
        enabled: regionMeta ? Boolean(regionMeta.enabled) : false,
        communes: [],
        enabledCount: 0,
        total: 0
      });
    }
    const region = byRegion.get(row.regionCode);
    const operational = region.enabled && row.enabled;
    region.communes.push({
      ...row,
      operational
    });
    region.total += 1;
    if (operational) region.enabledCount += 1;
  }

  for (const [code, regionMeta] of regionState.entries()) {
    if (!byRegion.has(code)) {
      byRegion.set(code, {
        code,
        name: regionMeta.regionName,
        enabled: Boolean(regionMeta.enabled),
        communes: [],
        enabledCount: 0,
        total: 0
      });
    } else {
      byRegion.get(code).enabled = Boolean(regionMeta.enabled);
    }
  }

  return [...byRegion.values()]
    .map((region) => {
      region.enabledCount = region.communes.filter((c) => region.enabled && c.enabled).length;
      return region;
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

function formatCoverageMessage(coverage) {
  if (coverage.unknown) {
    return 'No pudimos confirmar tu comuna. Incluye comuna en la dirección (ej: Av. Providencia 1234, Providencia).';
  }
  if (!coverage.regionEnabled) {
    return `Aún no operamos en ${coverage.regionName || 'esta región'}. Estamos trabajando para llegar a tu zona.`;
  }
  return `Estamos trabajando para llegar a ${coverage.communeName || 'tu comuna'}. Por ahora operamos en Providencia, Las Condes y Ñuñoa.`;
}

module.exports = {
  resolveCommuneFromGeo,
  isCommuneOperational,
  buildCoverageResult,
  checkAddressCoverage,
  groupCoverageForAdmin,
  formatCoverageMessage
};
