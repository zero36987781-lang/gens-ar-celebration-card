export class MapPicker {
  constructor({ mapEl, latInput, lngInput, radiusInput, statusEl }) {
    this.mapEl = mapEl;
    this.latInput = latInput;
    this.lngInput = lngInput;
    this.radiusInput = radiusInput;
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

    // 핀 tip(아래 꼭짓점)이 지도 center와 일치하도록 배치
    this.mapEl.classList.add('map-box--center-pin');
    const centerPin = document.createElement('div');
    centerPin.className = 'map-center-pin';
    this.mapEl.appendChild(centerPin);
    const centerDot = document.createElement('div');
    centerDot.className = 'map-center-dot';
    this.mapEl.appendChild(centerDot);

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
      const c = this.map.getCenter();
      this.updateInputs(c.lat, c.lng);
      this.circle?.setLatLng([c.lat, c.lng]);
      this.renderStatus(`Pinned: ${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`);
    });

    this.radiusInput?.addEventListener('change', () => this.updateRadius());
    this.radiusInput?.addEventListener('input', () => this.updateRadius());
    this.latInput?.addEventListener('change', () => this.syncInputsToMap());
    this.lngInput?.addEventListener('change', () => this.syncInputsToMap());

    this.setPosition(defaultLat, defaultLng, true);
    this.renderStatus('지도를 드래그해 핀을 원하는 위치에 맞추세요.');
    requestAnimationFrame(() => this.map?.invalidateSize());
  }

  renderStatus(text, tone = 'success') {
    if (!this.statusEl) return;
    this.statusEl.textContent = text;
    this.statusEl.className = `map-status-inline ${tone}`;
  }

  updateInputs(lat, lng) {
    if (this.latInput) this.latInput.value = Number(lat).toFixed(6);
    if (this.lngInput) this.lngInput.value = Number(lng).toFixed(6);
    const latD = document.getElementById('lat-display');
    const lngD = document.getElementById('lng-display');
    if (latD) latD.textContent = Number(lat).toFixed(6);
    if (lngD) lngD.textContent = Number(lng).toFixed(6);
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
}
