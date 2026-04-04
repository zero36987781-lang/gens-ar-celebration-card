import { getRuntimeConfig } from './runtime-config.js';

let googleMapsPromise = null;
let cachedMapId = '';

export async function loadGoogleMaps() {
  if (window.google?.maps) {
    return { maps: window.google.maps, mapId: cachedMapId || '' };
  }
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = (async () => {
    const config = await getRuntimeConfig();
    const apiKey = window.__GOOGLE_MAPS_API_KEY__ || config.googleMapsApiKey || localStorage.getItem('google-maps:key') || '';
    const mapId = window.__GOOGLE_MAPS_MAP_ID__ || config.googleMapsMapId || localStorage.getItem('google-maps:mapId') || '';
    cachedMapId = mapId;

    if (!apiKey) {
      throw new Error('Google Maps API key is missing. Add GOOGLE_MAPS_API_KEY in Cloudflare Pages secrets.');
    }

    await new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-google-maps-loader]');
      if (existing) {
        if (window.google?.maps) {
          resolve();
          return;
        }
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Google Maps failed to load.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=maps,marker,places,geometry`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMapsLoader = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google Maps failed to load.'));
      document.head.appendChild(script);
    });

    return { maps: window.google.maps, mapId };
  })();

  return googleMapsPromise;
}

function extractLatLng(position) {
  if (!position) return null;
  if (typeof position.lat === 'function' && typeof position.lng === 'function') {
    return { lat: position.lat(), lng: position.lng() };
  }
  if (typeof position.lat === 'number' && typeof position.lng === 'number') {
    return position;
  }
  return null;
}

export class MapPicker {
  constructor({ mapEl, latInput, lngInput, radiusInput, searchInput, searchButton, statusEl, mapId = '' }) {
    this.mapEl = mapEl;
    this.latInput = latInput;
    this.lngInput = lngInput;
    this.radiusInput = radiusInput;
    this.searchInput = searchInput;
    this.searchButton = searchButton;
    this.statusEl = statusEl;
    this.mapId = mapId;
    this.map = null;
    this.marker = null;
    this.circle = null;
    this.geocoder = null;
    this.holdTimer = null;
    this.holdActive = false;
    this.lastHoldPoint = null;
  }

  async init() {
    if (!this.mapEl) return;

    const { maps, mapId } = await loadGoogleMaps();
    this.maps = maps;
    this.mapId = this.mapId || mapId || undefined;

    const defaultCenter = {
      lat: Number(this.latInput?.value) || 37.5665,
      lng: Number(this.lngInput?.value) || 126.978
    };

    this.map = new maps.Map(this.mapEl, {
      center: defaultCenter,
      zoom: 16,
      mapId: this.mapId,
      clickableIcons: false,
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: true,
      gestureHandling: 'greedy'
    });

    this.geocoder = new maps.Geocoder();
    this.circle = new maps.Circle({
      map: this.map,
      center: defaultCenter,
      radius: Number(this.radiusInput?.value) || 50,
      strokeColor: '#7c3aed',
      fillColor: '#7c3aed',
      fillOpacity: 0.12,
      strokeOpacity: 0.85,
      strokeWeight: 2,
      clickable: true
    });

    if (maps.marker?.AdvancedMarkerElement) {
      const pin = new maps.marker.PinElement({
        background: '#7c3aed',
        borderColor: '#ffffff',
        glyphColor: '#ffffff'
      });
      this.marker = new maps.marker.AdvancedMarkerElement({
        map: this.map,
        position: defaultCenter,
        gmpDraggable: true,
        content: pin.element
      });
      this.marker.addListener('dragend', (event) => {
        const next = extractLatLng(event?.latLng) || extractLatLng(this.marker.position);
        if (next) this.setPosition(next.lat, next.lng, true);
      });
    } else {
      this.marker = new maps.Marker({ map: this.map, position: defaultCenter, draggable: true });
      this.marker.addListener('dragend', (event) => {
        const next = extractLatLng(event?.latLng);
        if (next) this.setPosition(next.lat, next.lng, true);
      });
    }

    this.map.addListener('click', (event) => {
      if (this.holdActive) return;
      const next = extractLatLng(event?.latLng);
      if (next) this.setPosition(next.lat, next.lng, true);
    });

    this.bindHoldToMove(this.map);
    this.bindHoldToMove(this.circle);

    this.radiusInput?.addEventListener('change', () => this.updateRadius());
    this.radiusInput?.addEventListener('input', () => this.updateRadius());
    this.searchButton?.addEventListener('click', () => this.search());
    this.searchInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.search();
      }
    });
    this.latInput?.addEventListener('change', () => this.syncInputsToMap());
    this.lngInput?.addEventListener('change', () => this.syncInputsToMap());
    this.mapEl.addEventListener('touchend', () => this.endHoldMove());
    this.mapEl.addEventListener('touchcancel', () => this.endHoldMove());
    window.addEventListener('mouseup', () => this.endHoldMove());
    window.addEventListener('touchend', () => this.endHoldMove());

    this.setPosition(defaultCenter.lat, defaultCenter.lng);
    if (this.statusEl) {
      this.statusEl.textContent = 'Search, tap, drag the pin, or long-press inside the radius to move the spot.';
      this.statusEl.className = 'status-box success';
    }
  }

  bindHoldToMove(target) {
    target?.addListener?.('mousedown', (event) => this.startHoldMove(event));
    target?.addListener?.('mousemove', (event) => this.moveHold(event));
    target?.addListener?.('mouseup', () => this.endHoldMove());
    target?.addListener?.('drag', (event) => this.moveHold(event));
    target?.addListener?.('dragend', () => this.endHoldMove());
  }

  startHoldMove(event) {
    const next = extractLatLng(event?.latLng);
    if (!next) return;
    this.lastHoldPoint = next;
    window.clearTimeout(this.holdTimer);
    this.holdTimer = window.setTimeout(() => {
      this.holdActive = true;
      this.setPosition(this.lastHoldPoint.lat, this.lastHoldPoint.lng, true);
      if (this.statusEl) {
        this.statusEl.textContent = 'Hold-move active. Slide within the radius to reposition the point without covering it with your finger.';
        this.statusEl.className = 'status-box success';
      }
    }, 360);
  }

  moveHold(event) {
    const next = extractLatLng(event?.latLng);
    if (!next) return;
    this.lastHoldPoint = next;
    if (!this.holdActive) return;
    this.setPosition(next.lat, next.lng, false);
  }

  endHoldMove() {
    window.clearTimeout(this.holdTimer);
    this.holdTimer = null;
    if (this.holdActive && this.statusEl) {
      this.statusEl.textContent = `Pinned: ${Number(this.latInput?.value || 0).toFixed(6)}, ${Number(this.lngInput?.value || 0).toFixed(6)}`;
      this.statusEl.className = 'status-box success';
    }
    this.holdActive = false;
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
    const position = { lat: Number(lat), lng: Number(lng) };
    if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) return;

    if (this.latInput) this.latInput.value = position.lat.toFixed(6);
    if (this.lngInput) this.lngInput.value = position.lng.toFixed(6);

    if (this.marker?.setPosition) {
      this.marker.setPosition(position);
    } else if (this.marker) {
      this.marker.position = position;
    }

    this.circle?.setCenter(position);
    this.updateRadius();

    if (pan) {
      this.map?.panTo(position);
    }

    if (this.statusEl && !this.holdActive) {
      this.statusEl.textContent = `Pinned: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`;
      this.statusEl.className = 'status-box success';
    }
  }

  async search() {
    const query = this.searchInput?.value?.trim();
    if (!query || !this.geocoder) return;

    try {
      const result = await this.geocoder.geocode({ address: query });
      const location = result.results?.[0]?.geometry?.location;
      if (!location) {
        throw new Error('Location search failed.');
      }
      this.setPosition(location.lat(), location.lng(), true);
      this.map?.setZoom(18);
    } catch (error) {
      if (this.statusEl) {
        this.statusEl.textContent = error.message || 'Location search failed.';
        this.statusEl.className = 'status-box error';
      }
    }
  }
}
