window.ZiloMap = {
  maps: {},

  init(container, { lat, lng, label, zoom = 14, draggable = false }) {
    if (!container || typeof L === 'undefined') return null;

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) return null;

    const mapId = container.id || `map-${Date.now()}`;
    container.id = mapId;

    if (this.maps[mapId]) {
      this.maps[mapId].remove();
    }

    const map = L.map(container, {
      zoomControl: true,
      attributionControl: true,
      dragging: draggable,
      scrollWheelZoom: draggable
    }).setView([latitude, longitude], zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19
    }).addTo(map);

    const icon = L.divIcon({
      className: '',
      html: '<div style="width:20px;height:20px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 2px 12px rgba(59,130,246,0.6)"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const marker = L.marker([latitude, longitude], { icon }).addTo(map);
    if (label) marker.bindPopup(label).openPopup();

    setTimeout(() => map.invalidateSize(), 300);
    this.maps[mapId] = map;
    return map;
  },

  update(containerId, lat, lng, label) {
    const map = this.maps[containerId];
    if (!map) return;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    map.setView([latitude, longitude], 15);
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) map.removeLayer(layer);
    });
    const icon = L.divIcon({
      className: '',
      html: '<div style="width:20px;height:20px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 2px 12px rgba(59,130,246,0.6)"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    const marker = L.marker([latitude, longitude], { icon }).addTo(map);
    if (label) marker.bindPopup(label).openPopup();
  }
};
