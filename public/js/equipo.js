(function () {
  const notify = (msg, type) => {
    if (window.FundezNotify) window.FundezNotify.show(msg, type);
  };

  document.querySelectorAll('.tech-toggle').forEach((input) => {
    input.addEventListener('change', async () => {
      const id = input.dataset.id;
      const active = input.checked;
      input.disabled = true;
      try {
        const res = await fetch(`/proveedor/equipo/${id}/toggle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ active })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Error');
        notify(active ? 'Técnico activado' : 'Técnico desactivado', 'success');
      } catch (err) {
        input.checked = !active;
        notify('No se pudo actualizar el técnico', 'error');
      } finally {
        input.disabled = false;
      }
    });
  });
})();
