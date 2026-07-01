(function () {
  const dashboard = document.getElementById('providerDashboard');
  if (!dashboard) return;

  const providerId = dashboard.dataset.providerId;
  const socket = io();

  const onlineToggle = document.getElementById('onlineToggle');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const statusSub = document.getElementById('statusSub');
  const requestModal = document.getElementById('requestModal');
  const activeJob = document.getElementById('activeJob');

  let currentRequest = null;
  let countdownTimer = null;
  let alertInterval = null;
  let audioCtx = null;

  const COUNTDOWN_SECONDS = 15;
  const CIRCUMFERENCE = 150.8;

  socket.emit('register_provider', providerId);

  onlineToggle.addEventListener('change', async () => {
    const online = onlineToggle.checked;
    await fetch('/proveedor/toggle-online', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ online })
    });

    if (online) {
      statusDot.className = 'w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse';
      statusText.textContent = 'Estás en línea';
      statusSub.textContent = 'Recibirás solicitudes de clientes';
      ZiloNotify.show('Modo en línea activado', 'success');
    } else {
      statusDot.className = 'w-3 h-3 rounded-full bg-white/30';
      statusText.textContent = 'Estás fuera de línea';
      statusSub.textContent = 'Actívate para recibir trabajos';
      ZiloNotify.show('Modo fuera de línea', 'info');
    }
  });

  socket.on('new_request', (data) => {
    if (!onlineToggle.checked) return;

    currentRequest = data.request;
    const fmt = n => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

    document.getElementById('modalService').textContent = `${data.service.icon} ${data.service.name}`;
    document.getElementById('modalClient').textContent = data.client.name;
    document.getElementById('modalAddress').textContent = data.request.address;
    document.getElementById('modalCoords').textContent =
      data.request.coords ? `${data.request.coords.lat}, ${data.request.coords.lng}` : '-33.4489, -70.6693';

    const mapEl = document.getElementById('modalMap');
    if (data.request.coords && typeof ZiloMap !== 'undefined') {
      setTimeout(() => {
        ZiloMap.init(mapEl, {
          lat: data.request.coords.lat,
          lng: data.request.coords.lng,
          label: data.request.address,
          zoom: 16
        });
      }, 400);
    }
    document.getElementById('modalPrice').textContent = `Visita estimada: ${fmt(data.request.estimatedVisit)}`;
    document.getElementById('modalNotes').textContent = data.request.notes || 'Sin detalles adicionales';

    requestModal.classList.remove('hidden');
    startCountdown(COUNTDOWN_SECONDS);
    playAlertSound();
    startRepeatingAlert();

    if (Notification.permission === 'granted') {
      new Notification('Zilo — Nueva solicitud', {
        body: `${data.service.name} · ${data.request.address}`,
        icon: '/favicon.ico'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  });

  function getAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function playAlertSound() {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      [0, 0.15, 0.3].forEach((delay, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = i % 2 === 0 ? 880 : 1100;
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.25, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.25);
      });
    } catch (_) {}
  }

  function startRepeatingAlert() {
    stopRepeatingAlert();
    alertInterval = setInterval(playAlertSound, 3000);
  }

  function stopRepeatingAlert() {
    if (alertInterval) {
      clearInterval(alertInterval);
      alertInterval = null;
    }
  }

  function startCountdown(seconds) {
    const fill = document.getElementById('countdownFill');
    const number = document.getElementById('countdownNumber');
    const circle = document.getElementById('countdownCircle');
    let remaining = seconds;

    fill.style.width = '100%';
    number.textContent = remaining;
    circle.style.strokeDashoffset = '0';

    if (countdownTimer) clearInterval(countdownTimer);

    countdownTimer = setInterval(() => {
      remaining--;
      number.textContent = remaining;
      fill.style.width = `${(remaining / seconds) * 100}%`;
      circle.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - remaining / seconds));

      if (remaining <= 5) {
        number.classList.add('text-red-400');
        circle.setAttribute('stroke', '#EF4444');
      }

      if (remaining <= 0) {
        clearInterval(countdownTimer);
        stopRepeatingAlert();
        requestModal.classList.add('hidden');
        currentRequest = null;
        ZiloNotify.show('Solicitud expirada', 'warning');
        number.classList.remove('text-red-400');
        circle.setAttribute('stroke', '#3B82F6');
      }
    }, 1000);
  }

  function closeModal() {
    if (countdownTimer) clearInterval(countdownTimer);
    stopRepeatingAlert();
    requestModal.classList.add('hidden');
    document.getElementById('countdownNumber').classList.remove('text-red-400');
    document.getElementById('countdownCircle').setAttribute('stroke', '#3B82F6');
  }

  document.getElementById('btnAccept').addEventListener('click', async () => {
    if (!currentRequest) return;

    const res = await fetch(`/proveedor/accept/${currentRequest.id}`, { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      closeModal();
      showActiveJob(data.request);
      ZiloNotify.show('¡Servicio aceptado!', 'success');
    }
  });

  document.getElementById('btnDecline').addEventListener('click', () => {
    closeModal();
    currentRequest = null;
    ZiloNotify.show('Solicitud rechazada', 'info');
  });

  function showActiveJob(request) {
    document.getElementById('jobService').textContent = request.serviceName;
    document.getElementById('jobClient').textContent = request.clientName;
    document.getElementById('jobAddress').textContent = request.address;
    activeJob.classList.remove('hidden');
    activeJob.dataset.requestId = request.id;
  }

  document.querySelectorAll('#activeJob button[data-status]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const requestId = activeJob.dataset.requestId;
      const status = btn.dataset.status;

      await fetch(`/proveedor/status/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      const statusEl = document.getElementById('jobStatus');
      statusEl.textContent = status === 'completed' ? 'Completado' : 'En camino';
      statusEl.className = status === 'completed'
        ? 'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400'
        : 'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/15 text-blue-400';

      if (status === 'completed') {
        ZiloNotify.show('Servicio completado', 'success');
        setTimeout(() => activeJob.classList.add('hidden'), 2000);
      }
    });
  });
})();
