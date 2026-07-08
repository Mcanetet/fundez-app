const mock = require('./mock');
const libredte = require('./libredte');

function getProvider() {
  const name = (process.env.DTE_PROVIDER || 'mock').toLowerCase();
  if (name === 'libredte' && libredte.isConfigured()) return { name: 'libredte', emit: libredte.emit };
  return { name: 'mock', emit: mock.emit };
}

function isConfigured() {
  const p = getProvider();
  return p.name === 'libredte' ? libredte.isConfigured() : true;
}

function getProviderStatus() {
  const configured = process.env.DTE_PROVIDER === 'libredte' && libredte.isConfigured();
  return {
    provider: process.env.DTE_PROVIDER || 'mock',
    configured,
    libredte: libredte.isConfigured(),
    mode: configured ? 'production' : 'demo'
  };
}

async function issueDocument({ request, billing, amount, phase, description }) {
  if (!billing || !amount || amount <= 0) {
    return { error: 'Datos insuficientes para emitir documento tributario' };
  }

  const provider = getProvider();
  try {
    const result = await provider.emit({ request, billing, amount, phase, description });
    if (result.error) return result;
    return { success: true, document: result, provider: provider.name };
  } catch (err) {
    return { error: err.message || 'Error emitiendo DTE' };
  }
}

module.exports = {
  issueDocument,
  isConfigured,
  getProviderStatus,
  getProvider
};
