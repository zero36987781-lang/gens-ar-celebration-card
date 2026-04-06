// src/js/sender/canvas-editor.js
// Full canvas editor with Fill/Stroke/BG modes, Solid/Gradient/Harmony color tabs,
// text CRUD, image (background + insert) with resize & opacity, touch-first UX.

const CanvasEditor = (() => {
  /* ─── State ─── */
  let layers = { front: [], back: [] };
  let activeSide = 'front';
  let selectedId = null;
  let nextId = 1;

  // Color engine state (per-layer, but shared UI)
  let colorMode = 'fill'; // fill | stroke | bg
  let activeTab = 0;      // 0=solid 1=gradient 2=harmony 3=props
  let gradientStops = [
    { id: 1, pos: 0, color: '#007AFF' },
    { id: 2, pos: 100, color: '#AF52DE' }
  ];
  let gradientAngle = 135;
  let activeStopId = null;

  const colors = [
    '#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6',
    '#AF52DE', '#FF2D55', '#FFFFFF', '#1C1C1E', '#8E8E93', '#C7C7CC',
    '#0A84FF', '#30D158', '#FFD60A', '#FF6482', '#BF5AF2', '#64D2FF',
    '#AC8E68', '#2C2C2E', '#48484A', '#636366', '#D1D1D6', '#F2F2F7'
  ];

  /* ─── DOM refs ─── */
  const $ = (id) => document.getElementById(id);
  const els = {};

  function cacheDom() {
    els.stageFront = $('canvas-stage-front');
    els.stageBack = $('canvas-stage-back');
    els.toolbar = $('canvas-toolbar');
    els.solidGrid = $('solidGrid');
    els.palGrid = $('palGrid');
    els.harmonyArea = $('harmonyArea');
    els.gradTrack = $('gradTrack');
    els.stopContainer = $('stopContainer');
    els.stopSettings = $('stopSettings');
    els.stopColorInput = $('stopColorInput');
    els.angRange = $('angRange');
    els.angVal = $('angVal');
    els.scaleSlider = $('scale-slider');
    els.opacitySlider = $('opacity-slider');
    els.imgWidthSlider = $('img-width-slider');
    els.imageProps = $('image-props');
    els.btnDel = $('btn-delete-layer');
    els.btnDup = $('btn-duplicate-layer');
    els.btnAddText = $('btn-add-text');
    els.btnAddBg = $('btn-add-bg');
    els.btnAddImg = $('btn-add-img');
    els.bgFileInput = $('bg-file-input');
    els.imgFileInput = $('img-file-input');
    els.btnRemoveStop = $('btn-remove-stop');
  }

  /* ─── Helpers ─── */
  function uid() { return String(nextId++); }

  function getStage(side) {
    return side === 'front' ? els.stageFront : els.stageBack;
  }

  function selectedLayer() {
    if (!selectedId) return null;
    return layers[activeSide].find(l => l.id === selectedId) || null;
  }

  function buildGradientCSS(stops, angle) {
    const sorted = [...stops].sort((a, b) => a.pos - b.pos);
    return `linear-gradient(${angle}deg, ${sorted.map(s => `${s.color} ${s.pos}%`).join(', ')})`;
  }

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const v = parseInt(n, 16);
    return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  /* ─── Init ─── */
  function init() {
    cacheDom();
    if (!els.stageFront) return;

    // Default layers
    layers = {
      front: [
        { id: uid(), type: 'text', text: 'Happy Birthday', x: 20, y: 40, fontSize: 34, opacity: 1, fillType: 'solid', fillColor: '#FFFFFF', strokeColor: 'transparent', gradStops: null, gradAngle: 135, side: 'front' },
        { id: uid(), type: 'text', text: 'Wishing you joy and laughter.', x: 20, y: 180, fontSize: 17, opacity: 1, fillType: 'solid', fillColor: 'rgba(255,255,255,0.88)', strokeColor: 'transparent', gradStops: null, gradAngle: 135, side: 'front' }
      ],
      back: [
        { id: uid(), type: 'text', text: 'Thank you for everything.', x: 20, y: 50, fontSize: 20, opacity: 1, fillType: 'solid', fillColor: '#FFFFFF', strokeColor: 'transparent', gradStops: null, gradAngle: 135, side: 'back' }
      ]
    };

    buildSwatches();
    bindToolbar();
    bindTabs();
    bindModeSelector();
    bindPropertySliders();
    bindGradientEngine();
    bindFileInputs();
    renderLayers();
  }

  /* ─── Swatch grids ─── */
  function buildSwatches() {
    els.solidGrid.innerHTML = '';
    els.palGrid.innerHTML = '';
    colors.forEach(c => {
      els.solidGrid.appendChild(makeSwatch(c, handleSolidPick));
      els.palGrid.appendChild(makeSwatch(c, handleHarmonyBase));
    });
  }

  function makeSwatch(color, handler) {
    const d = document.createElement('div');
    d.className = 'swatch';
    d.style.backgroundColor = color;
    d.addEventListener('click', () => {
      d.closest('.cgrid').querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
      d.classList.add('selected');
      handler(color);
    });
    return d;
  }

  /* ─── Color handlers ─── */
  function handleSolidPick(color) {
    const layer = selectedLayer();
    if (!layer) return;

    if (colorMode === 'fill') {
      layer.fillType = 'solid';
      layer.fillColor = color;
    } else if (colorMode === 'stroke') {
      layer.strokeColor = color;
    } else if (colorMode === 'bg') {
      // Apply to the card background, not a layer
      applyCardBackground('solid', color);
    }
    renderLayers();
  }

  function handleHarmonyBase(hex) {
    const { r, g, b } = hexToRgb(hex);
    const tones = [
      `rgb(${255 - r},${255 - g},${255 - b})`,
      `rgb(${g},${b},${r})`,
      `rgb(${b},${r},${g})`,
      `rgba(${r},${g},${b},0.4)`
    ];
    els.harmonyArea.innerHTML = '';
    tones.forEach(t => {
      const box = document.createElement('div');
      box.className = 'harmony-box';
      box.style.backgroundColor = t;
      box.addEventListener('click', () => handleSolidPick(t));
      els.harmonyArea.appendChild(box);
    });
    // Also apply base color immediately
    handleSolidPick(hex);
  }

  function applyGradientToSelected() {
    const layer = selectedLayer();
    if (!layer) return;

    const css = buildGradientCSS(gradientStops, gradientAngle);

    if (colorMode === 'fill') {
      layer.fillType = 'gradient';
      layer.gradStops = JSON.parse(JSON.stringify(gradientStops));
      layer.gradAngle = gradientAngle;
    } else if (colorMode === 'bg') {
      applyCardBackground('gradient', css);
    }
    renderLayers();
  }

  function applyCardBackground(type, value) {
    const stage = getStage(activeSide);
    if (type === 'solid') {
      stage.style.background = `linear-gradient(145deg, ${value}, ${value})`;
    } else {
      stage.style.background = value;
    }
  }

  /* ─── Gradient engine ─── */
  function bindGradientEngine() {
    els.gradTrack.addEventListener('click', (e) => {
      const r = els.gradTrack.getBoundingClientRect();
      const pos = Math.round(((e.clientX - r.left) / r.width) * 100);
      gradientStops.push({ id: Date.now(), pos, color: '#8E8E93' });
      activeStopId = gradientStops[gradientStops.length - 1].id;
      renderStops();
      applyGradientToSelected();
    });

    // Touch support for gradient track
    els.gradTrack.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const r = els.gradTrack.getBoundingClientRect();
      const pos = Math.round(((touch.clientX - r.left) / r.width) * 100);
      gradientStops.push({ id: Date.now(), pos, color: '#8E8E93' });
      activeStopId = gradientStops[gradientStops.length - 1].id;
      renderStops();
      applyGradientToSelected();
    }, { passive: false });

    els.stopColorInput.addEventListener('input', (e) => {
      const stop = gradientStops.find(s => s.id === activeStopId);
      if (stop) {
        stop.color = e.target.value;
        renderStops();
        applyGradientToSelected();
      }
    });

    els.btnRemoveStop.addEventListener('click', () => {
      if (gradientStops.length <= 2) return;
      gradientStops = gradientStops.filter(s => s.id !== activeStopId);
      activeStopId = null;
      els.stopSettings.classList.add('hidden');
      renderStops();
      applyGradientToSelected();
    });

    els.angRange.addEventListener('input', () => {
      gradientAngle = Number(els.angRange.value);
      els.angVal.textContent = gradientAngle;
      renderStops();
      applyGradientToSelected();
    });
  }

  function renderStops() {
    els.stopContainer.innerHTML = '';
    gradientStops.forEach(s => {
      const h = document.createElement('div');
      h.className = 'stop-handle';
      h.style.left = s.pos + '%';
      h.style.backgroundColor = s.color;
      if (s.id === activeStopId) h.classList.add('active-stop');

      // Pointer (mouse) drag
      const startDrag = (startX) => {
        activeStopId = s.id;
        els.stopSettings.classList.remove('hidden');
        els.stopColorInput.value = s.color;

        const move = (clientX) => {
          const r = els.gradTrack.getBoundingClientRect();
          s.pos = Math.max(0, Math.min(100, Math.round(((clientX - r.left) / r.width) * 100)));
          h.style.left = s.pos + '%';
          updateGradTrackVisual();
          applyGradientToSelected();
        };

        const upMouse = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', upMouse);
        };
        const onMouseMove = (e) => move(e.clientX);

        const upTouch = () => {
          window.removeEventListener('touchmove', onTouchMove);
          window.removeEventListener('touchend', upTouch);
        };
        const onTouchMove = (e) => { e.preventDefault(); move(e.touches[0].clientX); };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', upMouse);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', upTouch);
      };

      h.addEventListener('mousedown', (e) => { e.stopPropagation(); startDrag(e.clientX); });
      h.addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); startDrag(e.touches[0].clientX); }, { passive: false });

      h.addEventListener('click', (e) => {
        e.stopPropagation();
        activeStopId = s.id;
        els.stopSettings.classList.remove('hidden');
        els.stopColorInput.value = s.color;
        renderStops();
      });

      els.stopContainer.appendChild(h);
    });

    updateGradTrackVisual();
  }

  function updateGradTrackVisual() {
    const sorted = [...gradientStops].sort((a, b) => a.pos - b.pos);
    els.gradTrack.style.background = `linear-gradient(90deg, ${sorted.map(s => `${s.color} ${s.pos}%`).join(', ')})`;
  }

  /* ─── Mode selector (Fill/Stroke/BG) ─── */
  function bindModeSelector() {
    document.querySelectorAll('#canvas-toolbar .obj-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#canvas-toolbar .obj-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        colorMode = btn.dataset.mode;
      });
    });
  }

  /* ─── Tabs ─── */
  function bindTabs() {
    document.querySelectorAll('#canvas-toolbar .ctab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('#canvas-toolbar .ctab').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('#canvas-toolbar .canvas-section').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        activeTab = Number(t.dataset.tab);
        const sec = $(`csec${activeTab}`);
        if (sec) sec.classList.add('active');
      });
    });
  }

  /* ─── Property sliders ─── */
  function bindPropertySliders() {
    els.opacitySlider.addEventListener('input', (e) => {
      const layer = selectedLayer();
      if (layer) {
        layer.opacity = parseFloat(e.target.value);
        renderLayers();
      }
    });

    els.scaleSlider.addEventListener('input', (e) => {
      const layer = selectedLayer();
      if (!layer) return;
      const val = parseFloat(e.target.value);
      if (layer.type === 'text') {
        layer.fontSize = val;
      } else if (layer.type === 'image') {
        layer.width = val;
      }
      renderLayers();
    });

    els.imgWidthSlider.addEventListener('input', (e) => {
      const layer = selectedLayer();
      if (layer && layer.type === 'image') {
        layer.width = parseFloat(e.target.value);
        renderLayers();
      }
    });
  }

  /* ─── Toolbar buttons ─── */
  function bindToolbar() {
    els.btnAddText.addEventListener('click', () => {
      const id = uid();
      layers[activeSide].push({
        id, type: 'text', text: 'New Text',
        x: 30, y: 80 + layers[activeSide].length * 30,
        fontSize: 24, opacity: 1,
        fillType: 'solid', fillColor: '#FFFFFF',
        strokeColor: 'transparent',
        gradStops: null, gradAngle: 135,
        side: activeSide
      });
      selectedId = id;
      renderLayers();
      syncSlidersToLayer();
    });

    els.btnDel.addEventListener('click', () => {
      if (!selectedId) return;
      layers[activeSide] = layers[activeSide].filter(l => l.id !== selectedId);
      selectedId = null;
      renderLayers();
      updateButtonStates();
    });

    els.btnDup.addEventListener('click', () => {
      const layer = selectedLayer();
      if (!layer) return;
      const id = uid();
      const dup = { ...JSON.parse(JSON.stringify(layer)), id, x: layer.x + 15, y: layer.y + 15 };
      layers[activeSide].push(dup);
      selectedId = id;
      renderLayers();
    });

    els.btnAddBg.addEventListener('click', () => els.bgFileInput.click());
    els.btnAddImg.addEventListener('click', () => els.imgFileInput.click());
  }

  /* ─── File inputs ─── */
  function bindFileInputs() {
    els.bgFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const dataUrl = await readFileAsDataURL(file);

      // Remove existing bg layer on this side
      layers[activeSide] = layers[activeSide].filter(l => l.type !== 'background');

      layers[activeSide].unshift({
        id: uid(), type: 'background', src: dataUrl,
        opacity: 1, side: activeSide
      });
      renderLayers();
      e.target.value = '';
    });

    els.imgFileInput.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const dataUrl = await readFileAsDataURL(file);
      const id = uid();
      layers[activeSide].push({
        id, type: 'image', src: dataUrl,
        x: 30, y: 60, width: 200, opacity: 1, side: activeSide
      });
      selectedId = id;
      renderLayers();
      syncSlidersToLayer();
      e.target.value = '';
    });
  }

  /* ─── Sync sliders to selected layer ─── */
  function syncSlidersToLayer() {
    const layer = selectedLayer();
    if (!layer) return;
    els.opacitySlider.value = layer.opacity ?? 1;
    if (layer.type === 'text') {
      els.scaleSlider.value = layer.fontSize || 24;
      els.scaleSlider.closest('.glass-field').querySelector('span').textContent = 'Font Size';
      els.imageProps.classList.add('hidden');
    } else if (layer.type === 'image') {
      els.scaleSlider.value = layer.width || 200;
      els.scaleSlider.closest('.glass-field').querySelector('span').textContent = 'Size';
      els.imageProps.classList.remove('hidden');
      els.imgWidthSlider.value = layer.width || 200;
    } else {
      els.imageProps.classList.add('hidden');
    }
  }

  function updateButtonStates() {
    const hasSelection = !!selectedId;
    els.btnDel.disabled = !hasSelection;
    els.btnDup.disabled = !hasSelection;
  }

  /* ─── Render all layers ─── */
  function renderLayers() {
    ['front', 'back'].forEach(side => {
      const stage = getStage(side);
      if (!stage) return;

      // Remove rendered layers (keep fixed bottom & glow)
      Array.from(stage.children).forEach(child => {
        if (!child.classList.contains('canvas-fixed-bottom') && !child.classList.contains('chariel-card__glow')) {
          child.remove();
        }
      });

      layers[side].forEach(layer => {
        if (layer.type === 'background') {
          renderBackgroundLayer(stage, layer);
        } else if (layer.type === 'text') {
          renderTextLayer(stage, layer);
        } else if (layer.type === 'image') {
          renderImageLayer(stage, layer);
        }
      });
    });

    updateButtonStates();
  }

  /* ─── Background layer ─── */
  function renderBackgroundLayer(stage, layer) {
    const div = document.createElement('div');
    div.className = 'bg-layer';
    div.style.backgroundImage = `url(${layer.src})`;
    div.style.opacity = layer.opacity ?? 1;
    div.dataset.layerId = layer.id;

    // Tap to select background for opacity adjustment
    div.style.pointerEvents = 'auto';
    div.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      selectedId = layer.id;
      renderLayers();
      syncSlidersToLayer();
      // Switch to properties tab
      switchToTab(3);
    });

    if (layer.id === selectedId) div.classList.add('selected-bg');

    // Insert before fixed-bottom
    const fixedBottom = stage.querySelector('.canvas-fixed-bottom');
    stage.insertBefore(div, fixedBottom);
  }

  /* ─── Text layer ─── */
  function renderTextLayer(stage, layer) {
    const dom = document.createElement('div');
    dom.className = `canvas-layer text-layer ${layer.id === selectedId ? 'selected' : ''}`;
    dom.style.transform = `translate(${layer.x}px, ${layer.y}px)`;
    dom.style.opacity = layer.opacity ?? 1;
    dom.style.fontSize = `${layer.fontSize || 24}px`;
    dom.style.fontWeight = '800';
    dom.style.lineHeight = '1.15';
    dom.style.letterSpacing = '-0.02em';
    dom.dataset.layerId = layer.id;

    // Fill
    if (layer.fillType === 'gradient' && layer.gradStops) {
      const css = buildGradientCSS(layer.gradStops, layer.gradAngle || 135);
      dom.style.background = css;
      dom.style.webkitBackgroundClip = 'text';
      dom.style.webkitTextFillColor = 'transparent';
      dom.style.backgroundClip = 'text';
    } else {
      dom.style.color = layer.fillColor || '#FFFFFF';
      dom.style.webkitTextFillColor = '';
      dom.style.background = '';
    }

    // Stroke
    if (layer.strokeColor && layer.strokeColor !== 'transparent') {
      dom.style.webkitTextStroke = `1.5px ${layer.strokeColor}`;
    }

    dom.textContent = layer.text;

    // If selected, make editable
    if (layer.id === selectedId) {
      dom.contentEditable = 'true';
      dom.spellcheck = false;
    }

    dom.addEventListener('input', () => { layer.text = dom.innerText; });
    dom.addEventListener('blur', () => { layer.text = dom.innerText; window.getSelection()?.removeAllRanges(); });

    // Append resize handle
    if (layer.id === selectedId) {
      const handle = document.createElement('div');
      handle.className = 'resize-handle-layer';
      bindPinchResize(handle, layer, 'fontSize');
      dom.appendChild(handle);
    }

    bindLayerPointer(dom, layer);

    const fixedBottom = stage.querySelector('.canvas-fixed-bottom');
    stage.insertBefore(dom, fixedBottom);
  }

  /* ─── Image layer ─── */
  function renderImageLayer(stage, layer) {
    const dom = document.createElement('div');
    dom.className = `canvas-layer image-layer ${layer.id === selectedId ? 'selected' : ''}`;
    dom.style.transform = `translate(${layer.x}px, ${layer.y}px)`;
    dom.style.opacity = layer.opacity ?? 1;
    dom.style.width = `${layer.width || 200}px`;
    dom.dataset.layerId = layer.id;

    const img = document.createElement('img');
    img.src = layer.src;
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.borderRadius = '8px';
    img.style.pointerEvents = 'none';
    img.draggable = false;
    dom.appendChild(img);

    // Resize handle
    if (layer.id === selectedId) {
      const handle = document.createElement('div');
      handle.className = 'resize-handle-layer';
      bindPinchResize(handle, layer, 'width');
      dom.appendChild(handle);
    }

    bindLayerPointer(dom, layer);

    const fixedBottom = stage.querySelector('.canvas-fixed-bottom');
    stage.insertBefore(dom, fixedBottom);
  }

  /* ─── Pointer / Touch handling for layer drag ─── */
  function bindLayerPointer(dom, layer) {
    let isDragging = false;
    let startX, startY, initX, initY;
    let pinchStartDist = 0;
    let pinchStartVal = 0;

    const onDown = (clientX, clientY, e) => {
      e.stopPropagation();

      // Select
      if (selectedId !== layer.id) {
        selectedId = layer.id;
        renderLayers();
        syncSlidersToLayer();
        return; // first tap = select only
      }

      // If text and already selected, allow editing (don't drag)
      if (layer.type === 'text' && dom.contentEditable === 'true') {
        // Check if user tapped inside text content — let native editing work
        return;
      }

      isDragging = true;
      startX = clientX;
      startY = clientY;
      initX = layer.x;
      initY = layer.y;
    };

    const onMove = (clientX, clientY) => {
      if (!isDragging) return;
      layer.x = initX + (clientX - startX);
      layer.y = initY + (clientY - startY);
      dom.style.transform = `translate(${layer.x}px, ${layer.y}px)`;
    };

    const onUp = () => { isDragging = false; };

    // Mouse events
    dom.addEventListener('mousedown', (e) => onDown(e.clientX, e.clientY, e));
    window.addEventListener('mousemove', (e) => { if (isDragging) { e.preventDefault(); onMove(e.clientX, e.clientY); } });
    window.addEventListener('mouseup', onUp);

    // Touch events
    dom.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        onDown(e.touches[0].clientX, e.touches[0].clientY, e);
      } else if (e.touches.length === 2) {
        // Pinch to resize
        isDragging = false;
        pinchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchStartVal = layer.type === 'text' ? (layer.fontSize || 24) : (layer.width || 200);
      }
    }, { passive: false });

    dom.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && isDragging) {
        e.preventDefault();
        onMove(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2 && pinchStartDist > 0) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const scale = dist / pinchStartDist;
        const newVal = Math.max(10, Math.min(800, Math.round(pinchStartVal * scale)));
        if (layer.type === 'text') {
          layer.fontSize = newVal;
        } else if (layer.type === 'image') {
          layer.width = newVal;
        }
        renderLayers();
        syncSlidersToLayer();
      }
    }, { passive: false });

    dom.addEventListener('touchend', (e) => {
      if (e.touches.length === 0) {
        isDragging = false;
        pinchStartDist = 0;
      }
    });

    // Double-tap to edit text
    if (layer.type === 'text') {
      let lastTap = 0;
      dom.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTap < 300) {
          dom.contentEditable = 'true';
          dom.focus();
        }
        lastTap = now;
      });
    }
  }

  /* ─── Corner resize handle (drag) ─── */
  function bindPinchResize(handle, layer, prop) {
    let startX, startVal;

    const onDown = (clientX, e) => {
      e.stopPropagation();
      e.preventDefault();
      startX = clientX;
      startVal = layer[prop] || (prop === 'fontSize' ? 24 : 200);

      const onMove = (cx) => {
        const delta = cx - startX;
        layer[prop] = Math.max(10, Math.min(800, Math.round(startVal + delta)));
        renderLayers();
        syncSlidersToLayer();
      };

      const onUp = () => {
        window.removeEventListener('mousemove', mm);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchmove', tm);
        window.removeEventListener('touchend', onUp);
      };

      const mm = (e) => onMove(e.clientX);
      const tm = (e) => { e.preventDefault(); onMove(e.touches[0].clientX); };

      window.addEventListener('mousemove', mm);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', tm, { passive: false });
      window.addEventListener('touchend', onUp);
    };

    handle.addEventListener('mousedown', (e) => onDown(e.clientX, e));
    handle.addEventListener('touchstart', (e) => onDown(e.touches[0].clientX, e), { passive: false });
  }

  /* ─── Deselect on stage click ─── */
  function bindDeselect() {
    document.addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('canvas-stage') || e.target.classList.contains('canvas-fixed-bottom')) {
        selectedId = null;
        renderLayers();
        updateButtonStates();
      }
    });
  }

  /* ─── Tab switch helper ─── */
  function switchToTab(idx) {
    document.querySelectorAll('#canvas-toolbar .ctab').forEach((t, i) => t.classList.toggle('active', i === idx));
    document.querySelectorAll('#canvas-toolbar .canvas-section').forEach((s, i) => s.classList.toggle('active', i === idx));
    activeTab = idx;
  }

  /* ─── Public API ─── */
  function switchSide(side) {
    activeSide = side;
    selectedId = null;
    renderLayers();
    updateButtonStates();
  }

  function getLayers() {
    return JSON.parse(JSON.stringify(layers));
  }

  function setLayersFromData(data) {
    if (data && data.front) layers.front = data.front;
    if (data && data.back) layers.back = data.back;
    renderLayers();
  }

  // Delayed init: call after DOM ready
  function boot() {
    init();
    bindDeselect();
  }

  return {
    init: boot,
    switchSide,
    getLayers,
    setLayersFromData
  };
})();

window.CanvasEditor = CanvasEditor;
