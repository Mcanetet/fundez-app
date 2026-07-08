const notifications = require('./notifications');
const dte = require('./dte');
const { computeRequestFinancials } = require('./pricing');

let getStore;

function init(store) {
  getStore = () => store;
  notifications.bindStore(store);
}

function ctx(request) {
  const store = getStore();
  const client = store.getUserById(request.clientId);
  const provider = request.providerId ? store.getUserById(request.providerId) : null;
  return {
    request,
    client,
    provider,
    amount: request.visitPricePaid || request.amountDue || 0
  };
}

function emit(event, request, extra = {}) {
  if (!getStore) return;
  const base = ctx(request);
  notifications.sendEvent(event, { ...base, ...extra }).catch((err) => {
    console.error(`[notifications] ${event}:`, err.message);
  });
}

function attachDteDocument(request, document) {
  if (!request.dteDocuments) request.dteDocuments = [];
  request.dteDocuments.push(document);
  const store = getStore();
  store.repository.persist(() => store.repository.saveRequest(request), `dte ${request.id}`);
}

async function issueDte(request, { phase, amount, description }) {
  const billing = request.billingSnapshot;
  if (!billing) return { error: 'Sin datos de facturación' };

  const result = await dte.issueDocument({
    request,
    billing,
    amount,
    phase,
    description
  });

  if (result.error) {
    console.error(`[dte] ${phase}:`, result.error);
    return result;
  }

  attachDteDocument(request, result.document);

  const store = getStore();
  const client = store.getUserById(request.clientId);
  notifications.sendEvent('dte.issued', {
    request,
    client,
    docKind: result.document.kind,
    folio: result.document.folio,
    amount: result.document.amount,
    pdfUrl: result.document.pdfUrl
  }).catch(() => {});

  return result;
}

module.exports = {
  init,
  onPaymentApproved(request) {
    emit('payment.approved', request);
    const amount = request.visitPricePaid || request.amountDue || 0;
    issueDte(request, {
      phase: 'visit',
      amount,
      description: `Visita técnica — ${request.serviceName}`
    }).catch(() => {});
  },
  onTransferPending(request) {
    emit('payment.transfer_pending', request);
  },
  onServiceSearching(request) {
    const store = getStore();
    const providers = store.getOnlineProviders(request.serviceId);
    providers.forEach((provider) => {
      notifications.sendEvent('service.searching', {
        request,
        client: store.getUserById(request.clientId),
        provider,
        amount: request.visitPricePaid || request.amountDue || 0,
        to: provider.email,
        phone: provider.phone
      }).catch(() => {});
    });
  },
  onProviderAssigned(request) {
    emit('service.assigned', request);
  },
  onTechnicianAssigned(request) {
    emit('technician.assigned', request);
  },
  onTechnicianEnRoute(request) {
    emit('technician.en_route', request);
  },
  onTechnicianArrived(request) {
    emit('technician.arrived', request);
  },
  onBudgetSent(request, amount) {
    emit('budget.sent', request, { amount });
  },
  onServiceCompleted(request) {
    emit('service.completed', request);
    const store = getStore();
    const fin = request.financials || computeRequestFinancials(request, store.getPricingConfig());
    const extra = (fin?.serviceAmount || 0) + (fin?.materialsTotal || 0);
    if (extra > 0) {
      issueDte(request, {
        phase: 'completion',
        amount: extra,
        description: `Servicio y materiales — ${request.serviceName}`
      }).catch(() => {});
    }
  },
  retryDte(requestId, phase) {
    const store = getStore();
    const request = store.getAllRequests().find((r) => r.id === requestId);
    if (!request) return { error: 'Solicitud no encontrada' };
    const amount = phase === 'visit'
      ? (request.visitPricePaid || request.amountDue || 0)
      : (request.financials?.serviceAmount || 0) + (request.financials?.materialsTotal || 0);
    const description = phase === 'visit'
      ? `Visita técnica — ${request.serviceName}`
      : `Servicio y materiales — ${request.serviceName}`;
    return issueDte(request, { phase, amount, description });
  },
  getDteStatus: dte.getProviderStatus
};
