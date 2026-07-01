(function () {
  const page = document.getElementById('servicePage');
  if (!page) return;

  const serviceId = page.dataset.serviceId;
  const trackingId = page.dataset.tracking;
  const btnRequest = document.getElementById('btnRequest');
  const loaderOverlay = document.getElementById('loaderOverlay');
  const providerCard = document.getElementById('providerCard');
  const requestForm = document.getElementById('requestForm');
  const addressInput = document.getElementById('address');
  const latInput = document.getElementById('lat');
  const lngInput = document.getElementById('lng');
  const mapStatus = document.getElementById('mapStatus');

  let currentRequestId = trackingId || null;
  let geocodeTimer = null;
  const socket = io();

  const SANTIAGO = { lat: -33.4489, lng: -70.6693 };

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof ZiloMap !== 'undefined') {
      ZiloMap.init(document.getElementById('addressMap'), {
        lat: SANTIAGO.lat, lng: SANTIAGO.lng, label: 'Santiago, Chile', zoom: 12
      });
    }

    if (trackingId) {
      requestForm.classList.add('hidden');
      loaderOverlay.classList.remove('hidden');
      startTracking(trackingId);
    }
  });

  addressInput.addEventListener('input', () => {
    clearTimeout(geocodeTimer);
    geocodeTimer = setTimeout(geocodeAddress, 800);
  });

  async function geocodeAddress() {
    const address = addressInput.value.trim();
    if (address.length < 5) return;

    mapStatus.textContent = 'Buscando ubicación...';
    try {
      const res = await fetch('/cliente/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      const data = await res.json();
      if (data.success) {
        latInput.value = data.coords.lat;
        lngInput.value = data.coords.lng;
        ZiloMap.update('addressMap', data.coords.lat, data.coords.lng, data.displayName || address);
        mapStatus.textContent = data.displayName || 'Ubicación encontrada';
      }
    } catch (_) {
      mapStatus.textContent = 'No se pudo geocodificar';
    }
  }

  const loaderSteps = [
    { id: 'step1', text: 'Buscando proveedor cercano...', sub: 'Usando tu ubicación en Santiago' },
    { id: 'step2', text: 'Encontramos técnicos disponibles', sub: 'Verificando especialidad y rating' },
    { id: 'step3', text: 'Conectando con tu proveedor', sub: 'Casi listo...' }
  ];

  function setStepActive(stepId) {
    document.querySelectorAll('.step-item').forEach(el => {
      el.className = 'step-item px-4 py-2.5 rounded-xl bg-zilo-card border border-white/8 text-sm text-white/40';
    });
    const el = document.getElementById(stepId);
    if (el) el.className = 'step-item px-4 py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-sm text-blue-300';
  }

  function animateLoader() {
    let step = 0;
    return setInterval(() => {
      if (step < loaderSteps.length) {
        setStepActive(loaderSteps[step].id);
        document.getElementById('loaderText').textContent = loaderSteps[step].text;
        document.getElementById('loaderSub').textContent = loaderSteps[step].sub;
        step++;
      }
    }, 1800);
  }

  function showProvider(provider, request) {
    document.getElementById('providerAvatar').textContent = provider.avatar;
    document.getElementById('providerName').textContent = provider.name;
    document.getElementById('providerRating').textContent = provider.rating;
    document.getElementById('providerReviews').textContent = `(${provider.reviewsCount} reseñas)`;
    document.getElementById('providerStars').textContent = '★'.repeat(Math.round(provider.rating));
    document.getElementById('providerBio').textContent = provider.bio;
    document.getElementById('providerPhone').href = `tel:${provider.phone}`;

    document.getElementById('reviewsList').innerHTML = provider.reviews.map(r => `
      <div class="p-3 rounded-xl bg-zilo-bg">
        <div class="flex justify-between mb-1">
          <span class="text-xs font-semibold">${r.author}</span>
          <span class="text-xs text-yellow-400">${'★'.repeat(r.rating)}</span>
        </div>
        <p class="text-xs text-white/50">${r.text}</p>
      </div>
    `).join('');

    if (request?.coords) {
      const tMap = document.getElementById('trackingMap');
      tMap.classList.remove('hidden');
      ZiloMap.init(tMap, { lat: request.coords.lat, lng: request.coords.lng, label: request.address, zoom: 15 });
    }

    loaderOverlay.classList.add('hidden');
    providerCard.classList.remove('hidden');
    requestForm.classList.add('hidden');
    ZiloNotify.show('¡Proveedor asignado!', 'success');
  }

  function pollForProvider(requestId, attempts = 0) {
    if (attempts > 30) {
      loaderOverlay.classList.add('hidden');
      requestForm.classList.remove('hidden');
      ZiloNotify.show('No hay proveedores disponibles. Intenta más tarde.', 'warning');
      return;
    }

    fetch(`/cliente/solicitud/${requestId}`)
      .then(r => r.json())
      .then(data => {
        if (data.provider) showProvider(data.provider, data.request);
        else setTimeout(() => pollForProvider(requestId, attempts + 1), 2000);
      });
  }

  function startTracking(requestId) {
    currentRequestId = requestId;
    const loaderInterval = animateLoader();
    socket.emit('register_client', requestId);
    socket.on(`request_update_${requestId}`, (payload) => {
      if (payload.provider) {
        clearInterval(loaderInterval);
        showProvider(payload.provider, payload.request);
      }
    });
    pollForProvider(requestId);
  }

  btnRequest.addEventListener('click', async () => {
    const address = addressInput.value.trim();
    if (!address) {
      addressInput.focus();
      ZiloNotify.show('Ingresa una dirección', 'warning');
      return;
    }

    btnRequest.disabled = true;
    btnRequest.textContent = 'Procesando...';

    try {
      if (!latInput.value) await geocodeAddress();

      const res = await fetch('/cliente/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId,
          address,
          notes: document.getElementById('notes').value,
          lat: latInput.value,
          lng: lngInput.value
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Error');

      const payRes = await fetch('/pagos/crear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: data.request.id })
      });
      const payData = await payRes.json();
      if (!payData.success) throw new Error(payData.error || 'Error de pago');

      window.location.href = payData.checkoutUrl;
    } catch (err) {
      btnRequest.disabled = false;
      btnRequest.innerHTML = '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg> Pagar y Solicitar';
      ZiloNotify.show(err.message || 'Error al procesar', 'error');
    }
  });
})();
