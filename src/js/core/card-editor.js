import { qs, qsa, readFileAsDataURL, hexToRgb } from './utils.js';

const PRO_SWATCHES = [
  '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6',
  '#AF52DE', '#FF2D55', '#FFFFFF', '#1C1C1E', '#8E8E93', '#C7C7CC',
  '#0A84FF', '#30D158', '#FFD60A', '#FF453A', '#BF5AF2', '#64D2FF',
  '#AC8E68', '#D4C5A9', '#2C2C2E', '#3A3A3C', '#48484A', '#636366'
];

const FONT_LIST = [
  { name: 'Pretendard', value: "'Pretendard', sans-serif", url: null },
  { name: 'Inter', value: "'Inter', sans-serif", url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap' },
  { name: 'Noto Sans KR', value: "'Noto Sans KR', sans-serif", url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700;900&display=swap' },
  { name: 'Noto Serif KR', value: "'Noto Serif KR', serif", url: 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700;900&display=swap' },
  { name: 'Roboto', value: "'Roboto', sans-serif", url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap' },
  { name: 'Playfair Display', value: "'Playfair Display', serif", url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap' },
  { name: 'Montserrat', value: "'Montserrat', sans-serif", url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;900&display=swap' },
  { name: 'Poppins', value: "'Poppins', sans-serif", url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;700;900&display=swap' },
];

const loadedFonts = new Set(['Pretendard']);

function ensureFont(fontInfo) {
  if (loadedFonts.has(fontInfo.name)) return;
  if (!fontInfo.url) { loadedFonts.add(fontInfo.name); return; }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = fontInfo.url;
  document.head.appendChild(link);
  loadedFonts.add(fontInfo.name);
}

export class CardEditor {
  constructor({ prefix, previewCardSelector, onStateChange }) {
    this.prefix = prefix;
    this.previewCard = qs(previewCardSelector);
    this.onStateChange = onStateChange || (() => {});

    this.activeObj = 'title';
    this.activeProp = 'fill';
    this.activeColorTab = 'solid';

    this.state = {
      title: { fill: { type: 'solid', color: '#FFFFFF' }, stroke: { type: 'solid', color: 'transparent' }, background: { type: 'solid', color: 'transparent' }, font: "'Pretendard', sans-serif", weight: '900', size: '24' },
      subtitle: { fill: { type: 'solid', color: 'rgba(255,255,255,0.85)' }, stroke: { type: 'solid', color: 'transparent' }, background: { type: 'solid', color: 'transparent' }, font: "'Pretendard', sans-serif", weight: '400', size: '12' },
      message: { fill: { type: 'solid', color: '#FFFFFF' }, stroke: { type: 'solid', color: 'transparent' }, background: { type: 'solid', color: 'transparent' }, font: "'Pretendard', sans-serif", weight: '700', size: '13' },
      image: { data: '', scale: 100, offsetY: 0, opacity: 100, fit: 'cover' },
      bg: { fill: { type: 'solid', color: '#7c3aed' }, gradient: { stops: [{ id: 1, pos: 0, color: '#7c3aed' }, { id: 2, pos: 100, color: '#f59e0b' }], angle: 145 } }
    };

    this.gradientStops = [
      { id: 1, pos: 0, color: '#007AFF' },
      { id: 2, pos: 100, color: '#AF52DE' }
    ];
    this.gradientAngle = 135;
    this.activeStopId = null;

    this.init();
  }

  init() {
    this.renderSwatches();
    this.renderFontPreviews();
    this.bindObjSelector();
    this.bindPropSelector();
    this.bindColorTabs();
    this.bindGradient();
    this.bindFontControls();
    this.bindImageControls();
    this.bindPreviewTap();
    this.bindResizer();
    this.updateObjView();
  }

  el(id) { return qs(`#${this.prefix}-${id}`); }

  renderSwatches() {
    const solidGrid = qs(`#${this.prefix}-swatch-grid`);
    const harmonyGrid = qs(`#${this.prefix}-harmony-base-grid`);
    if (solidGrid) solidGrid.innerHTML = PRO_SWATCHES.map(c => `<div class="swatch" data-color="${c}" style="background:${c}"></div>`).join('');
    if (harmonyGrid) harmonyGrid.innerHTML = PRO_SWATCHES.map(c => `<div class="swatch" data-color="${c}" style="background:${c}"></div>`).join('');

    solidGrid?.addEventListener('click', (e) => {
      const sw = e.target.closest('.swatch');
      if (!sw) return;
      this.applyColor(sw.dataset.color);
      solidGrid.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
    });

    harmonyGrid?.addEventListener('click', (e) => {
      const sw = e.target.closest('.swatch');
      if (!sw) return;
      this.generateHarmony(sw.dataset.color);
    });
  }

  renderFontPreviews() {
    const container = qs(`#${this.prefix}-font-preview-scroll`);
    if (!container) return;
    container.innerHTML = FONT_LIST.map(f =>
      `<div class="font-preview-item" data-font-value="${f.value}" data-font-name="${f.name}" style="font-family:${f.value}">Aa</div>`
    ).join('');

    container.addEventListener('click', (e) => {
      const item = e.target.closest('.font-preview-item');
      if (!item) return;
      const fontInfo = FONT_LIST.find(f => f.value === item.dataset.fontValue);
      if (fontInfo) ensureFont(fontInfo);
      const obj = this.state[this.activeObj];
      if (obj && 'font' in obj) {
        obj.font = item.dataset.fontValue;
        const familySelect = qs(`#${this.prefix}-font-family`);
        if (familySelect) familySelect.value = item.dataset.fontValue;
      }
      container.querySelectorAll('.font-preview-item').forEach(fi => fi.classList.remove('active'));
      item.classList.add('active');
      this.applyToPreview();
    });
  }

  bindObjSelector() {
    const selector = qs(`#${this.prefix}-obj-selector`);
    if (!selector) return;
    selector.addEventListener('click', (e) => {
      const btn = e.target.closest('.obj-btn');
      if (!btn) return;
      this.activeObj = btn.dataset.obj;
      selector.querySelectorAll('.obj-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this.updateObjView();
    });
  }

  bindPropSelector() {
    const selector = qs(`#${this.prefix}-prop-selector`);
    if (!selector) return;
    selector.addEventListener('click', (e) => {
      const btn = e.target.closest('.prop-btn');
      if (!btn) return;
      this.activeProp = btn.dataset.prop;
      selector.querySelectorAll('.prop-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  }

  bindColorTabs() {
    const tabs = qs(`#${this.prefix}-color-tabs`);
    if (!tabs) return;
    tabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.color-tab');
      if (!tab) return;
      this.activeColorTab = tab.dataset.ctab;
      tabs.querySelectorAll('.color-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const panel = tabs.closest('.editor-panel');
      if (panel) {
        panel.querySelectorAll('.color-section').forEach(s => s.classList.remove('active'));
        const sec = panel.querySelector(`[data-csec="${this.activeColorTab}"]`);
        if (sec) sec.classList.add('active');
      }
      if (this.activeColorTab === 'gradient') {
        this.setCurrentPropType('gradient');
      } else {
        this.setCurrentPropType('solid');
      }
    });
  }

  setCurrentPropType(type) {
    const obj = this.state[this.activeObj];
    if (!obj) return;
    if (this.activeObj === 'image') return;
    if (this.activeObj === 'bg') {
      obj.fill.type = type;
    } else {
      const propState = obj[this.activeProp];
      if (propState) propState.type = type;
    }
    this.applyToPreview();
  }

  bindGradient() {
    const track = qs(`#${this.prefix}-grad-track`);
    const container = qs(`#${this.prefix}-stop-container`);
    const colorInput = qs(`#${this.prefix}-stop-color`);
    const removeBtn = qs(`#${this.prefix}-remove-stop`);
    const angleRange = qs(`#${this.prefix}-ang-range`);
    const angleVal = qs(`#${this.prefix}-ang-val`);

    if (track) {
      track.addEventListener('click', (e) => {
        const rect = track.getBoundingClientRect();
        const pos = Math.round(((e.clientX - rect.left) / rect.width) * 100);
        const newStop = { id: Date.now(), pos, color: '#8E8E93' };
        this.gradientStops.push(newStop);
        this.activeStopId = newStop.id;
        this.renderStops();
        this.applyToPreview();
      });
    }

    if (colorInput) {
      colorInput.addEventListener('input', () => {
        const stop = this.gradientStops.find(s => s.id === this.activeStopId);
        if (stop) { stop.color = colorInput.value; this.renderStops(); this.applyToPreview(); }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        if (this.gradientStops.length <= 2) return;
        this.gradientStops = this.gradientStops.filter(s => s.id !== this.activeStopId);
        this.activeStopId = null;
        this.renderStops();
        this.applyToPreview();
      });
    }

    if (angleRange) {
      angleRange.addEventListener('input', () => {
        this.gradientAngle = Number(angleRange.value);
        if (angleVal) angleVal.textContent = this.gradientAngle;
        this.applyToPreview();
      });
    }
  }

  renderStops() {
    const container = qs(`#${this.prefix}-stop-container`);
    const track = qs(`#${this.prefix}-grad-track`);
    const colorInput = qs(`#${this.prefix}-stop-color`);
    if (!container) return;

    container.innerHTML = '';
    this.gradientStops.forEach(s => {
      const handle = document.createElement('div');
      handle.className = `stop-handle${s.id === this.activeStopId ? ' active-stop' : ''}`;
      handle.style.left = s.pos + '%';
      handle.style.background = s.color;

      const onDown = (startEvent) => {
        startEvent.preventDefault();
        this.activeStopId = s.id;
        if (colorInput) colorInput.value = s.color;
        this.renderStops();

        const trackRect = track.getBoundingClientRect();
        const onMove = (moveEvent) => {
          const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
          s.pos = Math.max(0, Math.min(100, Math.round(((clientX - trackRect.left) / trackRect.width) * 100)));
          handle.style.left = s.pos + '%';
          this.updateGradientTrack();
          this.applyToPreview();
        };
        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          window.removeEventListener('touchmove', onMove);
          window.removeEventListener('touchend', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);
      };

      handle.addEventListener('mousedown', onDown);
      handle.addEventListener('touchstart', onDown, { passive: false });
      container.appendChild(handle);
    });

    this.updateGradientTrack();
  }

  updateGradientTrack() {
    const track = qs(`#${this.prefix}-grad-track`);
    if (!track) return;
    const sorted = [...this.gradientStops].sort((a, b) => a.pos - b.pos);
    track.style.background = `linear-gradient(90deg, ${sorted.map(s => `${s.color} ${s.pos}%`).join(', ')})`;
  }

  getGradientString() {
    const sorted = [...this.gradientStops].sort((a, b) => a.pos - b.pos);
    return `linear-gradient(${this.gradientAngle}deg, ${sorted.map(s => `${s.color} ${s.pos}%`).join(', ')})`;
  }

  applyColor(color) {
    const obj = this.state[this.activeObj];
    if (!obj) return;
    if (this.activeObj === 'image') return;
    if (this.activeObj === 'bg') {
      obj.fill.type = 'solid';
      obj.fill.color = color;
    } else {
      const propState = obj[this.activeProp];
      if (propState) {
        propState.type = 'solid';
        propState.color = color;
      }
    }
    this.applyToPreview();
  }

  generateHarmony(hex) {
    this.applyColor(hex);
    const area = qs(`#${this.prefix}-harmony-result`);
    if (!area) return;
    area.innerHTML = '';
    const { r, g, b } = hexToRgb(hex);
    const tones = [`rgb(${255 - r},${255 - g},${255 - b})`, `rgb(${g},${b},${r})`, `rgb(${b},${r},${g})`, `rgba(${r},${g},${b},0.4)`];
    tones.forEach(t => {
      const box = document.createElement('div');
      box.className = 'harmony-box';
      box.style.backgroundColor = t;
      box.addEventListener('click', () => this.applyColor(t));
      area.appendChild(box);
    });
  }

  bindFontControls() {
    const familySelect = qs(`#${this.prefix}-font-family`);
    const weightSelect = qs(`#${this.prefix}-font-weight`);
    const sizeSelect = qs(`#${this.prefix}-font-size`);

    const onChange = () => {
      const obj = this.state[this.activeObj];
      if (!obj || !('font' in obj)) return;
      if (familySelect) {
        obj.font = familySelect.value;
        const fontInfo = FONT_LIST.find(f => f.value === familySelect.value);
        if (fontInfo) ensureFont(fontInfo);
      }
      if (weightSelect) obj.weight = weightSelect.value;
      if (sizeSelect) obj.size = sizeSelect.value;
      this.applyToPreview();
    };

    familySelect?.addEventListener('change', onChange);
    weightSelect?.addEventListener('change', onChange);
    sizeSelect?.addEventListener('change', onChange);
  }

  bindImageControls() {
    const fileInput = qs(`#${this.prefix}-photo-file`);
    const scaleRange = qs(`#${this.prefix}-img-scale`);
    const offsetRange = qs(`#${this.prefix}-img-offset-y`);
    const opacityRange = qs(`#${this.prefix}-img-opacity`);
    const fitBtns = qsa(`#${this.prefix}-image-controls .fit-btn`);

    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      this.state.image.data = file ? await readFileAsDataURL(file) : '';
      this.applyToPreview();
    });

    scaleRange?.addEventListener('input', () => { this.state.image.scale = Number(scaleRange.value); this.applyToPreview(); });
    offsetRange?.addEventListener('input', () => { this.state.image.offsetY = Number(offsetRange.value); this.applyToPreview(); });
    opacityRange?.addEventListener('input', () => { this.state.image.opacity = Number(opacityRange.value); this.applyToPreview(); });

    fitBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.image.fit = btn.dataset.fit;
        fitBtns.forEach(b => b.classList.toggle('active', b.dataset.fit === this.state.image.fit));
        this.applyToPreview();
      });
    });
  }

  bindPreviewTap() {
    if (!this.previewCard) return;
    this.previewCard.addEventListener('click', (e) => {
      const target = e.target.closest('[data-target]');
      if (!target) return;
      const objName = target.dataset.target;
      this.activeObj = objName;
      const selector = qs(`#${this.prefix}-obj-selector`);
      if (selector) {
        selector.querySelectorAll('.obj-btn').forEach(b => b.classList.toggle('active', b.dataset.obj === objName));
      }
      this.updateObjView();

      // Enable inline editing for text targets
      if (['title', 'subtitle', 'message'].includes(objName)) {
        this.previewCard.querySelectorAll('[data-target]').forEach(el => {
          el.removeAttribute('contenteditable');
          el.classList.remove('target-active');
        });
        target.setAttribute('contenteditable', 'true');
        target.classList.add('target-active');
        target.focus();
      }
    });
  }

  bindResizer() {
    document.querySelectorAll('.resize-handle').forEach(handle => {
      const targetId = handle.dataset.resize;
      if (!targetId) return;
      const container = qs(`#${targetId}`);
      if (!container) return;

      const onStart = (startEvent) => {
        startEvent.preventDefault();
        const startY = startEvent.touches ? startEvent.touches[0].clientY : startEvent.clientY;
        const startH = container.offsetHeight;

        const onMove = (moveEvent) => {
          const clientY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;
          container.style.height = Math.max(150, startH + (clientY - startY)) + 'px';
        };
        const onEnd = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onEnd);
          window.removeEventListener('touchmove', onMove);
          window.removeEventListener('touchend', onEnd);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onEnd);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onEnd);
      };

      handle.addEventListener('mousedown', onStart);
      handle.addEventListener('touchstart', onStart, { passive: false });
    });
  }

  updateObjView() {
    const fontRow = qs(`#${this.prefix}-font-row`);
    const imageControls = qs(`#${this.prefix}-image-controls`);
    const propSelector = qs(`#${this.prefix}-prop-selector`);
    const colorTabs = qs(`#${this.prefix}-color-tabs`);
    const allColorSections = qsa(`#${this.prefix}-solid-section, #${this.prefix}-gradient-section, #${this.prefix}-harmony-section`);

    const isText = ['title', 'subtitle', 'message'].includes(this.activeObj);
    const isImage = this.activeObj === 'image';
    const isBg = this.activeObj === 'bg';

    if (fontRow) fontRow.classList.toggle('hidden', !isText);
    if (imageControls) imageControls.classList.toggle('hidden', !isImage);
    if (propSelector) propSelector.style.display = (isText || isBg) ? '' : 'none';
    if (colorTabs) colorTabs.style.display = isImage ? 'none' : '';
    allColorSections.forEach(s => { if (isImage) s.style.display = 'none'; else s.style.display = ''; });

    // Sync font selectors
    if (isText) {
      const obj = this.state[this.activeObj];
      const familySelect = qs(`#${this.prefix}-font-family`);
      const weightSelect = qs(`#${this.prefix}-font-weight`);
      const sizeSelect = qs(`#${this.prefix}-font-size`);
      if (familySelect && obj.font) familySelect.value = obj.font;
      if (weightSelect && obj.weight) weightSelect.value = obj.weight;
      if (sizeSelect && obj.size) sizeSelect.value = obj.size;
    }

    if (isBg) {
      this.activeProp = 'fill';
      const propBtns = propSelector?.querySelectorAll('.prop-btn');
      propBtns?.forEach(b => b.classList.toggle('active', b.dataset.prop === 'fill'));
    }

    // Highlight target in preview
    this.previewCard?.querySelectorAll('[data-target]').forEach(el => {
      el.classList.toggle('target-active', el.dataset.target === this.activeObj);
    });
  }

  applyToPreview() {
    if (!this.previewCard) return;

    // Text targets
    ['title', 'subtitle', 'message'].forEach(key => {
      const el = this.previewCard.querySelector(`[data-target="${key}"]`);
      if (!el) return;
      const obj = this.state[key];

      el.style.fontFamily = obj.font;
      el.style.fontWeight = obj.weight;
      el.style.fontSize = obj.size + 'px';

      // Fill
      if (obj.fill.type === 'solid') {
        el.style.webkitTextFillColor = obj.fill.color;
        el.style.backgroundImage = 'none';
        el.style.webkitBackgroundClip = '';
      } else {
        el.style.backgroundImage = this.getGradientString();
        el.style.webkitBackgroundClip = 'text';
        el.style.webkitTextFillColor = 'transparent';
      }

      // Stroke
      if (obj.stroke.color && obj.stroke.color !== 'transparent') {
        el.style.webkitTextStroke = `1.5px ${obj.stroke.color}`;
      } else {
        el.style.webkitTextStroke = '';
      }

      // Background
      if (obj.background.color && obj.background.color !== 'transparent') {
        el.style.backgroundColor = obj.background.color;
        el.style.borderRadius = '4px';
        el.style.padding = '2px 4px';
      } else {
        el.style.backgroundColor = '';
      }
    });

    // Image
    const imageZone = this.previewCard.querySelector('[data-target="image"]');
    if (imageZone) {
      const img = this.state.image;
      if (img.data) {
        imageZone.innerHTML = `<img src="${img.data}" alt="" style="
          object-fit: ${img.fit};
          transform: scale(${img.scale / 100}) translateY(${img.offsetY}px);
          opacity: ${img.opacity / 100};
        " />`;
      } else {
        imageZone.innerHTML = '<div class="image-placeholder">Tap to add image</div>';
      }
    }

    // Card BG
    const face = this.previewCard.querySelector('.chariel-card__face');
    if (face) {
      const bgState = this.state.bg;
      if (bgState.fill.type === 'solid') {
        face.style.background = bgState.fill.color;
      } else {
        face.style.background = this.getGradientString();
      }
    }

    this.onStateChange(this.getExportState());
  }

  getExportState() {
    const titleEl = this.previewCard?.querySelector('[data-target="title"]');
    const subtitleEl = this.previewCard?.querySelector('[data-target="subtitle"]');
    const messageEl = this.previewCard?.querySelector('[data-target="message"]');

    return {
      titleText: titleEl?.innerText?.trim() || '',
      subtitleText: subtitleEl?.innerText?.trim() || '',
      messageText: messageEl?.innerText?.trim() || '',
      titleStyle: { ...this.state.title },
      subtitleStyle: { ...this.state.subtitle },
      messageStyle: { ...this.state.message },
      imageData: this.state.image.data,
      imageSettings: { scale: this.state.image.scale, offsetY: this.state.image.offsetY, opacity: this.state.image.opacity, fit: this.state.image.fit },
      bgFill: { ...this.state.bg.fill },
      gradientStops: [...this.gradientStops],
      gradientAngle: this.gradientAngle
    };
  }

  importState(data) {
    if (!data) return;
    if (data.titleStyle) Object.assign(this.state.title, data.titleStyle);
    if (data.subtitleStyle) Object.assign(this.state.subtitle, data.subtitleStyle);
    if (data.messageStyle) Object.assign(this.state.message, data.messageStyle);
    if (data.imageData !== undefined) this.state.image.data = data.imageData;
    if (data.imageSettings) Object.assign(this.state.image, data.imageSettings);
    if (data.bgFill) Object.assign(this.state.bg.fill, data.bgFill);
    if (data.gradientStops) this.gradientStops = data.gradientStops;
    if (data.gradientAngle !== undefined) this.gradientAngle = data.gradientAngle;

    const titleEl = this.previewCard?.querySelector('[data-target="title"]');
    const subtitleEl = this.previewCard?.querySelector('[data-target="subtitle"]');
    const messageEl = this.previewCard?.querySelector('[data-target="message"]');
    if (titleEl && data.titleText) titleEl.textContent = data.titleText;
    if (subtitleEl && data.subtitleText) subtitleEl.textContent = data.subtitleText;
    if (messageEl && data.messageText) messageEl.textContent = data.messageText;

    this.renderStops();
    this.applyToPreview();
  }
}
