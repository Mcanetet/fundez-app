const { v4: uuidv4 } = require('uuid');
const { geocodeAddress, randomSantiagoCoords } = require('../lib/geocode');

const SERVICES = [
  {
    id: 'electrico',
    name: 'Eléctrico',
    icon: '⚡',
    color: '#F59E0B',
    visitPrice: 25000,
    basicMin: 40000,
    basicMax: 60000,
    description: 'Instalaciones, cortocircuitos, tableros y emergencias eléctricas.',
    enabled: true
  },
  {
    id: 'gasfiter',
    name: 'Gásfiter',
    icon: '🔧',
    color: '#3B82F6',
    visitPrice: 25000,
    basicMin: 45000,
    basicMax: 70000,
    description: 'Fugas, cañerías, grifería y destapes en baño y cocina.',
    enabled: true
  },
  {
    id: 'cerrajero',
    name: 'Cerrajero',
    icon: '🔑',
    color: '#8B5CF6',
    visitPrice: 30000,
    basicMin: 50000,
    basicMax: 90000,
    description: 'Apertura de puertas, cambio de cerraduras y copias de llaves.',
    enabled: true
  },
  {
    id: 'termos',
    name: 'Reparación de Termos',
    icon: '🔥',
    color: '#EF4444',
    visitPrice: 28000,
    basicMin: 55000,
    basicMax: 120000,
    description: 'Mantención, cambio de resistencia y reparación de termos eléctricos.',
    enabled: true
  },
  {
    id: 'lavavajillas',
    name: 'Lavavajillas',
    icon: '🍽️',
    color: '#06B6D4',
    visitPrice: 25000,
    basicMin: 45000,
    basicMax: 85000,
    description: 'Reparación de bombas, fugas y programas de lavado.',
    enabled: true
  },
  {
    id: 'lavadora',
    name: 'Lavadora',
    icon: '🫧',
    color: '#10B981',
    visitPrice: 25000,
    basicMin: 40000,
    basicMax: 80000,
    description: 'Centrifugado, drenaje, tambor y tarjetas electrónicas.',
    enabled: true
  }
];

const USERS = [
  {
    id: 'client-1',
    email: 'cliente@zilo.cl',
    password: 'cliente123',
    name: 'María González',
    role: 'client',
    phone: '+56 9 8765 4321',
    address: 'Av. Providencia 2650, Providencia, Santiago'
  },
  {
    id: 'provider-pedro',
    email: 'pedro@zilo.cl',
    password: 'proveedor123',
    name: 'Pedro Gómez',
    role: 'provider',
    phone: '+56 9 2234 5678',
    specialties: ['gasfiter'],
    rating: 4.8,
    reviewsCount: 94,
    online: false,
    avatar: 'PG',
    bio: 'Gásfiter maestro con 10 años de experiencia en edificios y hogares de Santiago.',
    reviews: [
      { author: 'Camila T.', rating: 5, text: 'Excelente disposición, solucionó la filtración del lavaplatos muy rápido', date: '2025-05-18' },
      { author: 'Diego M.', rating: 5, text: 'Muy puntual y dejó todo limpio después del trabajo.', date: '2025-04-30' },
      { author: 'Sofía L.', rating: 4, text: 'Buen precio y trabajo bien hecho en la cañería.', date: '2025-04-12' }
    ]
  },
  {
    id: 'provider-marta',
    email: 'marta@zilo.cl',
    password: 'proveedor123',
    name: 'Marta Quiroz',
    role: 'provider',
    phone: '+56 9 3345 6789',
    specialties: ['electrico'],
    rating: 4.9,
    reviewsCount: 112,
    online: false,
    avatar: 'MQ',
    bio: 'Electricista certificada SEC. Especialista en instalaciones residenciales y comerciales.',
    reviews: [
      { author: 'Andrés P.', rating: 5, text: 'Certificada SEC, instaló las luminarias del pasillo de forma impecable', date: '2025-05-22' },
      { author: 'Valentina R.', rating: 5, text: 'Profesional y muy clara al explicar el trabajo realizado.', date: '2025-05-05' },
      { author: 'Jorge H.', rating: 5, text: 'Solucionó un cortocircuito complejo en menos de una hora.', date: '2025-04-20' }
    ]
  },
  {
    id: 'provider-juan',
    email: 'juancarlos@zilo.cl',
    password: 'proveedor123',
    name: 'Juan Carlos',
    role: 'provider',
    phone: '+56 9 4456 7890',
    specialties: ['cerrajero'],
    rating: 4.7,
    reviewsCount: 78,
    online: false,
    avatar: 'JC',
    bio: 'Cerrajero profesional 24/7. Apertura sin daños y cambio de cerraduras de seguridad.',
    reviews: [
      { author: 'Patricia N.', rating: 5, text: 'Llegó en 20 minutos y abrió la puerta del departamento sin daños', date: '2025-05-15' },
      { author: 'Felipe A.', rating: 4, text: 'Rápido y eficiente, cambió la cerradura completa.', date: '2025-04-28' },
      { author: 'Daniela C.', rating: 5, text: 'Muy confiable, lo llamaré de nuevo sin dudarlo.', date: '2025-04-10' }
    ]
  },
  {
    id: 'admin-1',
    email: 'admin@zilo.cl',
    password: 'admin123',
    name: 'Admin Zilo',
    role: 'admin',
    phone: '+56 9 0000 0000'
  }
];

