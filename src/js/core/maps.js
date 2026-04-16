export class MapPicker {
  constructor({ mapEl, latInput, lngInput, radiusInput, searchInput, searchButton, statusEl }) {
    this.mapEl = mapEl;
    this.latInput = latInput;
    this.lngInput = lngInput;
    this.radiusInput = radiusInput;
    this.searchInput = searchInput;
    this.searchButton = searchButton;
    this.statusEl = statusEl;
    this.map = null;
    this.circle = null;
    this.silentSync = false;
  }

  init() {
    if (!this.mapEl) return;

    const defaultLat = Number(this.latInput?.value) || 37.5665;
    const defaultLng = Number(this.lngInput?.value) || 126.978;

    this.map = L.map(this.mapEl, {
      center: [defaultLat, defaultLng],
      zoom: 16,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OSM',
      maxZoom: 19
    }).addTo(this.map);

    this.mapEl.classList.add('map-box--center-pin');
    const centerPin = document.createElement('div');
    centerPin.className = 'map-center-pin';
    centerPin.innerHTML = '<span></span>';
    this.mapEl.appendChild(centerPin);

    this.circle = L.circle([defaultLat, defaultLng], {
      radius: Number(this.radiusInput?.value) || 50,
      color: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0,
      opacity: 0.42,
      weight: 2,
      interactive: false
    }).addTo(this.map);

    this.map.on('moveend', () => {
      if (this.silentSync) return;
      const center = this.map.getCenter();
      this.updateInputs(center.lat, center.lng);
      this.circle?.setLatLng([center.lat, center.lng]);
      this.renderStatus(`Pinned: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`);
    });

    this.map.on('click', (e) => {
      this.setPosition(e.latlng.lat, e.latlng.lng, true);
    });

    this.radiusInput?.addEventListener('change', () => this.updateRadius());
    this.radiusInput?.addEventListener('input', () => this.updateRadius());
    this.searchButton?.addEventListener('click', () => this.search());
    this.searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this.search(); }
    });
    this.latInput?.addEventListener('change', () => this.syncInputsToMap());
    this.lngInput?.addEventListener('change', () => this.syncInputsToMap());

    this.setPosition(defaultLat, defaultLng, true);
    this.renderStatus('Pan the map under the fixed center pin or search to place the card.');
  }

  renderStatus(text, tone = 'success') {
    if (!this.statusEl) return;
    this.statusEl.textContent = text;
    this.statusEl.className = `status-box ${tone}`;
  }

  updateInputs(lat, lng) {
    if (this.latInput) this.latInput.value = Number(lat).toFixed(6);
    if (this.lngInput) this.lngInput.value = Number(lng).toFixed(6);
  }

  updateRadius() {
    if (!this.circle) return;
    this.circle.setRadius(Number(this.radiusInput?.value) || 50);
  }

  syncInputsToMap() {
    const lat = Number(this.latInput?.value);
    const lng = Number(this.lngInput?.value);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    this.setPosition(lat, lng, true);
  }

  setPosition(lat, lng, pan = false) {
    lat = Number(lat); lng = Number(lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    this.updateInputs(lat, lng);
    this.circle?.setLatLng([lat, lng]);
    this.updateRadius();
    if (pan && this.map) {
      this.silentSync = true;
      this.map.panTo([lat, lng]);
      window.setTimeout(() => {
        this.silentSync = false;
        this.renderStatus(`Pinned: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }, 180);
    } else {
      this.renderStatus(`Pinned: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  }

  async search() {
    const query = this.searchInput?.value?.trim();
    if (!query) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
        { headers: { 'Accept-Language': 'ko,en' } }
      );
      const data = await res.json();
      if (!data?.length) throw new Error('Location search failed.');
      this.setPosition(parseFloat(data[0].lat), parseFloat(data[0].lon), true);
    } catch (e) {
      this.renderStatus(e.message || 'Location search failed.', 'warn');
    }
  }
}
