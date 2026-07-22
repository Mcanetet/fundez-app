/**
 * Serializa un pedido para la vista de terreno (técnico o socio observador).
 */
function serializeFieldJob(store, request) {
  const service = store.getServiceById(request.serviceId);
  const live = store.getLiveTrackingLocation(request);
  return {
    id: request.id,
    serviceId: request.serviceId,
    serviceName: request.serviceName || (service ? service.name : request.serviceId),
    activityId: request.activityId || null,
    activityName: request.activityName || null,
    clientName: request.clientName || '—',
    address: request.address || '',
    notes: request.notes || '',
    clientPhotoUrl: request.clientPhotoUrl || null,
    clientBrandPhotoUrl: request.clientBrandPhotoUrl || null,
    brandNotVisible: Boolean(request.brandNotVisible),
    status: request.status,
    techStatus: request.techStatus || 'asignado',
    technicianId: request.technicianId || null,
    technicianName: request.technicianName || null,
    siteReport: request.siteReport || null,
    coords: request.coords || null,
    isGift: !!request.isGift,
    beneficiaryName: request.beneficiaryName || null,
    liveLocation: live,
    searchingAt: request.searchingAt || null,
    createdAt: request.createdAt || null,
    assignedAt: request.assignedAt || null
  };
}

module.exports = { serializeFieldJob };
