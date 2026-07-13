const regions = require('./data/chile-regions.json');

const DEFAULT_ENABLED_KEYS = new Set([
  'region-metropolitana:providencia',
  'region-metropolitana:las-condes',
  'region-metropolitana:nunoa'
]);

const DEFAULT_ENABLED_REGION_CODES = new Set(['region-metropolitana']);

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function slugify(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const communeIndex = new Map();
const communeByName = new Map();
const regionByCode = new Map();

for (const region of regions) {
  regionByCode.set(region.code, region);
  for (const commune of region.comunas) {
    const key = `${region.code}:${commune.code}`;
    communeIndex.set(key, { ...commune, regionCode: region.code, regionName: region.name });
    communeByName.set(normalizeText(commune.name), { ...commune, regionCode: region.code, regionName: region.name });
  }
}

function getRegionsCatalog() {
  return regions;
}

function getRegionCommunes(regionCode) {
  const region = regionByCode.get(regionCode);
  if (!region) return [];
  return region.comunas
    .map((commune) => ({
      code: commune.code,
      name: commune.name,
      regionCode: region.code,
      regionName: region.name
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

function getCommuneKey(regionCode, communeCode) {
  return `${regionCode}:${communeCode}`;
}

function getCommune(regionCode, communeCode) {
  return communeIndex.get(getCommuneKey(regionCode, communeCode)) || null;
}

function isDefaultEnabled(regionCode, communeCode) {
  return DEFAULT_ENABLED_KEYS.has(getCommuneKey(regionCode, communeCode));
}

function flattenCatalog(defaultEnabled = false) {
  const rows = [];
  for (const region of regions) {
    for (const commune of region.comunas) {
      rows.push({
        regionCode: region.code,
        regionName: region.name,
        communeCode: commune.code,
        communeName: commune.name,
        enabled: defaultEnabled ? true : isDefaultEnabled(region.code, commune.code)
      });
    }
  }
  return rows;
}

function flattenRegionsCatalog() {
  return regions.map((region) => ({
    regionCode: region.code,
    regionName: region.name,
    enabled: DEFAULT_ENABLED_REGION_CODES.has(region.code)
  }));
}

function findCommuneByName(name) {
  const normalized = normalizeText(name);
  if (!normalized) return null;
  if (communeByName.has(normalized)) return communeByName.get(normalized);

  for (const [key, commune] of communeByName.entries()) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return commune;
    }
  }
  return null;
}

function extractCommuneFromAddress(address) {
  const text = String(address || '');
  if (!text.trim()) return null;

  const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i--) {
    const match = findCommuneByName(parts[i]);
    if (match) return match;
  }

  for (const part of parts) {
    const match = findCommuneByName(part);
    if (match) return match;
  }

  const whole = findCommuneByName(text);
  return whole;
}

function extractCommuneFromNominatim(addressObj) {
  if (!addressObj || typeof addressObj !== 'object') return null;

  const candidates = [
    addressObj.suburb,
    addressObj.city_district,
    addressObj.town,
    addressObj.city,
    addressObj.municipality,
    addressObj.village,
    addressObj.county
  ].filter(Boolean);

  for (const candidate of candidates) {
    const match = findCommuneByName(candidate);
    if (match) return match;
  }
  return null;
}

function extractRegionFromNominatim(addressObj) {
  if (!addressObj?.state) return null;
  const state = normalizeText(addressObj.state);
  for (const region of regions) {
    const regionNorm = normalizeText(region.name);
    if (state.includes(normalizeText(region.name.replace(/^Región (de |del )?/i, ''))) ||
        regionNorm.includes(state) ||
        state.includes(region.code.replace(/-/g, ' '))) {
      return region;
    }
  }
  if (state.includes('metropolitana')) {
    return regionByCode.get('region-metropolitana') || null;
  }
  return null;
}

module.exports = {
  DEFAULT_ENABLED_KEYS,
  DEFAULT_ENABLED_REGION_CODES,
  getRegionsCatalog,
  getRegionCommunes,
  getCommuneKey,
  getCommune,
  isDefaultEnabled,
  flattenCatalog,
  flattenRegionsCatalog,
  findCommuneByName,
  extractCommuneFromAddress,
  extractCommuneFromNominatim,
  extractRegionFromNominatim,
  normalizeText,
  slugify
};
