window.FundezMap = {
  maps: {},
  markers: {},

  tileLayer: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20
  },

  _destIcon() {
    return L.divIcon({
      className: 'fundez-map-marker fundez-map-marker--destination',
      html: '<span></span>',
      iconSize: [34, 42],
      iconAnchor: [17, 40],
      popupAnchor: [0, -36]
    });
  },

  _providerIcon() {
    return L.divIcon({
      className: 'fundez-map-marker fundez-map-marker--provider',
      html: '<span></span>',
      iconSize: [34, 42],
      iconAnchor: [17, 40],
      popupAnchor: [0, -36]
    });
  },

  init(container, { lat, lng, label, zoom = 14, draggable = false }) {
    if (!container || typeof L === 'undefined') return null;

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) return null;

    const mapId = container.id || `map-${Date.now()}`;
    container.id = mapId;

    if (this.maps[mapId]) {
      this.maps[mapId].remove();
      delete this.markers[mapId];
    }

    const map = L.map(container, {
      zoomControl: true,
      attributionControl: true,
      dragging: draggable,
      scrollWheelZoom: draggable
    }).setView([latitude, longitude], zoom);

    L.tileLayer(this.tileLayer.url, {
      attribution: this.tileLayer.attribution,
      subdomains: this.tileLayer.subdomains,
      maxZoom: this.tileLayer.maxZoom,
      detectRetina: true
    }).addTo(map);

    const marker = L.marker([latitude, longitude], { icon: this._destIcon() }).addTo(map);
    if (label) marker.bindPopup(label).openPopup();

    setTimeout(() => map.invalidateSize(), 300);
    setTimeout(() => map.invalidateSize(), 800);
    this.maps[mapId] = map;
    this.markers[mapId] = { destination: marker };
    return map;
  },

  initTracking(container, { destLat, destLng, destLabel, providerLat, providerLng }) {
    this.init(container, { lat: destLat, lng: destLng, label: destLabel, zoom: 14 });
    const mapId = container.id;
    if (providerLat != null && providerLng != null) {
      const pm = L.marker([parseFloat(providerLat), parseFloat(providerLng)], { icon: this._providerIcon() })
        .addTo(this.maps[mapId])
        .bindPopup('Técnico en camino');
      this.markers[mapId].provider = pm;
      this.maps[mapId].fitBounds(L.latLngBounds([
        [destLat, destLng],
        [providerLat, providerLng]
      ]).pad(0.2));
    }
    return this.maps[mapId];
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
    const marker = L.marker([latitude, longitude], { icon: this._destIcon() }).addTo(map);
    if (label) marker.bindPopup(label).openPopup();
    this.markers[containerId] = { destination: marker };
    setTimeout(() => map.invalidateSize(), 100);
  },

  updateProviderLocation(containerId, lat, lng, destLat, destLng) {
    const map = this.maps[containerId];
    if (!map || typeof L === 'undefined') return;

    const plat = parseFloat(lat);
    const plng = parseFloat(lng);
    const store = this.markers[containerId] || {};

    if (store.provider) {
      store.provider.setLatLng([plat, plng]);
    } else {
      store.provider = L.marker([plat, plng], { icon: this._providerIcon() })
        .addTo(map)
        .bindPopup('Técnico en camino');
      this.markers[containerId] = store;
    }

    if (destLat != null && destLng != null) {
      map.fitBounds(L.latLngBounds([[destLat, destLng], [plat, plng]]).pad(0.15));
    }
  }
};
