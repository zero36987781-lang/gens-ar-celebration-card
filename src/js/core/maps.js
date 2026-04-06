import { getRuntimeConfig } from './runtime-config.js';
import { getPreferredLanguage } from './i18n.js';

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
    const language = getPreferredLanguage();
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
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=maps,places,geometry&language=${encodeURIComponent(language)}`;
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
    this.circle = null;
    this.geocoder = null;
    this.centerPin = null;
    this.silentSync = false;
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
      mapTypeControl: false,
      gestureHandling: 'greedy'
    });

    this.mapEl.classList.add('map-box--center-pin');
    this.centerPin = document.createElement('div');
    this.centerPin.className = 'map-center-pin';
    this.centerPin.innerHTML = '<span></span>';
    this.mapEl.appendChild(this.centerPin);

    this.geocoder = new maps.Geocoder();
    this.circle = new maps.Circle({
      map: this.map,
      center: defaultCenter,
      radius: Number(this.radiusInput?.value) || 50,
      strokeColor: '#ef4444',
      fillColor: '#ef4444',
      fillOpacity: 0,
      strokeOpacity: 0.42,
      strokeWeight: 2,
      clickable: false
    });

    this.map.addListener('idle', () => {
      if (this.silentSync) return;
      const center = extractLatLng(this.map.getCenter());
      if (!center) return;
      this.updateInputs(center.lat, center.lng);
      this.circle?.setCenter(center);
      this.renderStatus(`Pinned: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`);
    });

    this.map.addListener('click', (event) => {
      const next = extractLatLng(event?.latLng);
      if (next) this.setPosition(next.lat, next.lng, true);
    });

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

    this.setPosition(defaultCenter.lat, defaultCenter.lng, true);
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
    const position = { lat: Number(lat), lng: Number(lng) };
    if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) return;
    this.updateInputs(position.lat, position.lng);
    this.circle?.setCenter(position);
    this.updateRadius();

    if (pan && this.map) {
      this.silentSync = true;
      this.map.panTo(position);
      window.setTimeout(() => {
        this.silentSync = false;
        this.renderStatus(`Pinned: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`);
      }, 180);
    } else {
      this.renderStatus(`Pinned: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`);
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
      const next = extractLatLng(location);
      if (!next) throw new Error('Location search failed.');
      this.setPosition(next.lat, next.lng, true);
    } catch (error) {
      this.renderStatus(error.message || 'Location search failed.', 'warn');
    }
  }
}
