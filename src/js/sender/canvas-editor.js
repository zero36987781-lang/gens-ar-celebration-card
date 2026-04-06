// src/js/sender/canvas-editor.js

const CanvasEditor = (() => {
  let layers = {
    front: [
      { id: '1', type: 'text', text: 'Happy Birthday', x: 20, y: 50, scale: 34, opacity: 1, color: '#1C1C1E', side: 'front' }
    ],
    back: [
      { id: '2', type: 'text', text: 'Thanks for everything!', x: 20, y: 50, scale: 20, opacity: 1, color: '#1C1C1E', side: 'back' }
    ]
  };
  let activeSide = 'front';
  let selectedId = null;
  let currentColor = '#1C1C1E';
  let mode = 'fill'; // fill or stroke

  const els = {
    stageFront: document.getElementById('canvas-stage-front'),
    stageBack: document.getElementById('canvas-stage-back'),
    toolbar: document.getElementById('canvas-toolbar'),
    solidGrid: document.getElementById('solidGrid'),
    scaleSlider: document.getElementById('scale-slider'),
    opacitySlider: document.getElementById('opacity-slider'),
    btnDel: document.getElementById('btn-delete-layer'),
    btnAddText: document.getElementById('btn-add-text')
  };

  const colors = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FFFFFF', '#1C1C1E', '#8E8E93', '#C7C7CC'];

  let dragContext = null;

  function init() {
    if (!els.stageFront) return;
    
    // Build Swatches
    els.solidGrid.innerHTML = '';
    colors.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'swatch';
      sw.style.backgroundColor = c;
      sw.addEventListener('click', () => {
        document.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
        currentColor = c;
        updateSelectedProperty(mode === 'fill' ? 'color' : 'strokeColor', c);
      });
      els.solidGrid.appendChild(sw);
    });

    els.btnAddText.addEventListener('click', () => {
      const newLayer = {
        id: Date.now().toString(),
        type: 'text', text: 'New Text',
        x: 40, y: 40, scale: 24, opacity: 1, color: currentColor, side: activeSide
      };
      layers[activeSide].push(newLayer);
      selectedId = newLayer.id;
      renderLayers();
    });

    els.btnDel.addEventListener('click', () => {
      if (!selectedId) return;
      layers[activeSide] = layers[activeSide].filter(l => l.id !== selectedId);
      selectedId = null;
      renderLayers();
    });

    els.scaleSlider.addEventListener('input', (e) => updateSelectedProperty('scale', parseFloat(e.target.value)));
    els.opacitySlider.addEventListener('input', (e) => updateSelectedProperty('opacity', parseFloat(e.target.value)));

    // Tabs
    document.querySelectorAll('.ctab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('.ctab').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.canvas-section').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        document.getElementById(`csec${t.dataset.tab}`).classList.add('active');
      });
    });

    // Object Mode (Fill/Stroke)
    document.querySelectorAll('.obj-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.obj-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        mode = btn.dataset.mode;
      });
    });
    
    // Deselect if clicking raw stage
    document.addEventListener('pointerdown', (e) => {
      if (e.target.classList.contains('canvas-stage')) {
        selectedId = null;
        renderLayers();
      }
    });

    renderLayers();
  }

  function renderLayers() {
    [els.stageFront, els.stageBack].forEach(stage => {
      if (!stage) return;
      Array.from(stage.children).forEach(child => {
        if (!child.classList.contains('canvas-fixed-bottom') && !child.classList.contains('bg-layer') && !child.classList.contains('chariel-card__glow')) {
          child.remove();
        }
      });
    });

    ['front', 'back'].forEach(side => {
      const stage = side === 'front' ? els.stageFront : els.stageBack;
      layers[side].forEach(layer => {
        const dom = document.createElement('div');
        dom.className = `canvas-layer ${layer.type}-layer ${layer.id === selectedId ? 'selected' : ''}`;
        dom.style.transform = `translate(${layer.x}px, ${layer.y}px)`;
        dom.style.opacity = layer.opacity !== undefined ? layer.opacity : 1;
        
        if (layer.type === 'text') {
          dom.textContent = layer.text;
          dom.contentEditable = layer.id === selectedId; // only editable if selected
          dom.style.fontSize = `${layer.scale}px`;
          dom.style.color = layer.color || '#1C1C1E';
          if (layer.strokeColor) {
            dom.style.webkitTextStroke = `1.5px ${layer.strokeColor}`;
          }
          
          dom.addEventListener('blur', () => {
            layer.text = dom.innerText;
            window.getSelection().removeAllRanges();
          });
          dom.addEventListener('input', () => {
            layer.text = dom.innerText;
          });
        }
        
        dom.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          selectedId = layer.id;
          els.scaleSlider.value = layer.scale;
          els.opacitySlider.value = layer.opacity !== undefined ? layer.opacity : 1;
          renderLayers(); // re-render to show selection box
          
          // If already selected and it's text, allow native text selection
          if (dom.contentEditable === 'true') return;
          
          dragContext = { layer, startX: e.clientX, startY: e.clientY, initX: layer.x, initY: layer.y };
          document.addEventListener('pointermove', handlePointerMove);
          document.addEventListener('pointerup', handlePointerUp);
        });

        stage.appendChild(dom);
      });
    });
    
    els.btnDel.disabled = !selectedId;
  }

  function handlePointerMove(e) {
    if (!dragContext) return;
    e.preventDefault();
    const dx = e.clientX - dragContext.startX;
    const dy = e.clientY - dragContext.startY;
    dragContext.layer.x = dragContext.initX + dx;
    dragContext.layer.y = dragContext.initY + dy;
    
    // We update inline styles directly instead of calling renderLayers to save performance
    const targetEl = document.querySelector(`.canvas-layer.selected`);
    if (targetEl) targetEl.style.transform = `translate(${dragContext.layer.x}px, ${dragContext.layer.y}px)`;
  }

  function handlePointerUp() {
    dragContext = null;
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
    renderLayers(); // sync formal state
  }

  function updateSelectedProperty(prop, value) {
    if (!selectedId) return;
    const layer = layers[activeSide].find(l => l.id === selectedId);
    if (layer) {
      layer[prop] = value;
      renderLayers();
    }
  }

  function switchSide(side) {
    activeSide = side;
    selectedId = null;
    renderLayers();
  }

  return {
    init,
    switchSide,
    getLayers: () => JSON.parse(JSON.stringify(layers))
  };
})();

window.CanvasEditor = CanvasEditor;