let requests = [];
const providerSockets = new Map();

async function createRequest({ clientId, serviceId, address, notes, coords: inputCoords }) {
  const service = getServiceById(serviceId);
  const client = getUserById(clientId);
  const fullAddress = address || client.address;

  let coords;
  if (inputCoords?.lat && inputCoords?.lng) {
    coords = { lat: parseFloat(inputCoords.lat), lng: parseFloat(inputCoords.lng) };
  } else {
    const geo = await geocodeAddress(fullAddress);
    coords = { lat: geo.lat, lng: geo.lng, displayName: geo.displayName };
  }

  const request = {
    id: uuidv4(),
    clientId,
    clientName: client.name,
    clientPhone: client.phone,
    serviceId,
    serviceName: service.name,
    address: fullAddress,
    notes: notes || '',
    status: 'pending_payment',
    paymentStatus: 'pending',
    paymentId: null,
    preferenceId: null,
    providerId: null,
    createdAt: new Date().toISOString(),
    estimatedVisit: service.visitPrice,
    coords
  };
  requests.unshift(request);
  return request;
}

function setPaymentPreference(requestId, preferenceId) {
  const request = requests.find(r => r.id === requestId);
  if (request) request.preferenceId = preferenceId;
  return request;
}

function markPaymentApproved(requestId, paymentId) {
  const request = requests.find(r => r.id === requestId);
  if (!request) return null;
  request.paymentStatus = 'approved';
  request.paymentId = paymentId;
  request.paidAt = new Date().toISOString();
  return request;
}

function activateRequest(requestId) {
  const request = requests.find(r => r.id === requestId);
  if (!request) return null;
  request.status = 'searching';
  return request;
}

function formatCLP(amount) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount);
}

function getServiceById(id) {
  return SERVICES.find(s => s.id === id);
}

function getActiveServices() {
  return SERVICES.filter(s => s.enabled);
}

function toggleService(serviceId, enabled) {
  const service = getServiceById(serviceId);
  if (!service) return null;
  service.enabled = enabled;
  return service;
}

function getUserByEmail(email) {
  return USERS.find(u => u.email === email);
}

function getUserById(id) {
  return USERS.find(u => u.id === id);
}

function getOnlineProviders(serviceId) {
  return USERS.filter(
    u => u.role === 'provider' && u.online && u.specialties.includes(serviceId)
  );
}

function assignProvider(requestId, providerId) {
  const request = requests.find(r => r.id === requestId);
  if (!request) return null;
  request.providerId = providerId;
  request.status = 'assigned';
  request.assignedAt = new Date().toISOString();
  return request;
}

function updateRequestStatus(requestId, status) {
  const request = requests.find(r => r.id === requestId);
  if (!request) return null;
  request.status = status;
  if (status === 'completed') request.completedAt = new Date().toISOString();
  return request;
}

function setProviderOnline(providerId, online) {
  const provider = getUserById(providerId);
  if (provider && provider.role === 'provider') {
    provider.online = online;
    return provider;
  }
  return null;
}

function getRequestsByClient(clientId) {
  return requests.filter(r => r.clientId === clientId);
}

function getRequestsByProvider(providerId) {
  return requests.filter(r => r.providerId === providerId);
}

function getAllRequests() {
  return requests;
}

function getPendingRequestsForProvider(providerId) {
  const provider = getUserById(providerId);
  if (!provider) return [];
  return requests.filter(
    r => r.status === 'searching' && provider.specialties.includes(r.serviceId)
  );
}

module.exports = {
  SERVICES,
  USERS,
  formatCLP,
  getServiceById,
  getActiveServices,
  toggleService,
  getUserByEmail,
  getUserById,
  getOnlineProviders,
  createRequest,
  setPaymentPreference,
  markPaymentApproved,
  activateRequest,
  assignProvider,
  updateRequestStatus,
  setProviderOnline,
  getRequestsByClient,
  getRequestsByProvider,
  getAllRequests,
  getPendingRequestsForProvider,
  providerSockets,
  get requests() { return requests; }
};
