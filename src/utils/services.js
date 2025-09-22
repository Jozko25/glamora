const config = require('../../config');

function normalizeServiceName(name) {
  if (!name) return '';
  const lower = name.toString().trim().toLowerCase();
  return lower
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

function buildDurationIndex() {
  const index = new Map();
  const groups = config.services || {};
  for (const group of Object.values(groups)) {
    for (const [label, def] of Object.entries(group)) {
      const key = normalizeServiceName(label);
      index.set(key, def.duration);
    }
  }
  return index;
}

const durationIndex = buildDurationIndex();

function getServiceDurationMinutes(name, fallback = 60) {
  const key = normalizeServiceName(name);
  return durationIndex.get(key) || fallback;
}

module.exports = {
  normalizeServiceName,
  getServiceDurationMinutes
};


