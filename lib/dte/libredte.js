const company = require('../../config/company');

function isConfigured() {
  return Boolean(process.env.LIBREDTE_URL && process.env.LIBREDTE_HASH);
}

async function emit({ request, billing, amount, phase, description }) {
  if (!isConfigured()) {
    return { error: 'LibreDTE no configurado (LIBREDTE_URL, LIBREDTE_HASH)' };
  }

  const kind = billing?.type === 'empresa' ? 'factura' : 'boleta';
  const dteType = kind === 'factura' ? 33 : 39;
  const baseUrl = process.env.LIBREDTE_URL.replace(/\/$/, '');

  const payload = {
    Encabezado: {
      IdDoc: { TipoDTE: dteType },
      Emisor: { RUTEmisor: company.rut.replace(/\./g, '') },
      Receptor: {
        RUTRecep: String(billing?.rut || '').replace(/\./g, ''),
        RznSocRecep: billing?.legalName,
        GiroRecep: billing?.giro || 'Particular',
        DirRecep: billing?.fiscalAddress,
        CorreoRecep: billing?.invoiceEmail
      }
    },
    Detalle: [{
      NmbItem: description,
      QtyItem: 1,
      PrcItem: Math.round(amount)
    }]
  };

  const auth = Buffer.from(`X:${process.env.LIBREDTE_HASH}`).toString('base64');
  const res = await fetch(`${baseUrl}/api/dte/documentos/emitir`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: data.message || data.error || `LibreDTE HTTP ${res.status}` };
  }

  const folio = data.folio || data.Folio || data?.dte?.folio;
  const docId = `dte-${request.id}-${phase}-${Date.now()}`;

  return {
    id: docId,
    requestId: request.id,
    kind,
    dteType,
    phase,
    folio: folio || 0,
    amount: Math.round(amount),
    description,
    lineDescription: description,
    receptorRut: billing?.rut,
    receptorName: billing?.legalName,
    receptorEmail: billing?.invoiceEmail,
    issuerRut: company.rut,
    issuerName: company.name,
    status: 'issued',
    provider: 'libredte',
    issuedAt: new Date().toISOString(),
    pdfUrl: data.pdf ? `/documentos/tributarios/${docId}` : null,
    xmlUrl: data.xml || null,
    siiStatus: data.estado || 'enviado',
    libredteTrackId: data.track_id || data.trackId || null
  };
}

module.exports = { isConfigured, emit };
