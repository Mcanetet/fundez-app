(function () {
  const dashboard = document.getElementById('adminDashboard');
  if (!dashboard) return;

  const socket = io();

  document.querySelectorAll('.service-toggle').forEach(toggle => {
    toggle.addEventListener('change', async () => {
      const serviceId = toggle.dataset.id;
      const enabled = toggle.checked;
      const item = toggle.closest('.service-toggle-item');
      const statusLabel = item.querySelector('.service-status');

      try {
        const res = await fetch('/admin/toggle-service', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceId, enabled })
        });
        const data = await res.json();

        if (data.success) {
          item.classList.toggle('opacity-50', !enabled);
          statusLabel.textContent = enabled ? 'ON' : 'OFF';
          statusLabel.className = `service-status text-[10px] font-bold uppercase ${enabled ? 'text-emerald-400' : 'text-red-400'}`;
          ZiloNotify.show(`${data.service.name} ${enabled ? 'activado' : 'desactivado'}`, enabled ? 'success' : 'warning');
        }
      } catch (_) {
        toggle.checked = !enabled;
        ZiloNotify.show('Error al actualizar servicio', 'error');
      }
    });
  });

  socket.on('services_updated', ({ services }) => {
    services.forEach(service => {
      const toggle = document.querySelector(`.service-toggle[data-id="${service.id}"]`);
      if (!toggle) return;
      toggle.checked = service.enabled;
      const item = toggle.closest('.service-toggle-item');
      const statusLabel = item.querySelector('.service-status');
      item.classList.toggle('opacity-50', !service.enabled);
      statusLabel.textContent = service.enabled ? 'ON' : 'OFF';
      statusLabel.className = `service-status text-[10px] font-bold uppercase ${service.enabled ? 'text-emerald-400' : 'text-red-400'}`;
    });
  });
})();
