const CanvasEditor = (() => {
  let layers = { front: [], back: [] };
  let activeSide = 'front';
  let selectedId = null;
  let nextId = 100;
  let colorMode = 'fill';
  let gradientStops = [
    { id:1, pos:0, color:'#007AFF' },
    { id:2, pos:100, color:'#AF52DE' }
  ];
  let gradientAngle = 135;
  let activeStopId = null;
  let _initialized = false;
  let _drag = null;
  let _pinch = null;

  const colors = [
    '#FF3B30','#FF9500','#FFCC00','#34C759','#007AFF','#5856D6',
    '#AF52DE','#FF2D55','#FFFFFF','#1C1C1E','#8E8E93','#C7C7CC',
    '#0A84FF','#30D158','#FFD60A','#FF6482','#BF5AF2','#64D2FF',
    '#AC8E68','#2C2C2E','#48484A','#636366','#D1D1D6','#F2F2F7'
  ];

  const $ = id => document.getElementById(id);
  const els = {};

  function cacheDom() {
    els.stageFront = $('canvas-stage-front');
    els.stageBack = $('canvas-stage-back');
    els.solidGrid = $('solidGrid');
    els.palGrid = $('palGrid');
    els.harmonyArea = $('harmonyArea');
    els.gradTrack = $('gradTrack');
    els.stopContainer = $('stopContainer');
    els.stopSettings = $('stopSettings');
    els.stopColorInput = $('stopColorInput');
    els.angRange = $('angRange');
    els.angVal = $('angVal');
    els.btnAddText = $('btn-add-text');
    els.btnAddBg = $('btn-add-bg');
    els.btnAddImg = $('btn-add-img');
    els.bgFileInput = $('bg-file-input');
    els.imgFileInput = $('img-file-input');
    els.btnRemoveStop = $('btn-remove-stop');
    els.ctxBar = $('ctx-bar');
    els.ctxOpacity = $('ctx-opacity-slider');
    els.ctxDup = $('ctx-dup');
    els.ctxDel = $('ctx-del');
  }

  function uid() { return String(nextId++); }
  function stg(side) { return side === 'front' ? els.stageFront : els.stageBack; }
  function sel() { return selectedId ? (layers[activeSide].find(l => l.id === selectedId) || null) : null; }

  function gradCSS(stops, ang) {
    const s = [...stops].sort((a,b) => a.pos - b.pos);
    return `linear-gradient(${ang}deg, ${s.map(x => `${x.color} ${x.pos}%`).join(', ')})`;
  }
  function hexRgb(hex) {
    const h = hex.replace('#','');
    const n = h.length===3 ? h.split('').map(c=>c+c).join('') : h;
    const v = parseInt(n,16);
    return {r:(v>>16)&255,g:(v>>8)&255,b:v&255};
  }
  function readFile(file) {
    return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
  }

  /* ── Init ── */
  function init() {
    if (_initialized) return;
    cacheDom();
    if (!els.stageFront) return;
    _initialized = true;
    resetDefaultLayers();
    buildSwatches();
    bindToolbar();
    bindGradient();
    bindFileInputs();
    bindCtxBar();
    bindColorModeButtons();
    bindGlobalPointer();
    renderLayers();
  }

  function resetDefaultLayers() {
    layers = {
      front: [
        { id:uid(),type:'text',text:'Happy Birthday',x:16,y:28,fontSize:28,opacity:1,fillType:'solid',fillColor:'#FFFFFF',strokeColor:'transparent',gradStops:null,gradAngle:135 },
        { id:uid(),type:'text',text:'A bright surprise for your special day.',x:16,y:66,fontSize:12,opacity:0.88,fillType:'solid',fillColor:'rgba(255,255,255,0.88)',strokeColor:'transparent',gradStops:null,gradAngle:135 },
        { id:uid(),type:'text',text:'Happy Birthday! Wishing you joy,\nlaughter, and a beautiful year ahead.',x:16,y:100,fontSize:13,opacity:1,fillType:'solid',fillColor:'#FFFFFF',strokeColor:'transparent',gradStops:null,gradAngle:135 },
        { id:uid(),type:'text',text:'From Sender',x:16,y:260,fontSize:12,opacity:0.9,fillType:'solid',fillColor:'rgba(255,255,255,0.9)',strokeColor:'transparent',gradStops:null,gradAngle:135 }
      ],
      back: [
        { id:uid(),type:'text',text:'Back side',x:16,y:24,fontSize:11,opacity:0.7,fillType:'solid',fillColor:'rgba(255,255,255,0.7)',strokeColor:'transparent',gradStops:null,gradAngle:135 },
        { id:uid(),type:'text',text:'Thank you for being such a\nspecial part of my life.',x:16,y:60,fontSize:14,opacity:1,fillType:'solid',fillColor:'#FFFFFF',strokeColor:'transparent',gradStops:null,gradAngle:135 }
      ]
    };
  }

  function applyTemplateToLayers(tpl) {
    const f = layers.front;
    if (f[0]) f[0].text = tpl.title || 'Title';
    if (f[1]) f[1].text = tpl.subtitle || '';
    if (f[2]) f[2].text = tpl.message || '';
    const b = layers.back;
    if (b[1]) b[1].text = tpl.backText || '';
    renderLayers();
  }

  function updateSenderReceiver(sender) {
    const f = layers.front;
    if (f[3]) f[3].text = `From ${sender || 'Sender'}`;
    renderLayers();
  }

  /* ── Swatches ── */
  function buildSwatches() {
    if (!els.solidGrid || !els.palGrid) return;
    els.solidGrid.innerHTML = '';
    els.palGrid.innerHTML = '';
    colors.forEach(c => {
      els.solidGrid.appendChild(mkSwatch(c, onSolidPick));
      els.palGrid.appendChild(mkSwatch(c, onHarmonyBase));
    });
  }

  function mkSwatch(color, handler) {
    const d = document.createElement('div');
    d.className = 'swatch';
    d.style.backgroundColor = color;
    d.addEventListener('click', () => {
      d.closest('.cgrid')?.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
      d.classList.add('selected');
      handler(color);
    });
    return d;
  }

  function onSolidPick(color) {
    if (colorMode === 'bg') { applyBg(color); return; }
    const layer = sel();
    if (!layer) return;
    if (colorMode === 'fill') { layer.fillType = 'solid'; layer.fillColor = color; }
    else if (colorMode === 'stroke') { layer.strokeColor = color; }
    renderLayers();
  }

  function onHarmonyBase(hex) {
    const {r,g,b} = hexRgb(hex);
    const tones = [`rgb(${255-r},${255-g},${255-b})`,`rgb(${g},${b},${r})`,`rgb(${b},${r},${g})`,`rgba(${r},${g},${b},0.4)`];
    els.harmonyArea.innerHTML = '';
    tones.forEach(t => {
      const box = document.createElement('div');
      box.className = 'harmony-box';
      box.style.backgroundColor = t;
      box.addEventListener('click', () => onSolidPick(t));
      els.harmonyArea.appendChild(box);
    });
    onSolidPick(hex);
  }

  function applyGradSel() {
    const css = gradCSS(gradientStops, gradientAngle);
    if (colorMode === 'bg') { applyBg(css); return; }
    const layer = sel();
    if (!layer || colorMode !== 'fill') return;
    layer.fillType = 'gradient';
    layer.gradStops = JSON.parse(JSON.stringify(gradientStops));
    layer.gradAngle = gradientAngle;
    renderLayers();
  }

  function applyBg(value) { const s = stg(activeSide); if (s) s.style.background = value; }

  /* ── Color mode buttons ── */
  function bindColorModeButtons() {
    document.querySelectorAll('.obj-mini').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.obj-selector-mini').querySelectorAll('.obj-mini').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        colorMode = btn.dataset.mode;
      });
    });
  }

  /* ── Gradient ── */
  function bindGradient() {
    if (!els.gradTrack) return;
    function addAt(cx) {
      const r = els.gradTrack.getBoundingClientRect();
      const pos = Math.max(0,Math.min(100,Math.round(((cx-r.left)/r.width)*100)));
      gradientStops.push({id:Date.now(),pos,color:'#8E8E93'});
      activeStopId = gradientStops[gradientStops.length-1].id;
      renderStops(); applyGradSel();
    }
    els.gradTrack.addEventListener('click', e => addAt(e.clientX));
    els.gradTrack.addEventListener('touchstart', e => {e.preventDefault();addAt(e.touches[0].clientX);},{passive:false});

    els.stopColorInput?.addEventListener('input', e => {
      const s = gradientStops.find(x=>x.id===activeStopId);
      if(s){s.color=e.target.value;renderStops();applyGradSel();}
    });
    els.btnRemoveStop?.addEventListener('click', () => {
      if(gradientStops.length<=2) return;
      gradientStops=gradientStops.filter(s=>s.id!==activeStopId);
      activeStopId=null; els.stopSettings.classList.add('hidden');
      renderStops(); applyGradSel();
    });
    els.angRange?.addEventListener('input', () => {
      gradientAngle=Number(els.angRange.value);
      els.angVal.textContent=gradientAngle;
      renderStops(); applyGradSel();
    });
  }

  function renderStops() {
    if(!els.stopContainer) return;
    els.stopContainer.innerHTML = '';
    gradientStops.forEach(s => {
      const h = document.createElement('div');
      h.className = 'stop-handle'+(s.id===activeStopId?' active-stop':'');
      h.style.left = s.pos+'%';
      h.style.backgroundColor = s.color;
      const begin = sx => {
        activeStopId = s.id;
        els.stopSettings?.classList.remove('hidden');
        if(els.stopColorInput) els.stopColorInput.value = s.color.startsWith('#')?s.color:'#8E8E93';
        const mv = cx => {
          const r = els.gradTrack.getBoundingClientRect();
          s.pos = Math.max(0,Math.min(100,Math.round(((cx-r.left)/r.width)*100)));
          h.style.left = s.pos+'%'; updateGradVis(); applyGradSel();
        };
        const mm=e=>mv(e.clientX), tm=e=>{e.preventDefault();mv(e.touches[0].clientX);};
        const up=()=>{window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',up);window.removeEventListener('touchmove',tm);window.removeEventListener('touchend',up);};
        window.addEventListener('mousemove',mm); window.addEventListener('mouseup',up);
        window.addEventListener('touchmove',tm,{passive:false}); window.addEventListener('touchend',up);
      };
      h.addEventListener('mousedown',e=>{e.stopPropagation();begin(e.clientX);});
      h.addEventListener('touchstart',e=>{e.stopPropagation();e.preventDefault();begin(e.touches[0].clientX);},{passive:false});
      h.addEventListener('click',e=>{e.stopPropagation();activeStopId=s.id;els.stopSettings?.classList.remove('hidden');if(els.stopColorInput)els.stopColorInput.value=s.color.startsWith('#')?s.color:'#8E8E93';renderStops();});
      els.stopContainer.appendChild(h);
    });
    updateGradVis();
  }

  function updateGradVis() {
    if(!els.gradTrack) return;
    const sorted = [...gradientStops].sort((a,b)=>a.pos-b.pos);
    els.gradTrack.style.background = `linear-gradient(90deg, ${sorted.map(s=>`${s.color} ${s.pos}%`).join(', ')})`;
  }

  /* ── Toolbar ── */
  function bindToolbar() {
    els.btnAddText?.addEventListener('click', () => {
      const id = uid();
      layers[activeSide].push({id,type:'text',text:'New Text',x:24,y:50+layers[activeSide].length*24,fontSize:20,opacity:1,fillType:'solid',fillColor:'#FFFFFF',strokeColor:'transparent',gradStops:null,gradAngle:135});
      selectedId = id; renderLayers(); showCtxBar();
    });
    els.btnAddBg?.addEventListener('click', () => els.bgFileInput?.click());
    els.btnAddImg?.addEventListener('click', () => els.imgFileInput?.click());
  }

  /* ── File inputs ── */
  function bindFileInputs() {
    els.bgFileInput?.addEventListener('change', async e => {
      const f=e.target.files?.[0]; if(!f) return;
      const url = await readFile(f);
      layers[activeSide] = layers[activeSide].filter(l=>l.type!=='background');
      layers[activeSide].unshift({id:uid(),type:'background',src:url,opacity:1});
      renderLayers(); e.target.value='';
    });
    els.imgFileInput?.addEventListener('change', async e => {
      const f=e.target.files?.[0]; if(!f) return;
      const url = await readFile(f);
      const id = uid();
      layers[activeSide].push({id,type:'image',src:url,x:24,y:50,width:160,opacity:1});
      selectedId = id; renderLayers(); showCtxBar(); e.target.value='';
    });
  }

  /* ── Context bar ── */
  function bindCtxBar() {
    els.ctxOpacity?.addEventListener('input', e => {
      const l = sel(); if(!l) return;
      l.opacity = parseFloat(e.target.value); renderLayers();
    });
    els.ctxDup?.addEventListener('click', () => {
      const l = sel(); if(!l) return;
      const id = uid();
      const dup = JSON.parse(JSON.stringify(l));
      dup.id=id; dup.x=(dup.x||0)+12; dup.y=(dup.y||0)+12;
      layers[activeSide].push(dup); selectedId=id; renderLayers();
    });
    els.ctxDel?.addEventListener('click', () => {
      if(!selectedId) return;
      layers[activeSide] = layers[activeSide].filter(l=>l.id!==selectedId);
      selectedId = null; renderLayers(); hideCtxBar();
    });
  }

  function showCtxBar() {
    if(!els.ctxBar) return;
    const l = sel();
    if(l) { els.ctxOpacity.value = l.opacity ?? 1; }
    els.ctxBar.classList.remove('hidden');
  }
  function hideCtxBar() { els.ctxBar?.classList.add('hidden'); }

  /* ── Global pointer ── */
  function bindGlobalPointer() {
    document.addEventListener('pointerdown', e => {
      const t = e.target;
      if(t.classList.contains('canvas-stage') || t.closest('.canvas-fixed-bottom')) {
        selectedId = null; renderLayers(); hideCtxBar();
      }
    });
    window.addEventListener('mousemove', e => {
      if(!_drag) return; e.preventDefault();
      _drag.layer.x = _drag.ix + (e.clientX - _drag.sx);
      _drag.layer.y = _drag.iy + (e.clientY - _drag.sy);
      if(_drag.dom) _drag.dom.style.transform = `translate(${_drag.layer.x}px,${_drag.layer.y}px)`;
    });
    window.addEventListener('mouseup', () => { _drag = null; });
    window.addEventListener('touchmove', e => {
      if(_drag && e.touches.length===1){
        e.preventDefault();
        const t=e.touches[0];
        _drag.layer.x = _drag.ix+(t.clientX-_drag.sx);
        _drag.layer.y = _drag.iy+(t.clientY-_drag.sy);
        if(_drag.dom) _drag.dom.style.transform = `translate(${_drag.layer.x}px,${_drag.layer.y}px)`;
      }
      if(_pinch && e.touches.length===2){
        e.preventDefault();
        const d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
        const scale = d / _pinch.startDist;
        const nv = Math.max(10,Math.min(800,Math.round(_pinch.startVal*scale)));
        if(_pinch.layer.type==='text') _pinch.layer.fontSize=nv;
        else if(_pinch.layer.type==='image') _pinch.layer.width=nv;
        renderLayers();
      }
    }, {passive:false});
    window.addEventListener('touchend', e => { if(e.touches.length===0){_drag=null;_pinch=null;} });
  }

  /* ── Render ── */
  function renderLayers() {
    ['front','back'].forEach(side => {
      const s = stg(side); if(!s) return;
      Array.from(s.children).forEach(ch => {
        if(!ch.classList.contains('canvas-fixed-bottom')&&!ch.classList.contains('chariel-card__glow')) ch.remove();
      });
      layers[side].forEach(l => {
        if(l.type==='background') renderBg(s,l);
        else if(l.type==='text') renderText(s,l);
        else if(l.type==='image') renderImg(s,l);
      });
    });
    if(sel()) showCtxBar(); else hideCtxBar();
  }

  function renderBg(s,l) {
    const d=document.createElement('div');
    d.className='bg-layer'+(l.id===selectedId?' selected-bg':'');
    d.style.backgroundImage=`url(${l.src})`;
    d.style.opacity=l.opacity??1;
    d.style.pointerEvents='auto';
    d.addEventListener('pointerdown',e=>{e.stopPropagation();selectedId=l.id;renderLayers();});
    const fb=s.querySelector('.canvas-fixed-bottom');
    if(fb) s.insertBefore(d,fb); else s.appendChild(d);
  }

  function renderText(s,l) {
    const isSel=l.id===selectedId;
    const d=document.createElement('div');
    d.className='canvas-layer text-layer'+(isSel?' selected':'');
    d.style.transform=`translate(${l.x}px,${l.y}px)`;
    d.style.opacity=l.opacity??1;
    d.style.fontSize=`${l.fontSize||20}px`;
    d.style.fontWeight='800';
    d.style.lineHeight='1.2';
    d.style.letterSpacing='-0.02em';
    if(l.fillType==='gradient'&&l.gradStops){
      d.style.background=gradCSS(l.gradStops,l.gradAngle||135);
      d.style.webkitBackgroundClip='text';d.style.webkitTextFillColor='transparent';d.style.backgroundClip='text';
    } else { d.style.color=l.fillColor||'#FFFFFF'; }
    if(l.strokeColor&&l.strokeColor!=='transparent') d.style.webkitTextStroke=`1.5px ${l.strokeColor}`;
    d.textContent=l.text;
    if(isSel){d.contentEditable='true';d.spellcheck=false;}
    d.addEventListener('input',()=>{l.text=d.innerText;});
    d.addEventListener('blur',()=>{l.text=d.innerText;window.getSelection()?.removeAllRanges();});
    if(isSel){const rh=document.createElement('div');rh.className='resize-handle-layer';bindResize(rh,l,'fontSize');d.appendChild(rh);}
    bindDown(d,l);
    const fb=s.querySelector('.canvas-fixed-bottom');
    if(fb) s.insertBefore(d,fb); else s.appendChild(d);
  }

  function renderImg(s,l) {
    const isSel=l.id===selectedId;
    const d=document.createElement('div');
    d.className='canvas-layer image-layer'+(isSel?' selected':'');
    d.style.transform=`translate(${l.x}px,${l.y}px)`;
    d.style.opacity=l.opacity??1;
    d.style.width=`${l.width||160}px`;
    const img=document.createElement('img');
    img.src=l.src;img.draggable=false;
    img.style.cssText='width:100%;height:auto;display:block;border-radius:6px;pointer-events:none;';
    d.appendChild(img);
    if(isSel){const rh=document.createElement('div');rh.className='resize-handle-layer';bindResize(rh,l,'width');d.appendChild(rh);}
    bindDown(d,l);
    const fb=s.querySelector('.canvas-fixed-bottom');
    if(fb) s.insertBefore(d,fb); else s.appendChild(d);
  }

  function bindDown(dom,layer) {
    let lastTap=0;
    const down = (cx,cy,e) => {
      e.stopPropagation();
      if(selectedId!==layer.id){selectedId=layer.id;renderLayers();return;}
      if(layer.type==='text'&&dom.contentEditable==='true') return;
      _drag={layer,dom,sx:cx,sy:cy,ix:layer.x,iy:layer.y};
    };
    dom.addEventListener('mousedown',e=>down(e.clientX,e.clientY,e));
    dom.addEventListener('touchstart',e=>{
      if(e.touches.length===1) down(e.touches[0].clientX,e.touches[0].clientY,e);
      else if(e.touches.length===2&&selectedId===layer.id){
        _drag=null;
        _pinch={layer,startDist:Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY),startVal:layer.type==='text'?(layer.fontSize||20):(layer.width||160)};
      }
    },{passive:false});
    if(layer.type==='text'){
      dom.addEventListener('touchend',()=>{const now=Date.now();if(now-lastTap<300&&selectedId===layer.id){dom.contentEditable='true';dom.focus();}lastTap=now;});
      dom.addEventListener('dblclick',()=>{if(selectedId===layer.id){dom.contentEditable='true';dom.focus();}});
    }
  }

  function bindResize(handle,layer,prop) {
    const down=(cx,e)=>{
      e.stopPropagation();e.preventDefault();
      const sx=cx,sv=layer[prop]||(prop==='fontSize'?20:160);
      const mv=ncx=>{layer[prop]=Math.max(10,Math.min(800,Math.round(sv+(ncx-sx))));renderLayers();};
      const mm=e2=>mv(e2.clientX), tm=e2=>{e2.preventDefault();mv(e2.touches[0].clientX);};
      const up=()=>{window.removeEventListener('mousemove',mm);window.removeEventListener('mouseup',up);window.removeEventListener('touchmove',tm);window.removeEventListener('touchend',up);};
      window.addEventListener('mousemove',mm);window.addEventListener('mouseup',up);
      window.addEventListener('touchmove',tm,{passive:false});window.addEventListener('touchend',up);
    };
    handle.addEventListener('mousedown',e=>down(e.clientX,e));
    handle.addEventListener('touchstart',e=>down(e.touches[0].clientX,e),{passive:false});
  }

  function switchSide(side){activeSide=side;selectedId=null;renderLayers();hideCtxBar();}

  return {
    init,
    switchSide,
    getLayers:()=>JSON.parse(JSON.stringify(layers)),
    setLayersFromData(data){if(data?.front)layers.front=data.front;if(data?.back)layers.back=data.back;renderLayers();},
    applyTemplateToLayers,
    updateSenderReceiver,
    resetDefaultLayers(){resetDefaultLayers();renderLayers();}
  };
})();
window.CanvasEditor = CanvasEditor;
