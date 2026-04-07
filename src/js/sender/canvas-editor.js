// canvas-editor.js 최상단 (window.CanvasEditor = (() => { 바로 위)
window.CanvasEditor = (() => {

    
  const TEMPLATES_INLINE = [
  {
    id: 'birthday',
    frontColor: '#f472b6',
    accentColor: '#fb923c',
    frontGradient: 'linear-gradient(160deg, #fdf2f8 0%, #fce7f3 45%, #fff7ed 100%)',
    backGradient: 'linear-gradient(160deg, #fff7ed 0%, #fce7f3 100%)',
    bgImage: 'https://images.unsplash.com/photo-1490750967868-88df5691cc9a?w=600&auto=format&fit=crop&q=80',
    title: 'Happy Birthday',
    subtitle: 'May this day sparkle\nwith everything you love.',
    message: 'Another year of you\nis the best gift of all.\nWishing you pure joy today.',
    backText: 'Every moment with you\nis one I treasure forever.\nHappy Birthday, always.'
  },
  {
    id: 'congrats',
    frontColor: '#34d399',
    accentColor: '#60a5fa',
    frontGradient: 'linear-gradient(160deg, #ecfdf5 0%, #d1fae5 45%, #eff6ff 100%)',
    backGradient: 'linear-gradient(160deg, #eff6ff 0%, #d1fae5 100%)',
    bgImage: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&auto=format&fit=crop&q=80',
    title: 'You Did It',
    subtitle: 'This moment belongs\nentirely to you.',
    message: 'All those quiet mornings,\nlate nights, and brave steps —\nthey led right here.',
    backText: 'The world is wider now\nbecause you dared to reach.\nSo proud of you.'
  },
  {
    id: 'wedding',
    frontColor: '#f9a8d4',
    accentColor: '#c4b5fd',
    frontGradient: 'linear-gradient(160deg, #fdf2f8 0%, #fce7f3 45%, #f5f3ff 100%)',
    backGradient: 'linear-gradient(160deg, #f5f3ff 0%, #fce7f3 100%)',
    bgImage: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&auto=format&fit=crop&q=80',
    title: 'Forever\nStarts Now',
    subtitle: 'Two souls, one beautiful\nbeginning.',
    message: 'May your love be a shelter,\na laughter, and a quiet home\nyou always return to.',
    backText: 'What a privilege it is\nto witness your love story\nunfold so beautifully.'
  },
  {
    id: 'anniversary',
    frontColor: '#60a5fa',
    accentColor: '#a78bfa',
    frontGradient: 'linear-gradient(160deg, #eff6ff 0%, #dbeafe 45%, #f5f3ff 100%)',
    backGradient: 'linear-gradient(160deg, #f5f3ff 0%, #dbeafe 100%)',
    bgImage: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&auto=format&fit=crop&q=80',
    title: 'Happy\nAnniversary',
    subtitle: 'Still choosing each other,\nevery single day.',
    message: 'Love that deepens\nwith every season —\nthat is what you have built.',
    backText: 'Here is to the years\nthat made you both\neven more beautiful together.'
  },
  {
    id: 'new-home',
    frontColor: '#fb923c',
    accentColor: '#fbbf24',
    frontGradient: 'linear-gradient(160deg, #fff7ed 0%, #ffedd5 45%, #fefce8 100%)',
    backGradient: 'linear-gradient(160deg, #fefce8 0%, #ffedd5 100%)',
    bgImage: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&auto=format&fit=crop&q=80',
    title: 'Welcome\nHome',
    subtitle: 'A new door opens\nto a whole new life.',
    message: 'May every room hold\nwarm memories in the making,\nand every window face the light.',
    backText: 'Home is where your story begins.\nMay this one be\nyour most beautiful chapter yet.'
  },
  {
    id: 'thank-you',
    frontColor: '#86efac',
    accentColor: '#34d399',
    frontGradient: 'linear-gradient(160deg, #f7fee7 0%, #ecfccb 45%, #ecfdf5 100%)',
    backGradient: 'linear-gradient(160deg, #ecfdf5 0%, #ecfccb 100%)',
    bgImage: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=600&auto=format&fit=crop&q=80',
    title: 'Thank You',
    subtitle: 'Some words are\nfelt before they are said.',
    message: 'Your kindness landed\nexactly when it was needed.\nThank you, from the heart.',
    backText: 'Gratitude this deep\ndoes not fit neatly into words —\nbut I hope you feel it.'
  }
];


    const FONT_OPTIONS = [
      {name:'Noto Sans KR', css:'"Noto Sans KR", sans-serif'},
      {name:'Noto Serif KR', css:'"Noto Serif KR", serif'},
      {name:'Nanum Gothic', css:'"Nanum Gothic", sans-serif'},
      {name:'Nanum Myeongjo', css:'"Nanum Myeongjo", serif'},
      {name:'Black Han Sans', css:'"Black Han Sans", sans-serif'},
      {name:'Do Hyeon', css:'"Do Hyeon", sans-serif'},
      {name:'Gothic A1', css:'"Gothic A1", sans-serif'},
      {name:'Gowun Dodum', css:'"Gowun Dodum", sans-serif'},
      {name:'Hahmlet', css:'"Hahmlet", serif'},
      {name:'IBM Plex Sans KR', css:'"IBM Plex Sans KR", sans-serif'},
      {name:'Jua', css:'"Jua", sans-serif'},
      {name:'Song Myung', css:'"Song Myung", serif'},
      {name:'Gaegu', css:'"Gaegu", cursive'},
      {name:'Poor Story', css:'"Poor Story", cursive'},
      {name:'Stylish', css:'"Stylish", sans-serif'},
      {name:'Hi Melody', css:'"Hi Melody", cursive'},
      {name:'Black And White Picture', css:'"Black And White Picture", sans-serif'},
      {name:'Dokdo', css:'"Dokdo", cursive'},
      {name:'Sunflower', css:'"Sunflower", sans-serif'},
      {name:'Arial', css:'Arial, sans-serif'}
    ];

    const BASE_COLORS = [
      '#111827','#ffffff','#ef4444','#f97316','#f59e0b','#eab308',
      '#22c55e','#14b8a6','#06b6d4','#3b82f6','#6366f1','#8b5cf6',
      '#ec4899','#6b7280'
    ];

    const TEXT_PRESETS = [
      {
        id:'clean', name:'Clean',
        fontFamily:'"Noto Sans KR", sans-serif',
        fontSize:34, lineHeight:1.15, letterSpacing:0,
        fill:{mode:'solid', color:'#ffffff', gradient:null},
        strokeEnabled:false, strokeWidth:0,
        stroke:{mode:'solid', color:'#111827', gradient:null},
        bgEnabled:false,
        background:{mode:'solid', color:'rgba(255,255,255,.2)', opacity:0.2, radius:12, paddingX:12, paddingY:8, gradient:null}
      },
      {
        id:'outline', name:'Bold Outline',
        fontFamily:'"Black Han Sans", sans-serif',
        fontSize:36, lineHeight:1.05, letterSpacing:.5,
        fill:{mode:'solid', color:'#ffffff', gradient:null},
        strokeEnabled:true, strokeWidth:3,
        stroke:{mode:'solid', color:'#111827', gradient:null},
        bgEnabled:false,
        background:{mode:'solid', color:'rgba(255,255,255,.15)', opacity:0.15, radius:12, paddingX:12, paddingY:8, gradient:null}
      },
      {
        id:'softlabel', name:'Soft Label',
        fontFamily:'"Gowun Dodum", sans-serif',
        fontSize:28, lineHeight:1.2, letterSpacing:0,
        fill:{mode:'solid', color:'#4c1d95', gradient:null},
        strokeEnabled:false, strokeWidth:0,
        stroke:{mode:'solid', color:'#111827', gradient:null},
        bgEnabled:true,
        background:{mode:'solid', color:'#ffffff', opacity:.82, radius:16, paddingX:14, paddingY:10, gradient:null}
      },
      {
        id:'sunset', name:'Sunset Gradient',
        fontFamily:'"Jua", sans-serif',
        fontSize:34, lineHeight:1.1, letterSpacing:.5,
        fill:{
          mode:'gradient',
          color:'#ffffff',
          gradient:{
            angle:25,
            stops:[
              {id:uid(), pos:0, color:'#fb7185'},
              {id:uid(), pos:50, color:'#f59e0b'},
              {id:uid(), pos:100, color:'#fde047'}
            ]
          }
        },
        strokeEnabled:false, strokeWidth:0,
        stroke:{mode:'solid', color:'#111827', gradient:null},
        bgEnabled:false,
        background:{mode:'solid', color:'#ffffff', opacity:.12, radius:12, paddingX:12, paddingY:8, gradient:null}
      },
      {
        id:'editorial', name:'Editorial Serif',
        fontFamily:'"Noto Serif KR", serif',
        fontSize:30, lineHeight:1.18, letterSpacing:.2,
        fill:{mode:'solid', color:'#ffffff', gradient:null},
        strokeEnabled:false, strokeWidth:0,
        stroke:{mode:'solid', color:'#111827', gradient:null},
        bgEnabled:true,
        background:{mode:'solid', color:'rgba(17,24,39,.38)', opacity:.38, radius:6, paddingX:10, paddingY:8, gradient:null}
      }
    ];

    function uid(){
      return Math.random().toString(36).slice(2,10);
    }

    function clone(obj){
      return JSON.parse(JSON.stringify(obj));
    }

    function hexToRgb(hex){
      const h = hex.replace('#','');
      const full = h.length===3 ? h.split('').map(c=>c+c).join('') : h;
      const n = parseInt(full,16);
      return {r:(n>>16)&255, g:(n>>8)&255, b:n&255};
    }

    function rgbToHex(r,g,b){
      return '#' + [r,g,b].map(v=>{
        const s = Math.max(0,Math.min(255,Math.round(v))).toString(16);
        return s.length===1?'0'+s:s;
      }).join('');
    }

    function makeHarmonies(base){
      try{
        const {r,g,b} = hexToRgb(base);
        const toHsl = rgbToHsl(r,g,b);
        const h = toHsl.h, s = toHsl.s, l = toHsl.l;
        return [
          hslToHex((h+30)%360, Math.min(100,s+6), l),
          hslToHex((h+180)%360, Math.min(100,s), Math.max(16,Math.min(84,l))),
          hslToHex((h+210)%360, Math.min(100,s+2), Math.max(20,Math.min(80,l))),
          hslToHex((h+330)%360, Math.min(100,s+4), Math.max(20,Math.min(82,l)))
        ];
      }catch{
        return ['#8B5CF6','#EC4899','#F59E0B','#3B82F6'];
      }
    }

    function rgbToHsl(r,g,b){
      r/=255; g/=255; b/=255;
      const max=Math.max(r,g,b), min=Math.min(r,g,b);
      let h,s,l=(max+min)/2;
      if(max===min){h=s=0}
      else{
        const d=max-min;
        s=l>0.5 ? d/(2-max-min) : d/(max+min);
        switch(max){
          case r: h=(g-b)/d + (g<b?6:0); break;
          case g: h=(b-r)/d + 2; break;
          case b: h=(r-g)/d + 4; break;
        }
        h*=60;
      }
      return {h,s:s*100,l:l*100};
    }

    function hslToHex(h,s,l){
      s/=100; l/=100;
      const c=(1-Math.abs(2*l-1))*s;
      const x=c*(1-Math.abs((h/60)%2-1));
      const m=l-c/2;
      let r=0,g=0,b=0;
      if(h<60){r=c;g=x;b=0}
      else if(h<120){r=x;g=c;b=0}
      else if(h<180){r=0;g=c;b=x}
      else if(h<240){r=0;g=x;b=c}
      else if(h<300){r=x;g=0;b=c}
      else {r=c;g=0;b=x}
      return rgbToHex((r+m)*255,(g+m)*255,(b+m)*255);
    }

    function buildLinearGradient(gradient){
      if(!gradient || !gradient.stops || !gradient.stops.length) return 'transparent';
      const stops = [...gradient.stops]
        .sort((a,b)=>a.pos-b.pos)
        .map(s => `${s.color} ${s.pos}%`)
        .join(', ');
      return `linear-gradient(${gradient.angle || 0}deg, ${stops})`;
    }

    function createDefaultText(id, text, x, y, presetName='clean'){
      const preset = TEXT_PRESETS.find(p=>p.id===presetName) || TEXT_PRESETS[0];
      return {
        id: id,
        type: 'text',
        name: text.slice(0,18) || 'Text',
        text: text,
        x: x,
        y: y,
        w: 180,
        h: 80,
        rotation: 0,
        opacity: 1,
        fontFamily: preset.fontFamily,
        fontSize: preset.fontSize,
        align: 'center',
        lineHeight: preset.lineHeight,
        letterSpacing: preset.letterSpacing,
        fill: clone(preset.fill),
        strokeEnabled: preset.strokeEnabled,
        strokeWidth: preset.strokeWidth,
        stroke: clone(preset.stroke),
        bgEnabled: preset.bgEnabled,
        background: clone(preset.background)
      };
    }

    function defaultState(side, tpl){
  const isFront = side === 'front';
  const gradient = isFront
    ? (tpl?.frontGradient || 'linear-gradient(160deg,#fdf2f8,#fff7ed)')
    : (tpl?.backGradient || 'linear-gradient(160deg,#fff7ed,#fdf2f8)');
  const main = tpl?.frontColor || '#f472b6';
  const accent = tpl?.accentColor || '#fb923c';
  const bgImg = tpl?.bgImage || '';

  return {
    bgColor: '#ffffff',
    bgImage: bgImg,
    bgImageOpacity: isFront ? 0.52 : 0.18,
    bgImageScale: 100,
    bgImageFit: 'cover',
    bgOverlay: {
      enabled: true,
      mode: 'gradient',
      color: main,
      gradient: {
        angle: isFront ? 160 : 180,
        stops: isFront
          ? [
              {id:uid(), pos:0,  color: main + '99'},
              {id:uid(), pos:50, color: accent + '55'},
              {id:uid(), pos:100, color: '#ffffff22'}
            ]
          : [
              {id:uid(), pos:0,  color: accent + '66'},
              {id:uid(), pos:100, color: '#ffffff11'}
            ]
      }
    },
    elements: isFront
      ? [
          // 헤더 — 크고 굵게
              Object.assign(createDefaultText(uid(), tpl?.title || 'Title', 20, 32, 'clean'), {
      w: 260,
      h: 90,
      fontSize: 38,
      fontFamily: '"Black Han Sans", sans-serif',
      lineHeight: 1.1,
      letterSpacing: -0.5,
      fill: {mode:'solid', color:'#ffffff', gradient:null},
            strokeEnabled: true, strokeWidth: 1,
            stroke: {mode:'solid', color:'rgba(0,0,0,0.15)', gradient:null},
            bgEnabled: false,
            background: {mode:'solid', color:'transparent', opacity:0, radius:0, paddingX:0, paddingY:0, gradient:null}
          }),
          // 서브헤더 — 중간 크기, 가볍게
          Object.assign(createDefaultText(uid(), tpl?.subtitle || '', 20, 148, 'clean'), {
            w: 260, h: 52,
            fontSize: 14,
            fontFamily: '"Gowun Dodum", sans-serif',
            lineHeight: 1.45,
            letterSpacing: 0.3,
            fill: {mode:'solid', color:'rgba(255,255,255,0.82)', gradient:null},
            strokeEnabled: false, strokeWidth: 0,
            bgEnabled: false,
            background: {mode:'solid', color:'transparent', opacity:0, radius:0, paddingX:0, paddingY:0, gradient:null}
          }),
          // 본문 — 중간, 읽기 편하게
          Object.assign(createDefaultText(uid(), tpl?.message || '', 20, 248, 'clean'), {
            w: 260, h: 120,
            fontSize: 18,
            fontFamily: '"Noto Sans KR", sans-serif',
            lineHeight: 1.65,
            letterSpacing: 0,
            fill: {mode:'solid', color:'rgba(255,255,255,0.96)', gradient:null},
            strokeEnabled: false, strokeWidth: 0,
            bgEnabled: false,
            background: {mode:'solid', color:'transparent', opacity:0, radius:0, paddingX:0, paddingY:0, gradient:null}
          })
        ]
            fill: {mode:'solid', color:'#ffffff', gradient:null},
            strokeEnabled: false, strokeWidth: 0,
            bgEnabled: false,
            background: {mode:'solid', color:'transparent', opacity:0, radius:0, paddingX:0, paddingY:0, gradient:null}
          }),
          // 서브헤더
          Object.assign(createDefaultText(uid(), tpl?.subtitle || '', 24, 140, 'clean'), {
            w: 252, h: 60, fontSize: 15,
            fill: {mode:'solid', color:'rgba(255,255,255,0.88)', gradient:null},
            strokeEnabled: false, strokeWidth: 0,
            bgEnabled: false,
            background: {mode:'solid', color:'transparent', opacity:0, radius:0, paddingX:0, paddingY:0, gradient:null}
          }),
          // 본문
          Object.assign(createDefaultText(uid(), tpl?.message || '', 24, 240, 'clean'), {
            w: 252, h: 110, fontSize: 17,
            fill: {mode:'solid', color:'rgba(255,255,255,0.95)', gradient:null},
            strokeEnabled: false, strokeWidth: 0,
            bgEnabled: false,
            background: {mode:'solid', color:'transparent', opacity:0, radius:0, paddingX:0, paddingY:0, gradient:null}
          })
        ]
      : [
          // 뒷면 본문 — 수직 중앙
          Object.assign(createDefaultText(uid(), tpl?.backText || '', 24, 140, 'clean'), {
            w: 252, h: 140, fontSize: 17,
            align: 'center',
            fill: {mode:'solid', color:'rgba(255,255,255,0.95)', gradient:null},
            strokeEnabled: false, strokeWidth: 0,
            bgEnabled: false,
            background: {mode:'solid', color:'transparent', opacity:0, radius:0, paddingX:0, paddingY:0, gradient:null}
          })
        ]
  };
}



    const appState = {
  mode:'basic',
  side:'front',
  selectionId:null,
  activeTab:'text',
  history:[],
  historyIndex:-1,
  sides:{
    front:defaultState('front', TEMPLATES_INLINE[0]),
    back:defaultState('back', TEMPLATES_INLINE[0])
  },

    lastDeleted:null,
  currentTemplateId:'birthday'
};



    const refs = {
      app:document.getElementById('app'),
      main:document.getElementById('main'),
      card:document.getElementById('card'),
      cardInner:document.getElementById('cardInner'),
      cardBgColor:document.getElementById('cardBgColor'),
      cardBgImage:document.getElementById('cardBgImage'),
      cardBgOverlay:document.getElementById('cardBgOverlay'),
      toolTabs:document.getElementById('toolTabs'),
      panelHost:document.getElementById('panelHost'),
        modeSegment:document.getElementById('mode-toggle'),
      sideSegment:document.getElementById('side-toggle'),
      modeBadge:document.getElementById('modeBadge'),
      sideBadge:document.getElementById('sideBadge'),
      selectionBadge:document.getElementById('selectionBadge'),
      divider:document.getElementById('divider'),
      topPane:document.getElementById('topPane'),
      bottomPane:document.getElementById('bottomPane'),
      overlay:document.getElementById('overlay'),
      textSheet:document.getElementById('textSheet'),
      textSheetTitle:document.getElementById('textSheetTitle'),
      textContentInput:document.getElementById('textContentInput'),
      closeTextSheet:document.getElementById('closeTextSheet'),
      cancelTextEdit:document.getElementById('cancelTextEdit'),
      saveTextEdit:document.getElementById('saveTextEdit'),
      textSheetHelper:document.getElementById('textSheetHelper'),
      upgradeSheet:document.getElementById('upgradeSheet'),
      closeUpgradeSheet:document.getElementById('closeUpgradeSheet'),
      fakeUpgradeBtn:document.getElementById('fakeUpgradeBtn'),
      upgradeLaterBtn:document.getElementById('upgradeLaterBtn'),
      toast:document.getElementById('toast'),
      toastText:document.getElementById('toastText'),
      toastUndo:document.getElementById('toastUndo'),
      undoBtn:document.getElementById('undoBtn'),
      redoBtn:document.getElementById('redoBtn'),
      contextBar:document.getElementById('contextBar'),
      ctxEdit:document.getElementById('ctxEdit'),
      ctxDuplicate:document.getElementById('ctxDuplicate'),
      ctxBringFront:document.getElementById('ctxBringFront'),
      ctxDelete:document.getElementById('ctxDelete'),
      basicHint:document.getElementById('basicHint')
    };

    function currentSideState(){
      return appState.sides[appState.side];
    }

    function selectedElement(){
      return currentSideState().elements.find(el => el.id===appState.selectionId) || null;
    }

    function isCustom(){
      return appState.mode === 'custom';
    }

    function getSnapshot(){
      return clone({
        mode:appState.mode,
        side:appState.side,
        selectionId:appState.selectionId,
        activeTab:appState.activeTab,
        sides:appState.sides
      });
    }

    function pushHistory(){
      const snapshot = getSnapshot();
      const prev = appState.history[appState.historyIndex];
      if(prev && JSON.stringify(prev) === JSON.stringify(snapshot)) return;
      appState.history = appState.history.slice(0, appState.historyIndex + 1);
      appState.history.push(snapshot);
      appState.historyIndex = appState.history.length - 1;
      updateHistoryButtons();
    }

    function applySnapshot(snap){
      appState.mode = snap.mode;
      appState.side = snap.side;
      appState.selectionId = snap.selectionId;
      appState.activeTab = snap.activeTab;
      appState.sides = clone(snap.sides);
      renderAll(false);
      updateHistoryButtons();
    }

    function undo(){
      if(appState.historyIndex <= 0) return;
      appState.historyIndex -= 1;
      applySnapshot(clone(appState.history[appState.historyIndex]));
    }

    function redo(){
      if(appState.historyIndex >= appState.history.length - 1) return;
      appState.historyIndex += 1;
      applySnapshot(clone(appState.history[appState.historyIndex]));
    }

    function updateHistoryButtons(){
      refs.undoBtn.disabled = appState.historyIndex <= 0;
      refs.redoBtn.disabled = appState.historyIndex >= appState.history.length - 1;
    }

    function showToast(text, undoHandler){
      refs.toastText.textContent = text;
      refs.toast.classList.add('show');
      refs.toastUndo.style.display = undoHandler ? 'inline-block' : 'none';
      refs.toastUndo.onclick = ()=>{
        if(undoHandler) undoHandler();
        refs.toast.classList.remove('show');
      };
      clearTimeout(showToast._timer);
      showToast._timer = setTimeout(()=> refs.toast.classList.remove('show'), 2500);
    }

    function setMode(mode){
      if(mode === appState.mode) return;
      appState.mode = mode;
      if(mode === 'basic'){
        appState.activeTab = 'text';
      }
      renderAll(true);
    }

    function setSide(side){
      if(side === appState.side) return;
      appState.side = side;
      appState.selectionId = null;
      renderAll(true);
    }

    function selectElement(id){
      if(appState.selectionId === id){
        renderAll(false);
        return;
      }
      appState.selectionId = id;
      const el = selectedElement();
      if(el && isCustom()){
        appState.activeTab = el.type === 'image' ? 'image' : 'text';
      } else {
        appState.activeTab = 'text';
      }
      renderAll(false);
    }

    function deselect(){
      if(!appState.selectionId) return;
      appState.selectionId = null;
      renderAll(false);
    }

    function openTextSheetFor(el){
      if(!el || el.type!=='text') return;
      refs.textSheetTitle.textContent = appState.mode === 'basic' ? 'Edit Wording' : 'Edit Text';
      refs.textSheetHelper.textContent = appState.mode === 'basic'
        ? 'Basic allows wording edits only. Styling and layout changes are locked.'
        : 'Edit your text content here. Styling stays in the tool panel.';
      refs.textContentInput.value = el.text || '';
      refs.overlay.classList.add('show');
      refs.textSheet.classList.add('show');
      refs.upgradeSheet.classList.remove('show');
      setTimeout(()=> refs.textContentInput.focus(), 30);
    }

    function closeSheets(){
      refs.overlay.classList.remove('show');
      refs.textSheet.classList.remove('show');
      refs.upgradeSheet.classList.remove('show');
    }

    function openUpgradeSheet(){
      refs.overlay.classList.add('show');
      refs.upgradeSheet.classList.add('show');
      refs.textSheet.classList.remove('show');
    }

    function renderModeUI(){
      if(!refs.modeSegment) return;
      [...refs.modeSegment.querySelectorAll('button')].forEach(btn=>{
        const mode = btn.dataset.value;
        btn.classList.toggle('active', appState.mode === mode);
      });

      refs.modeBadge.innerHTML = appState.mode === 'basic'
        ? `<i data-lucide="sparkles"></i><span>Basic Trial</span>`
        : `<i data-lucide="sparkles"></i><span>Custom</span>`;

      refs.sideBadge.textContent = `Editing ${appState.side === 'front' ? 'Front' : 'Back'}`;
      refs.basicHint.classList.toggle('hidden', appState.mode !== 'basic');
    }

    function renderSideUI(){
      if(!refs.sideSegment) return;
      [...refs.sideSegment.querySelectorAll('button')].forEach(btn=>{
        btn.classList.toggle('active', btn.dataset.value === appState.side);
      });
    }

    function renderSelectionBadge(){
      const el = selectedElement();
      if(!el){
        refs.selectionBadge.innerHTML = `<i data-lucide="type"></i><span>No selection</span>`;
        return;
      }
      refs.selectionBadge.innerHTML = el.type === 'text'
        ? `<i data-lucide="type"></i><span>Text selected</span>`
        : `<i data-lucide="image"></i><span>Image selected</span>`;
    }

    function renderCardBackground(){
      const side = currentSideState();
      const tplId = appState.currentTemplateId || 'birthday';
      const matched = TEMPLATES_INLINE.find(t => t.id === tplId) || TEMPLATES_INLINE[0];
      const grad = appState.side === 'front' ? matched.frontGradient : matched.backGradient;

      // 그라디언트 배경 적용
      refs.cardBgColor.style.background = grad || side.bgColor || '#ffffff';
      refs.cardBgColor.style.position = 'absolute';
      refs.cardBgColor.style.inset = '0';
      refs.cardBgColor.style.borderRadius = '24px';
      refs.cardBgColor.style.zIndex = '0';

      // bgImage
           if(side.bgImage){
        refs.cardBgImage.style.backgroundImage = `url(${side.bgImage})`;
        refs.cardBgImage.style.opacity = String(side.bgImageOpacity ?? 0.5);
        refs.cardBgImage.style.backgroundSize = 'cover';
        refs.cardBgImage.style.backgroundPosition = 'center';
      } else {
        refs.cardBgImage.style.backgroundImage = 'none';
        refs.cardBgImage.style.opacity = '0';
      }

      refs.cardBgImage.style.position = 'absolute';
      refs.cardBgImage.style.inset = '0';
      refs.cardBgImage.style.zIndex = '1';

      if(side.bgImageFit === 'contain'){
        refs.cardBgImage.style.backgroundSize = 'contain';
      } else if(side.bgImageFit === 'stretch'){
        refs.cardBgImage.style.backgroundSize = '100% 100%';
      } else {
        refs.cardBgImage.style.backgroundSize = `${side.bgImageScale || 100}%`;
      }

      // overlay
      refs.cardBgOverlay.style.position = 'absolute';
      refs.cardBgOverlay.style.inset = '0';
      refs.cardBgOverlay.style.zIndex = '2';
      refs.cardBgOverlay.style.pointerEvents = 'none';

      if(side.bgOverlay?.enabled){
        refs.cardBgOverlay.style.background =
          side.bgOverlay.mode === 'gradient'
            ? buildLinearGradient(side.bgOverlay.gradient)
            : (side.bgOverlay.color || 'transparent');
      } else {
        refs.cardBgOverlay.style.background = 'transparent';
      }

      // cardInner 위로
      refs.cardInner.style.position = 'absolute';
      refs.cardInner.style.inset = '0';
      refs.cardInner.style.zIndex = '3';


      refs.cardBgImage.style.backgroundImage = side.bgImage ? `url(${side.bgImage})` : 'none';
      refs.cardBgImage.style.opacity = side.bgImage ? String(side.bgImageOpacity ?? 1) : '0';

      if(side.bgImageFit === 'contain'){
        refs.cardBgImage.style.backgroundSize = 'contain';
      }else if(side.bgImageFit === 'stretch'){
        refs.cardBgImage.style.backgroundSize = '100% 100%';
      }else{
        refs.cardBgImage.style.backgroundSize = `${side.bgImageScale || 100}%`;
      }

      if(side.bgOverlay?.enabled){
        refs.cardBgOverlay.style.background =
          side.bgOverlay.mode === 'gradient'
            ? buildLinearGradient(side.bgOverlay.gradient)
            : (side.bgOverlay.color || 'transparent');
      }else{
        refs.cardBgOverlay.style.background = 'transparent';
      }
    }

    function textFillCss(el){
      if(el.fill?.mode === 'gradient' && el.fill.gradient){
        return `
          background:${buildLinearGradient(el.fill.gradient)};
          -webkit-background-clip:text;
          background-clip:text;
          -webkit-text-fill-color:transparent;
          color:transparent;
        `;
      }
      return `color:${el.fill?.color || '#111827'};`;
    }

    function textStrokeCss(el){
      if(!el.strokeEnabled || !el.strokeWidth) return '';
      return `-webkit-text-stroke:${el.strokeWidth}px ${el.stroke?.color || '#111827'}; paint-order:stroke fill;`;
    }

    function textBgCss(el){
      if(!el.bgEnabled) return 'background:transparent;padding:0;border-radius:0;';
      if(el.background?.mode === 'gradient' && el.background.gradient){
        return `background:${buildLinearGradient(el.background.gradient)}; padding:${el.background.paddingY || 8}px ${el.background.paddingX || 12}px; border-radius:${el.background.radius || 12}px;`;
      }
      return `background:${el.background?.color || 'rgba(255,255,255,.2)'}; padding:${el.background.paddingY || 8}px ${el.background.paddingX || 12}px; border-radius:${el.background.radius || 12}px;`;
    }

    function renderElements(){
      refs.cardInner.innerHTML = '';
      const side = currentSideState();

      side.elements.forEach(el=>{
        const node = document.createElement('div');
        node.className = `element ${el.type==='text'?'text-el':'image-el'} ${appState.selectionId===el.id?'selected':''} ${appState.mode==='basic'?'locked-basic':''}`;
        node.dataset.id = el.id;
        node.style.left = `${el.x}px`;
        node.style.top = `${el.y}px`;
        node.style.width = `${el.w}px`;
        node.style.height = `${el.h}px`;
        node.style.opacity = String(el.opacity ?? 1);
        node.style.transform = `rotate(${el.rotation || 0}deg)`;
        node.style.transformOrigin = 'center center';

                if(el.type === 'text'){
          const isBackSide = appState.side === 'back';
          const justifyVal = isBackSide ? 'center' : (el.align==='left'?'flex-start':el.align==='right'?'flex-end':'center');
          const alignVal = isBackSide ? 'center' : 'flex-start';
          node.innerHTML = `
            <div style="
              width:100%;
              height:100%;
              display:flex;
              align-items:${alignVal};
              justify-content:${justifyVal};
              text-align:${isBackSide ? 'center' : (el.align || 'center')};

              font-family:${el.fontFamily || '"Noto Sans KR", sans-serif'};
              font-size:${el.fontSize || 28}px;
              line-height:${el.lineHeight || 1.2};
              letter-spacing:${el.letterSpacing || 0}px;
              font-weight:800;
              ${textFillCss(el)}
              ${textStrokeCss(el)}
            ">
              <div style="${textBgCss(el)}">${escapeHtml(el.text || '')}</div>
            </div>
          `;
        } else if(el.type === 'image'){
          node.innerHTML = `<img src="${el.src}" alt="" draggable="false">`;
        }

        node.addEventListener('pointerdown', (e)=> onElementPointerDown(e, el.id));
        node.addEventListener('click', (e)=>{
          e.stopPropagation();
          selectElement(el.id);
        });

        node.addEventListener('dblclick', (e)=>{
          e.stopPropagation();
          selectElement(el.id);
          const current = currentSideState().elements.find(x=>x.id===el.id);
          if(current?.type === 'text'){
            openTextSheetFor(current);
          }else if(appState.mode === 'basic'){
            openUpgradeSheet();
          }
        });

        if(appState.selectionId === el.id && appState.mode === 'custom'){
          const resize = document.createElement('div');
          resize.className = 'resize-handle';
          resize.addEventListener('pointerdown', (e)=> startResize(e, el.id));
          node.appendChild(resize);

          const rotate = document.createElement('div');
          rotate.className = 'rotate-handle';
          rotate.addEventListener('pointerdown', (e)=> startRotate(e, el.id));
          node.appendChild(rotate);
        }

        refs.cardInner.appendChild(node);
      });

      refs.card.onclick = (e)=>{
        if(
          e.target === refs.card ||
          e.target === refs.cardInner ||
          e.target === refs.cardBgColor ||
          e.target === refs.cardBgImage ||
          e.target === refs.cardBgOverlay
        ){
          deselect();
        }
      };
    }

    function renderContextBar(){
      const el = selectedElement();
      if(!el){
        refs.contextBar.classList.remove('show');
        return;
      }

      refs.contextBar.classList.add('show');

      if(appState.mode === 'basic'){
        refs.ctxEdit.innerHTML = `<i data-lucide="pencil-line"></i><span>${el.type === 'text' ? 'Edit Wording' : 'Locked'}</span>`;
        refs.ctxDuplicate.innerHTML = `<i data-lucide="lock"></i><span>Locked</span>`;
        refs.ctxBringFront.innerHTML = `<i data-lucide="lock"></i><span>Locked</span>`;
        refs.ctxDelete.innerHTML = `<i data-lucide="lock"></i><span>Locked</span>`;
      } else {
        refs.ctxEdit.innerHTML = `<i data-lucide="pencil-line"></i><span>Edit</span>`;
        refs.ctxDuplicate.innerHTML = `<i data-lucide="copy"></i><span>Duplicate</span>`;
        refs.ctxBringFront.innerHTML = `<i data-lucide="move-up"></i><span>Front</span>`;
        refs.ctxDelete.innerHTML = `<i data-lucide="trash-2"></i><span>Delete</span>`;
      }
    }

    function getTabs(){
      if(appState.mode === 'basic'){
        return [
          {id:'text', label:'Edit Text', icon:'type', locked:false},
          {id:'style', label:'Style', icon:'palette', locked:true},
          {id:'background', label:'Background', icon:'image', locked:true},
          {id:'image', label:'Image', icon:'picture-in-picture-2', locked:true},
          {id:'layers', label:'Layers', icon:'layers', locked:true}
        ];
      }
      return [
        {id:'text', label:'Text', icon:'type', locked:false},
        {id:'background', label:'Background', icon:'image', locked:false},
        {id:'image', label:'Image', icon:'picture-in-picture-2', locked:false},
        {id:'layers', label:'Layers', icon:'layers', locked:false}
      ];
    }

    function renderTabs(){
      const tabs = getTabs();
      if(!tabs.some(t => t.id === appState.activeTab && !t.locked)){
        appState.activeTab = 'text';
      }

      refs.toolTabs.innerHTML = tabs.map(tab=>`
        <button class="tool-tab ${appState.activeTab===tab.id?'active':''} ${tab.locked?'locked':''}" data-tab="${tab.id}" data-locked="${tab.locked ? 'true' : 'false'}">
          <i data-lucide="${tab.locked ? 'lock' : tab.icon}"></i>
          <span>${tab.label}</span>
        </button>
      `).join('');
    }

    function attachTabsEvents(){
      refs.toolTabs.querySelectorAll('[data-tab]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const tab = btn.dataset.tab;
          const locked = btn.dataset.locked === 'true';
          if(locked){
            openUpgradeSheet();
            return;
          }
          if(appState.activeTab !== tab){
            appState.activeTab = tab;
            renderPanels();
          }
          renderTabs();
          lucide.createIcons();
        });
      });
    }

    function renderPanels(){
      refs.panelHost.innerHTML = '';

      if(appState.mode === 'basic'){
        refs.panelHost.appendChild(renderBasicTextPanel());
      } else {
        if(appState.activeTab === 'text') refs.panelHost.appendChild(renderCustomTextPanel());
        if(appState.activeTab === 'background') refs.panelHost.appendChild(renderBackgroundPanel());
        if(appState.activeTab === 'image') refs.panelHost.appendChild(renderImagePanel());
        if(appState.activeTab === 'layers') refs.panelHost.appendChild(renderLayersPanel());
      }

      lucide.createIcons();
    }

    function renderBasicTextPanel(){
      const el = selectedElement();
      const wrap = document.createElement('div');
      wrap.className = 'panel active';

      wrap.innerHTML = `
        <div class="section">
          <div class="section-title">
            <h4>Wording Only</h4>
            <span class="badge warning"><i data-lucide="lock"></i><span>Basic</span></span>
          </div>
          <div class="helper">
            In Basic Trial, you can only change the wording of existing text on the card.
            Font, size, color, gradient, movement, and all design controls are locked.
          </div>
          <div style="height:12px"></div>

          ${
            el && el.type === 'text'
            ? `
              <div class="field">
                <label>Selected Text</label>
                <textarea readonly>${escapeHtml(el.text || '')}</textarea>
              </div>
              <div style="height:10px"></div>
              <div class="button-row">
                <button class="btn soft" type="button" id="basicEditTextBtn">
                  <i data-lucide="pencil-line"></i>
                  <span>Edit Wording</span>
                </button>
                <button class="btn locked" type="button" id="basicStyleLockedBtn">
                  <i data-lucide="lock"></i>
                  <span>Style Locked</span>
                </button>
              </div>
            `
            : el && el.type === 'image'
            ? `
              <div class="helper">This item is locked in Basic. You can only edit text wording.</div>
              <div style="height:10px"></div>
              <div class="button-row">
                <button class="btn locked" type="button" id="basicImageLockedBtn">
                  <i data-lucide="lock"></i>
                  <span>Image Locked</span>
                </button>
                <button class="btn primary" type="button" id="panelUnlockBtn2">
                  <i data-lucide="lock-keyhole"></i>
                  <span>Unlock Custom</span>
                </button>
              </div>
            `
            : `
              <div class="helper">Select a text box on the card to edit its wording.</div>
              <div style="height:10px"></div>
              <button class="btn soft" type="button" id="basicGuideBtn">
                <i data-lucide="type"></i>
                <span>Tap a text layer above</span>
              </button>
            `
          }
        </div>

        <div class="section locked-overlay">
          <div class="section-title">
            <h4>Locked Custom Styling</h4>
            <span class="badge"><i data-lucide="lock-keyhole"></i><span>Custom</span></span>
          </div>

          <div class="grid-2">
            <button class="btn locked" type="button"><i data-lucide="lock"></i><span>Fonts</span></button>
            <button class="btn locked" type="button"><i data-lucide="lock"></i><span>Colors</span></button>
            <button class="btn locked" type="button"><i data-lucide="lock"></i><span>Gradient</span></button>
            <button class="btn locked" type="button"><i data-lucide="lock"></i><span>Background</span></button>
          </div>

          <div style="height:12px"></div>

          <div class="upgrade-card">
            <div class="upgrade-title">
              <i data-lucide="sparkles"></i>
              <span>Unlock full card customization</span>
            </div>
            <div class="upgrade-list">
              <div class="upgrade-item"><i data-lucide="check"></i><span>20 Korean fonts</span></div>
              <div class="upgrade-item"><i data-lucide="check"></i><span>Text fill / stroke / background styling</span></div>
              <div class="upgrade-item"><i data-lucide="check"></i><span>Gradient editing with stops</span></div>
              <div class="upgrade-item"><i data-lucide="check"></i><span>Move, resize, rotate, and layer order</span></div>
            </div>
            <button class="btn primary" type="button" id="panelUnlockBtn">
              <i data-lucide="lock-keyhole"></i>
              <span>Unlock Custom</span>
            </button>
          </div>
        </div>
      `;

      requestAnimationFrame(()=>{
        wrap.querySelector('#basicEditTextBtn')?.addEventListener('click', ()=>{
          const current = selectedElement();
          if(current?.type === 'text') openTextSheetFor(current);
        });
        wrap.querySelector('#basicStyleLockedBtn')?.addEventListener('click', openUpgradeSheet);
        wrap.querySelector('#basicImageLockedBtn')?.addEventListener('click', openUpgradeSheet);
        wrap.querySelector('#basicGuideBtn')?.addEventListener('click', ()=> showToast('Tap a text box on the card'));
        wrap.querySelector('#panelUnlockBtn')?.addEventListener('click', openUpgradeSheet);
        wrap.querySelector('#panelUnlockBtn2')?.addEventListener('click', openUpgradeSheet);
      });

      return wrap;
    }

    function renderCustomTextPanel(){
      const el = selectedElement();
      const wrap = document.createElement('div');
      wrap.className = 'panel active';

      if(!el || el.type !== 'text'){
        wrap.innerHTML = `
          <div class="section">
            <div class="section-title"><h4>Text</h4></div>
            <div class="helper">Select a text element on the card, or add one below.</div>
            <div style="height:12px"></div>
            <div class="button-row">
              <button class="btn soft" type="button" id="addHeadingBtn"><i data-lucide="type"></i><span>Add Heading</span></button>
              <button class="btn soft" type="button" id="addBodyBtn"><i data-lucide="text"></i><span>Add Body</span></button>
            </div>
          </div>
        `;
        requestAnimationFrame(()=>{
          wrap.querySelector('#addHeadingBtn')?.addEventListener('click', ()=> addText('Heading', 56, 88, 'outline'));
          wrap.querySelector('#addBodyBtn')?.addEventListener('click', ()=> addText('Your message here', 48, 160, 'clean'));
        });
        return wrap;
      }

      wrap.innerHTML = `
        <div class="section">
          <div class="section-title">
            <h4>Content</h4>
            <button class="btn soft" type="button" id="editTextBtn" style="height:34px;padding:0 12px">
              <i data-lucide="pencil-line"></i>
              <span>Edit</span>
            </button>
          </div>
          <div class="field">
            <label>Selected Text</label>
            <textarea readonly>${escapeHtml(el.text || '')}</textarea>
          </div>
        </div>

        <div class="section">
          <div class="section-title"><h4>Typography</h4></div>
          <div class="field">
            <label>Font Family</label>
            <div class="font-list">
              ${FONT_OPTIONS.map(font=>`
                <button class="font-item ${el.fontFamily===font.css?'active':''}" data-font="${escapeAttr(font.css)}" type="button">
                  <div class="font-name">${font.name}</div>
                  <div class="font-preview" style="font-family:${font.css}">Aa 한글</div>
                </button>
              `).join('')}
            </div>
          </div>

          <div style="height:12px"></div>

          <div class="field">
            <label>Font Size</label>
            <div class="range-line">
              <input type="range" min="12" max="72" step="1" value="${el.fontSize || 28}" id="fontSizeRange">
              <div class="value" id="fontSizeValue">${el.fontSize || 28}px</div>
            </div>
          </div>

          <div class="field">
            <label>Line Height</label>
            <div class="range-line">
              <input type="range" min="0.8" max="2" step="0.01" value="${el.lineHeight || 1.2}" id="lineHeightRange">
              <div class="value" id="lineHeightValue">${(el.lineHeight || 1.2).toFixed(2)}</div>
            </div>
          </div>

          <div class="field">
            <label>Letter Spacing</label>
            <div class="range-line">
              <input type="range" min="-2" max="10" step="0.1" value="${el.letterSpacing || 0}" id="letterSpacingRange">
              <div class="value" id="letterSpacingValue">${Number(el.letterSpacing || 0).toFixed(1)}px</div>
            </div>
          </div>

          <div class="field">
            <label>Rotation</label>
            <div class="range-line">
              <input type="range" min="-180" max="180" step="1" value="${el.rotation || 0}" id="textRotationRange">
              <div class="value" id="textRotationValue">${el.rotation || 0}°</div>
            </div>
          </div>

          <div class="field">
            <label>Opacity</label>
            <div class="range-line">
              <input type="range" min="0.1" max="1" step="0.01" value="${el.opacity ?? 1}" id="textOpacityRange">
              <div class="value" id="textOpacityValue">${Math.round((el.opacity ?? 1)*100)}%</div>
            </div>
          </div>

          <div class="field">
            <label>Align</label>
            <div class="chip-row" id="alignRow">
              <button class="chip ${el.align==='left'?'active':''}" data-align="left" type="button">Left</button>
              <button class="chip ${el.align==='center'?'active':''}" data-align="center" type="button">Center</button>
              <button class="chip ${el.align==='right'?'active':''}" data-align="right" type="button">Right</button>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title"><h4>Text Presets</h4></div>
          <div class="grid-2">
            ${TEXT_PRESETS.map(p=>`
              <button class="btn" type="button" data-preset="${p.id}">${p.name}</button>
            `).join('')}
          </div>
        </div>

        <div class="section">
          <div class="section-title"><h4>Appearance</h4></div>
          <div id="appearanceEditor"></div>
        </div>
      `;

      requestAnimationFrame(()=>{
        wrap.querySelector('#editTextBtn')?.addEventListener('click', ()=> {
          const current = selectedElement();
          if(current?.type === 'text') openTextSheetFor(current);
        });

        wrap.querySelectorAll('[data-font]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const s = selectedElement(); if(!s) return;
            s.fontFamily = btn.dataset.font;
            commitAndRender();
          });
        });

        bindRange('fontSizeRange','fontSizeValue',(val)=>{
          const s = selectedElement(); if(!s) return;
          s.fontSize = Number(val);
        }, v => `${v}px`);

        bindRange('lineHeightRange','lineHeightValue',(val)=>{
          const s = selectedElement(); if(!s) return;
          s.lineHeight = Number(val);
        }, v => Number(v).toFixed(2));

        bindRange('letterSpacingRange','letterSpacingValue',(val)=>{
          const s = selectedElement(); if(!s) return;
          s.letterSpacing = Number(val);
        }, v => `${Number(v).toFixed(1)}px`);

        bindRange('textRotationRange','textRotationValue',(val)=>{
          const s = selectedElement(); if(!s) return;
          s.rotation = Number(val);
        }, v => `${v}°`);

        bindRange('textOpacityRange','textOpacityValue',(val)=>{
          const s = selectedElement(); if(!s) return;
          s.opacity = Number(val);
        }, v => `${Math.round(v*100)}%`);

        wrap.querySelectorAll('#alignRow [data-align]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const s = selectedElement(); if(!s) return;
            s.align = btn.dataset.align;
            commitAndRender();
          });
        });

        wrap.querySelectorAll('[data-preset]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            const preset = TEXT_PRESETS.find(p=>p.id===btn.dataset.preset);
            const s = selectedElement();
            if(!preset || !s) return;
            s.fontFamily = preset.fontFamily;
            s.fontSize = preset.fontSize;
            s.lineHeight = preset.lineHeight;
            s.letterSpacing = preset.letterSpacing;
            s.fill = clone(preset.fill);
            s.strokeEnabled = preset.strokeEnabled;
            s.strokeWidth = preset.strokeWidth;
            s.stroke = clone(preset.stroke);
            s.bgEnabled = preset.bgEnabled;
            s.background = clone(preset.background);
            commitAndRender();
          });
        });

        setupAppearanceEditor('fill');
      });

      return wrap;
    }

    function setupAppearanceEditor(target='fill'){
      const host = document.getElementById('appearanceEditor');
      const s = selectedElement();
      if(!host || !s) return;

      const data = target === 'fill'
        ? s.fill
        : target === 'stroke'
          ? s.stroke
          : s.background;

      const currentColor = normalizeHex(data?.color || '#8b5cf6') || '#8B5CF6';
      const harmony = makeHarmonies(currentColor);

      host.innerHTML = `
        <div class="field">
          <label>Target</label>
          <div class="chip-row" id="appearanceTargetRow2">
            <button class="chip ${target==='fill'?'active':''}" data-target="fill" type="button">Fill</button>
            <button class="chip ${target==='stroke'?'active':''}" data-target="stroke" type="button">Stroke</button>
            <button class="chip ${target==='background'?'active':''}" data-target="background" type="button">Background</button>
          </div>
        </div>

        ${
          target === 'stroke'
            ? `
              <div class="field">
                <label>Stroke</label>
                <div class="chip-row">
                  <button class="chip ${s.strokeEnabled?'active':''}" id="strokeToggleBtn" type="button">${s.strokeEnabled?'Enabled':'Disabled'}</button>
                </div>
              </div>
            ` : ''
        }

        ${
          target === 'background'
            ? `
              <div class="field">
                <label>Text Background</label>
                <div class="chip-row">
                  <button class="chip ${s.bgEnabled?'active':''}" id="bgToggleBtn" type="button">${s.bgEnabled?'Enabled':'Disabled'}</button>
                </div>
              </div>
            ` : ''
        }

        <div class="field">
          <label>Mode</label>
          <div class="chip-row" id="modeRow">
            <button class="chip ${(data?.mode||'solid')==='solid'?'active':''}" data-mode="solid" type="button">Solid</button>
            <button class="chip ${(data?.mode||'solid')==='gradient'?'active':''}" data-mode="gradient" type="button">Gradient</button>
          </div>
        </div>

        <div class="field">
          <label>Base Colors</label>
          <div class="palette">
            ${BASE_COLORS.map(c=>`
              <button class="swatch ${currentColor.toUpperCase()===c.toUpperCase()?'active':''}" type="button" data-color="${c}" style="background:${c}"></button>
            `).join('')}
          </div>
        </div>

        <div class="field">
          <label>Harmony</label>
          <div class="harmony-row">
            ${harmony.map(c=>`
              <button class="harmony-item" type="button" data-color="${c}">
                <div class="harmony-chip" style="background:${c}"></div>
                <div class="harmony-meta">${c.toUpperCase()}</div>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="field">
          <label>HEX</label>
          <input type="text" id="hexInput" value="${currentColor.toUpperCase()}">
        </div>

        ${
          (data?.mode || 'solid') === 'gradient'
            ? renderGradientEditorHtml(data.gradient)
            : ''
        }

        ${
          target === 'stroke'
            ? `
              <div class="field">
                <label>Stroke Width</label>
                <div class="range-line">
                  <input type="range" min="0" max="12" step="1" value="${s.strokeWidth || 0}" id="strokeWidthRange">
                  <div class="value" id="strokeWidthValue">${s.strokeWidth || 0}px</div>
                </div>
              </div>
            ` : ''
        }

        ${
          target === 'background'
            ? `
              <div class="field">
                <label>Corner Radius</label>
                <div class="range-line">
                  <input type="range" min="0" max="28" step="1" value="${s.background?.radius || 12}" id="bgRadiusRange">
                  <div class="value" id="bgRadiusValue">${s.background?.radius || 12}px</div>
                </div>
              </div>

              <div class="field">
                <label>Padding X</label>
                <div class="range-line">
                  <input type="range" min="0" max="30" step="1" value="${s.background?.paddingX || 12}" id="bgPadXRange">
                  <div class="value" id="bgPadXValue">${s.background?.paddingX || 12}px</div>
                </div>
              </div>

              <div class="field">
                <label>Padding Y</label>
                <div class="range-line">
                  <input type="range" min="0" max="24" step="1" value="${s.background?.paddingY || 8}" id="bgPadYRange">
                  <div class="value" id="bgPadYValue">${s.background?.paddingY || 8}px</div>
                </div>
              </div>
            ` : ''
        }
      `;

      host.querySelectorAll('[data-target]').forEach(btn=>{
        btn.addEventListener('click', ()=> setupAppearanceEditor(btn.dataset.target));
      });

      host.querySelectorAll('[data-mode]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const s = selectedElement(); if(!s) return;
          const mode = btn.dataset.mode;
          const obj = target==='fill' ? s.fill : target==='stroke' ? s.stroke : s.background;
          obj.mode = mode;
          if(mode === 'gradient' && !obj.gradient){
            obj.gradient = {
              angle:45,
              stops:[
                {id:uid(), pos:0, color:currentColor},
                {id:uid(), pos:100, color:harmony[0] || '#EC4899'}
              ]
            };
          }
          commitAndRender(false);
          setupAppearanceEditor(target);
        });
      });

      host.querySelectorAll('[data-color]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          applyColorToTarget(target, btn.dataset.color);
        });
      });

      host.querySelector('#hexInput')?.addEventListener('change', (e)=>{
        const val = normalizeHex(e.target.value);
        if(!val) return;
        applyColorToTarget(target, val);
      });

      host.querySelector('#strokeToggleBtn')?.addEventListener('click', ()=>{
        const s = selectedElement(); if(!s) return;
        s.strokeEnabled = !s.strokeEnabled;
        commitAndRender(false);
        setupAppearanceEditor('stroke');
      });

      host.querySelector('#bgToggleBtn')?.addEventListener('click', ()=>{
        const s = selectedElement(); if(!s) return;
        s.bgEnabled = !s.bgEnabled;
        commitAndRender(false);
        setupAppearanceEditor('background');
      });

      bindRangeInHost(host,'strokeWidthRange','strokeWidthValue',(val)=>{
        const s = selectedElement(); if(!s) return;
        s.strokeWidth = Number(val);
        s.strokeEnabled = s.strokeWidth > 0;
      }, v => `${v}px`);

      bindRangeInHost(host,'bgRadiusRange','bgRadiusValue',(val)=>{
        const s = selectedElement(); if(!s) return;
        s.background.radius = Number(val);
        s.bgEnabled = true;
      }, v => `${v}px`);

      bindRangeInHost(host,'bgPadXRange','bgPadXValue',(val)=>{
        const s = selectedElement(); if(!s) return;
        s.background.paddingX = Number(val);
        s.bgEnabled = true;
      }, v => `${v}px`);

      bindRangeInHost(host,'bgPadYRange','bgPadYValue',(val)=>{
        const s = selectedElement(); if(!s) return;
        s.background.paddingY = Number(val);
        s.bgEnabled = true;
      }, v => `${v}px`);

      bindGradientEditor(host, target);
      lucide.createIcons();
    }

    function renderGradientEditorHtml(gradient){
      const g = gradient || {
        angle:45,
        stops:[
          {id:uid(),pos:0,color:'#8b5cf6'},
          {id:uid(),pos:100,color:'#ec4899'}
        ]
      };
      const activeId = g._activeStopId || g.stops[0]?.id;
      const active = g.stops.find(s=>s.id===activeId) || g.stops[0];

      return `
        <div class="field">
          <label>Gradient Preview</label>
          <div class="gradient-preview" style="background:${buildLinearGradient(g)}"></div>
          <div class="gradient-bar" id="gradientBar" style="background:${buildLinearGradient(g)}">
            ${g.stops.map((stop)=>`
              <button class="stop-dot ${active?.id===stop.id?'active':''}" type="button" data-stop-id="${stop.id}" style="left:${stop.pos}%;background:${stop.color}"></button>
            `).join('')}
          </div>
        </div>

        <div class="button-row">
          <button class="btn" type="button" id="addStopBtn"><i data-lucide="plus"></i><span>Add Stop</span></button>
          <button class="btn" type="button" id="duplicateStopBtn"><i data-lucide="copy"></i><span>Duplicate</span></button>
        </div>

        <div class="button-row">
          <button class="btn" type="button" id="deleteStopBtn"><i data-lucide="trash-2"></i><span>Delete</span></button>
          <button class="btn" type="button" id="reverseStopsBtn"><i data-lucide="arrow-left-right"></i><span>Reverse</span></button>
        </div>

        <div class="field">
          <label>Selected Stop Color</label>
          <input type="text" id="stopColorInput" value="${(active?.color || '#8B5CF6').toUpperCase()}">
        </div>

        <div class="field">
          <label>Selected Stop Position</label>
          <div class="range-line">
            <input type="range" min="0" max="100" step="1" value="${active?.pos || 0}" id="stopPosRange">
            <div class="value" id="stopPosValue">${active?.pos || 0}%</div>
          </div>
        </div>

        <div class="field">
          <label>Angle</label>
          <div class="range-line">
            <input type="range" min="0" max="360" step="1" value="${g.angle || 45}" id="gradientAngleRange">
            <div class="value" id="gradientAngleValue">${g.angle || 45}°</div>
          </div>
        </div>
      `;
    }

    function bindGradientEditor(host, target){
      const s = selectedElement();
      if(!s) return;
      const obj = target==='fill' ? s.fill : target==='stroke' ? s.stroke : s.background;
      if(!obj || obj.mode !== 'gradient') return;
      if(!obj.gradient){
        obj.gradient = {
          angle:45,
          stops:[
            {id:uid(),pos:0,color:'#8b5cf6'},
            {id:uid(),pos:100,color:'#ec4899'}
          ]
        };
      }
      const g = obj.gradient;
      if(!g._activeStopId && g.stops[0]) g._activeStopId = g.stops[0].id;

      const bar = host.querySelector('#gradientBar');
      if(!bar) return;

      const activeStop = () => g.stops.find(x => x.id === g._activeStopId) || g.stops[0];

      host.querySelectorAll('.stop-dot').forEach(node=>{
        node.addEventListener('click', ()=>{
          g._activeStopId = node.dataset.stopId;
          renderAll(false);
          setupAppearanceEditor(target);
        });

        node.addEventListener('pointerdown', (e)=>{
          e.preventDefault();
          e.stopPropagation();
          g._activeStopId = node.dataset.stopId;

          const move = (ev)=>{
            const rect = bar.getBoundingClientRect();
            const pct = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
            const stop = activeStop();
            if(stop){
              stop.pos = Math.round(pct);
              renderAll(false);
              setupAppearanceEditor(target);
            }
          };
          const up = ()=>{
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            pushHistory();
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        });
      });

      host.querySelector('#addStopBtn')?.addEventListener('click', ()=>{
        g.stops.push({id:uid(), pos:50, color:'#ffffff'});
        g._activeStopId = g.stops[g.stops.length - 1].id;
        commitAndRender(false);
        setupAppearanceEditor(target);
      });

      host.querySelector('#duplicateStopBtn')?.addEventListener('click', ()=>{
        const stop = activeStop();
        if(!stop) return;
        g.stops.push({id:uid(), pos:Math.min(100, stop.pos + 10), color:stop.color});
        g._activeStopId = g.stops[g.stops.length - 1].id;
        commitAndRender(false);
        setupAppearanceEditor(target);
      });

      host.querySelector('#deleteStopBtn')?.addEventListener('click', ()=>{
        if(g.stops.length <= 2) return;
        g.stops = g.stops.filter(x => x.id !== g._activeStopId);
        g._activeStopId = g.stops[0]?.id;
        commitAndRender(false);
        setupAppearanceEditor(target);
      });

      host.querySelector('#reverseStopsBtn')?.addEventListener('click', ()=>{
        g.stops = g.stops.map(stop => ({...stop, pos:100 - stop.pos})).sort((a,b)=>a.pos-b.pos);
        commitAndRender(false);
        setupAppearanceEditor(target);
      });

      host.querySelector('#stopColorInput')?.addEventListener('change', (e)=>{
        const stop = activeStop();
        if(!stop) return;
        const color = e.target.value.trim();
        stop.color = color;
        commitAndRender(false);
        setupAppearanceEditor(target);
      });

      bindRangeInHost(host,'stopPosRange','stopPosValue',(val)=>{
        const stop = activeStop(); if(!stop) return;
        stop.pos = Number(val);
      }, v => `${v}%`);

      bindRangeInHost(host,'gradientAngleRange','gradientAngleValue',(val)=>{
        g.angle = Number(val);
      }, v => `${v}°`);
    }

    function applyColorToTarget(target, color){
      const s = selectedElement(); if(!s) return;
      const obj = target==='fill' ? s.fill : target==='stroke' ? s.stroke : s.background;
      if(!obj) return;

      if((obj.mode || 'solid') === 'gradient'){
        if(!obj.gradient){
          obj.gradient = {angle:45, stops:[{id:uid(),pos:0,color},{id:uid(),pos:100,color:'#ffffff'}]};
        }
        const activeId = obj.gradient._activeStopId || obj.gradient.stops[0]?.id;
        const active = obj.gradient.stops.find(st => st.id === activeId) || obj.gradient.stops[0];
        if(active) active.color = color;
      } else {
        obj.color = color;
      }

      if(target === 'stroke') s.strokeEnabled = true;
      if(target === 'background') s.bgEnabled = true;

      commitAndRender(false);
      setupAppearanceEditor(target);
    }

    function renderBackgroundPanel(){
      const side = currentSideState();
      const base = normalizeHex(side.bgColor || '#ffffff') || '#FFFFFF';
      const harmony = makeHarmonies(base);
      const wrap = document.createElement('div');
      wrap.className = 'panel active';
      wrap.innerHTML = `
        <div class="section">
          <div class="section-title"><h4>Background Color</h4></div>
          <div class="field">
            <label>Base Colors</label>
            <div class="palette">
              ${BASE_COLORS.map(c=>`
                <button class="swatch ${base.toUpperCase()===c.toUpperCase()?'active':''}" type="button" data-bg-color="${c}" style="background:${c}"></button>
              `).join('')}
            </div>
          </div>

          <div class="field">
            <label>Harmony</label>
            <div class="harmony-row">
              ${harmony.map(c=>`
                <button class="harmony-item" type="button" data-bg-color="${c}">
                  <div class="harmony-chip" style="background:${c}"></div>
                  <div class="harmony-meta">${c.toUpperCase()}</div>
                </button>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title"><h4>Background Image</h4></div>
          <div class="field">
            <label>Upload Image</label>
            <input type="file" accept="image/*" id="bgUploadInput">
          </div>

          <div class="field">
            <label>Opacity</label>
            <div class="range-line">
              <input type="range" min="0" max="1" step="0.01" value="${side.bgImageOpacity ?? .3}" id="bgOpacityRange">
              <div class="value" id="bgOpacityValue">${Math.round((side.bgImageOpacity ?? .3)*100)}%</div>
            </div>
          </div>

          <div class="field">
            <label>Scale</label>
            <div class="range-line">
              <input type="range" min="50" max="200" step="1" value="${side.bgImageScale || 100}" id="bgScaleRange">
              <div class="value" id="bgScaleValue">${side.bgImageScale || 100}%</div>
            </div>
          </div>

          <div class="field">
            <label>Fit</label>
            <div class="chip-row" id="bgFitRow">
              <button class="chip ${side.bgImageFit==='cover'?'active':''}" type="button" data-fit="cover">Cover</button>
              <button class="chip ${side.bgImageFit==='contain'?'active':''}" type="button" data-fit="contain">Contain</button>
              <button class="chip ${side.bgImageFit==='stretch'?'active':''}" type="button" data-fit="stretch">Stretch</button>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title"><h4>Overlay Gradient</h4></div>
          <div class="helper">Use a soft overlay to give the card more mood and readability.</div>
          <div style="height:12px"></div>
          <div id="bgGradientEditor"></div>
        </div>
      `;

      requestAnimationFrame(()=>{
        wrap.querySelectorAll('[data-bg-color]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            side.bgColor = btn.dataset.bg-color || btn.dataset.bgColor;
            commitAndRender();
          });
        });

        wrap.querySelector('#bgUploadInput')?.addEventListener('change', (e)=>{
          const file = e.target.files?.[0];
          if(!file) return;
          const reader = new FileReader();
          reader.onload = ()=>{
            side.bgImage = reader.result;
            commitAndRender();
          };
          reader.readAsDataURL(file);
        });

        bindRangeInHost(wrap,'bgOpacityRange','bgOpacityValue',(val)=>{
          side.bgImageOpacity = Number(val);
        }, v => `${Math.round(v*100)}%`);

        bindRangeInHost(wrap,'bgScaleRange','bgScaleValue',(val)=>{
          side.bgImageScale = Number(val);
        }, v => `${v}%`);

        wrap.querySelectorAll('#bgFitRow [data-fit]').forEach(btn=>{
          btn.addEventListener('click', ()=>{
            side.bgImageFit = btn.dataset.fit;
            commitAndRender();
          });
        });

        setupBackgroundGradientEditor();
      });

      return wrap;
    }

    function setupBackgroundGradientEditor(){
      const host = document.getElementById('bgGradientEditor');
      const side = currentSideState();
      if(!host) return;

      if(!side.bgOverlay){
        side.bgOverlay = {
          enabled:true,
          mode:'gradient',
          color:'#000',
          gradient:{
            angle:45,
            stops:[
              {id:uid(),pos:0,color:'rgba(124,58,237,0.2)'},
              {id:uid(),pos:100,color:'rgba(255,255,255,0)'}
            ]
          }
        };
      }

      if(!side.bgOverlay.gradient){
        side.bgOverlay.gradient = {
          angle:45,
          stops:[
            {id:uid(),pos:0,color:'#8b5cf6'},
            {id:uid(),pos:100,color:'#ffffff'}
          ]
        };
      }

      const g = side.bgOverlay.gradient;
      if(!g._activeStopId && g.stops[0]) g._activeStopId = g.stops[0].id;

      host.innerHTML = renderGradientEditorHtml(g);
      lucide.createIcons();
      bindGradientEditorForObject(host, g, ()=>{
        renderAll(false);
        setupBackgroundGradientEditor();
      });
    }

    function bindGradientEditorForObject(host, g, onChange){
      const bar = host.querySelector('#gradientBar');
      if(!bar) return;

      const activeStop = ()=> g.stops.find(s=>s.id===g._activeStopId) || g.stops[0];

      host.querySelectorAll('.stop-dot').forEach(node=>{
        node.addEventListener('click', ()=>{
          g._activeStopId = node.dataset.stopId;
          onChange();
        });

        node.addEventListener('pointerdown', (e)=>{
          e.preventDefault();
          g._activeStopId = node.dataset.stopId;
          const move = (ev)=>{
            const rect = bar.getBoundingClientRect();
            const pct = Math.max(0,Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
            const st = activeStop();
            if(st){
              st.pos = Math.round(pct);
              onChange();
            }
          };
          const up = ()=>{
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            pushHistory();
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        });
      });

      host.querySelector('#addStopBtn')?.addEventListener('click', ()=>{
        g.stops.push({id:uid(), pos:50, color:'#ffffff'});
        g._activeStopId = g.stops[g.stops.length - 1].id;
        onChange();
        pushHistory();
      });

      host.querySelector('#duplicateStopBtn')?.addEventListener('click', ()=>{
        const st = activeStop(); if(!st) return;
        g.stops.push({id:uid(), pos:Math.min(100, st.pos + 10), color:st.color});
        g._activeStopId = g.stops[g.stops.length - 1].id;
        onChange();
        pushHistory();
      });

      host.querySelector('#deleteStopBtn')?.addEventListener('click', ()=>{
        if(g.stops.length <= 2) return;
        g.stops = g.stops.filter(x=>x.id !== g._activeStopId);
        g._activeStopId = g.stops[0]?.id;
        onChange();
        pushHistory();
      });

      host.querySelector('#reverseStopsBtn')?.addEventListener('click', ()=>{
        g.stops = g.stops.map(st=>({...st, pos:100 - st.pos})).sort((a,b)=>a.pos-b.pos);
        onChange();
        pushHistory();
      });

      host.querySelector('#stopColorInput')?.addEventListener('change', (e)=>{
        const st = activeStop();
        if(st){
          st.color = e.target.value.trim();
          onChange();
          pushHistory();
        }
      });

      bindRangeInHost(host,'stopPosRange','stopPosValue',(val)=>{
        const st = activeStop(); if(!st) return;
        st.pos = Number(val);
      }, v => `${v}%`, ()=> pushHistory());

      bindRangeInHost(host,'gradientAngleRange','gradientAngleValue',(val)=>{
        g.angle = Number(val);
      }, v => `${v}°`, ()=> pushHistory());
    }

    function renderImagePanel(){
      const el = selectedElement();
      const wrap = document.createElement('div');
      wrap.className = 'panel active';
      wrap.innerHTML = `
        <div class="section">
          <div class="section-title"><h4>Image</h4></div>
          <div class="button-row">
            <button class="btn soft" type="button" id="addImageBtn"><i data-lucide="image-plus"></i><span>Add Image</span></button>
            <button class="btn" type="button" id="replaceImageBtn"><i data-lucide="upload"></i><span>Replace</span></button>
          </div>
          <input type="file" accept="image/*" id="imageUploadInput" class="hidden">
        </div>

        ${
          el && el.type === 'image'
            ? `
              <div class="section">
                <div class="section-title"><h4>Selected Image</h4></div>

                <div class="field">
                  <label>Opacity</label>
                  <div class="range-line">
                    <input type="range" min="0.1" max="1" step="0.01" value="${el.opacity ?? 1}" id="imgOpacityRange">
                    <div class="value" id="imgOpacityValue">${Math.round((el.opacity ?? 1)*100)}%</div>
                  </div>
                </div>

                <div class="field">
                  <label>Rotation</label>
                  <div class="range-line">
                    <input type="range" min="-180" max="180" step="1" value="${el.rotation || 0}" id="imgRotationRange">
                    <div class="value" id="imgRotationValue">${el.rotation || 0}°</div>
                  </div>
                </div>
              </div>
            `
            : `
              <div class="section">
                <div class="helper">Select an image element to edit its opacity and rotation.</div>
              </div>
            `
        }
      `;

      requestAnimationFrame(()=>{
        const uploader = wrap.querySelector('#imageUploadInput');
        wrap.querySelector('#addImageBtn')?.addEventListener('click', ()=> uploader.click());
        wrap.querySelector('#replaceImageBtn')?.addEventListener('click', ()=>{
          const current = selectedElement();
          if(current && current.type === 'image') uploader.click();
          else showToast('Add or select an image first');
        });

        uploader?.addEventListener('change', (e)=>{
          const file = e.target.files?.[0];
          if(!file) return;
          const reader = new FileReader();
          reader.onload = ()=>{
            const current = selectedElement();
            if(current && current.type === 'image'){
              current.src = reader.result;
            } else {
              const newImage = {
                id:uid(),
                type:'image',
                name:'Image',
                src:reader.result,
                x:75,y:240,w:150,h:110,rotation:0,opacity:1
              };
              currentSideState().elements.push(newImage);
              appState.selectionId = newImage.id;
              appState.activeTab = 'image';
            }
            commitAndRender();
          };
          reader.readAsDataURL(file);
        });

        bindRangeInHost(wrap,'imgOpacityRange','imgOpacityValue',(val)=>{
          const s = selectedElement(); if(!s || s.type!=='image') return;
          s.opacity = Number(val);
        }, v => `${Math.round(v*100)}%`);

        bindRangeInHost(wrap,'imgRotationRange','imgRotationValue',(val)=>{
          const s = selectedElement(); if(!s || s.type!=='image') return;
          s.rotation = Number(val);
        }, v => `${v}°`);
      });

      return wrap;
    }

    function renderLayersPanel(){
      const side = currentSideState();
      const wrap = document.createElement('div');
      wrap.className = 'panel active';
      wrap.innerHTML = `
        <div class="section">
          <div class="section-title"><h4>Layers</h4></div>
          <div class="list">
            ${side.elements.map((el, index)=>`
              <div class="layer-item ${appState.selectionId===el.id?'active':''}" data-layer-id="${el.id}">
                <div class="layer-thumb">
                  <i data-lucide="${el.type==='text'?'type':'image'}"></i>
                </div>
                <div class="layer-meta">
                  <div class="layer-name">${escapeHtml(el.name || el.type)}</div>
                  <div class="layer-sub">${el.type} · layer ${index + 1}</div>
                </div>
                <div class="layer-actions">
                  <button class="mini-btn" type="button" data-up="${el.id}"><i data-lucide="move-up"></i></button>
                  <button class="mini-btn" type="button" data-down="${el.id}"><i data-lucide="move-down"></i></button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      requestAnimationFrame(()=>{
        wrap.querySelectorAll('[data-layer-id]').forEach(row=>{
          row.addEventListener('click', ()=>{
            selectElement(row.dataset.layerId);
          });
        });

        wrap.querySelectorAll('[data-up]').forEach(btn=>{
          btn.addEventListener('click', (e)=>{
            e.stopPropagation();
            moveLayer(btn.dataset.up, 'up');
          });
        });

        wrap.querySelectorAll('[data-down]').forEach(btn=>{
          btn.addEventListener('click', (e)=>{
            e.stopPropagation();
            moveLayer(btn.dataset.down, 'down');
          });
        });
      });

      return wrap;
    }

    function moveLayer(id, dir){
      const arr = currentSideState().elements;
      const i = arr.findIndex(el=>el.id===id);
      if(i<0) return;

      if(dir==='up' && i < arr.length - 1){
        [arr[i], arr[i+1]] = [arr[i+1], arr[i]];
      }
      if(dir==='down' && i > 0){
        [arr[i], arr[i-1]] = [arr[i-1], arr[i]];
      }

      commitAndRender();
    }

    function addText(text, x, y, preset='clean'){
      const t = createDefaultText(uid(), text, x, y, preset);
      currentSideState().elements.push(t);
      appState.selectionId = t.id;
      appState.activeTab = 'text';
      commitAndRender();
    }

    function duplicateSelected(){
      const el = selectedElement();
      if(!el) return;
      const copy = clone(el);
      copy.id = uid();
      copy.x += 14;
      copy.y += 14;
      copy.name = (copy.name || copy.type) + ' copy';
      currentSideState().elements.push(copy);
      appState.selectionId = copy.id;
      commitAndRender();
    }

    function bringSelectedToFront(){
      const arr = currentSideState().elements;
      const idx = arr.findIndex(el=>el.id===appState.selectionId);
      if(idx < 0) return;
      const [item] = arr.splice(idx,1);
      arr.push(item);
      commitAndRender();
    }

    function deleteSelected(){
      const arr = currentSideState().elements;
      const idx = arr.findIndex(el=>el.id===appState.selectionId);
      if(idx < 0) return;
      const [removed] = arr.splice(idx,1);
      appState.lastDeleted = {side:appState.side, item:removed, index:idx};
      appState.selectionId = null;
      commitAndRender();
      showToast('Element deleted', ()=>{
        if(appState.lastDeleted){
          const {side,item,index} = appState.lastDeleted;
          appState.sides[side].elements.splice(index,0,item);
          appState.selectionId = item.id;
          renderAll(false);
          pushHistory();
        }
      });
    }

    function normalizeHex(value){
      const v = String(value || '').trim();
      if(/^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(v)) return v.toUpperCase();
      return null;
    }

    function bindRange(id, valueId, onInput, format){
      const input = document.getElementById(id);
      const value = document.getElementById(valueId);
      if(!input || !value) return;
      const apply = ()=>{
        onInput(input.value);
        value.textContent = format ? format(Number(input.value)) : input.value;
        renderAll(false);
      };
      const commit = ()=> pushHistory();
      input.addEventListener('input', apply);
      input.addEventListener('change', commit);
    }

    function bindRangeInHost(host, id, valueId, onInput, format, afterCommit){
      const input = host.querySelector(`#${id}`);
      const value = host.querySelector(`#${valueId}`);
      if(!input || !value) return;

      const apply = ()=>{
        onInput(input.value);
        value.textContent = format ? format(Number(input.value)) : input.value;
        renderAll(false);
      };
      const commit = ()=>{
        pushHistory();
        afterCommit && afterCommit();
      };

      input.addEventListener('input', apply);
      input.addEventListener('change', commit);
    }

    function escapeHtml(str){
      return String(str || '').replace(/[&<>"']/g, s => ({
        '&':'&amp;',
        '<':'&lt;',
        '>':'&gt;',
        '"':'&quot;',
        "'":'&#39;'
      }[s]));
    }

    function escapeAttr(str){
      return String(str || '').replace(/"/g,'&quot;');
    }

    let dragState = null;

    function onElementPointerDown(e, id){
      e.stopPropagation();
      const el = currentSideState().elements.find(x=>x.id===id);
      if(!el) return;
      selectElement(id);

      if(appState.mode === 'basic') return;

      if(e.target.classList.contains('resize-handle') || e.target.classList.contains('rotate-handle')) return;

      dragState = {
        type:'move',
        id,
        startX:e.clientX,
        startY:e.clientY,
        origX:el.x,
        origY:el.y
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }

    function startResize(e, id){
      e.stopPropagation();
      if(appState.mode !== 'custom') return;
      const el = currentSideState().elements.find(x=>x.id===id);
      if(!el) return;
      dragState = {
        type:'resize',
        id,
        startX:e.clientX,
        startY:e.clientY,
        origW:el.w,
        origH:el.h
      };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }

    function startRotate(e, id){
      e.stopPropagation();
      if(appState.mode !== 'custom') return;
      const el = currentSideState().elements.find(x=>x.id===id);
      if(!el) return;
      const cardRect = refs.card.getBoundingClientRect();
      dragState = {
        type:'rotate',
        id,
        cx:cardRect.left + el.x + el.w/2,
        cy:cardRect.top + el.y + el.h/2
      };
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    }

    function onPointerMove(e){
      if(!dragState) return;
      const el = currentSideState().elements.find(x=>x.id===dragState.id);
      if(!el) return;

      if(dragState.type === 'move'){
        el.x = Math.max(0, Math.min(300 - el.w, dragState.origX + (e.clientX - dragState.startX)));
        el.y = Math.max(0, Math.min(420 - el.h, dragState.origY + (e.clientY - dragState.startY)));
      }

      if(dragState.type === 'resize'){
        el.w = Math.max(36, dragState.origW + (e.clientX - dragState.startX));
        el.h = Math.max(30, dragState.origH + (e.clientY - dragState.startY));
      }

      if(dragState.type === 'rotate'){
        const angle = Math.atan2(e.clientY - dragState.cy, e.clientX - dragState.cx) * 180 / Math.PI;
        el.rotation = Math.round(angle + 90);
      }

      renderAll(false);
    }

    function onPointerUp(){
      if(dragState) pushHistory();
      dragState = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    }

    function setupDivider(){
      let startY = 0;
      let startTopH = 0;
      let total = 0;

      refs.divider.addEventListener('pointerdown', (e)=>{
        refs.divider.classList.add('active');
        startY = e.clientY;
        startTopH = refs.topPane.getBoundingClientRect().height;
        total = refs.main.getBoundingClientRect().height;

        const move = (ev)=>{
          const delta = ev.clientY - startY;
          const next = Math.max(180, Math.min(total - 180, startTopH + delta));
          refs.topPane.style.flex = `0 0 ${next}px`;
        };

        const up = ()=>{
          refs.divider.classList.remove('active');
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };

        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      });
    }

    function commitAndRender(push = true){
      renderAll(false);
      if(push) pushHistory();
    }

    function renderAll(shouldPush=false){
      renderModeUI();
      renderSideUI();
      renderSelectionBadge();
      renderCardBackground();
      renderElements();
      renderContextBar();
      renderTabs();
      renderPanels();
      attachTabsEvents();
      lucide.createIcons();
      if(shouldPush) pushHistory();
    }

    function initEvents(){
           refs.modeSegment?.addEventListener('click', (e)=>{
        const btn = e.target.closest('[data-value]');
        if(!btn) return;
        const mode = btn.dataset.value;
        if(mode === 'custom'){
          setMode('custom');
          return;
        }
        setMode('basic');
      });

      refs.sideSegment?.addEventListener('click', (e)=>{
        const btn = e.target.closest('[data-value]');
        if(!btn) return;
        setSide(btn.dataset.value);
      });


      refs.sideSegment.addEventListener('click', (e)=>{
        const btn = e.target.closest('[data-side]');
        if(!btn) return;
        setSide(btn.dataset.side);
      });

      refs.closeTextSheet.addEventListener('click', closeSheets);
      refs.cancelTextEdit.addEventListener('click', closeSheets);
      refs.closeUpgradeSheet.addEventListener('click', closeSheets);
      refs.upgradeLaterBtn.addEventListener('click', closeSheets);
      refs.overlay.addEventListener('click', closeSheets);

      refs.saveTextEdit.addEventListener('click', ()=>{
        const el = selectedElement();
        if(!el || el.type !== 'text') return;
        el.text = refs.textContentInput.value;
        el.name = refs.textContentInput.value.split('\n')[0].slice(0, 18) || 'Text';
        closeSheets();
        commitAndRender();
        showToast(appState.mode === 'basic' ? 'Wording updated' : 'Text updated');
      });

      refs.fakeUpgradeBtn.addEventListener('click', ()=>{
        closeSheets();
        setMode('custom');
        showToast('Custom mode enabled');
      });

      refs.undoBtn.addEventListener('click', undo);
      refs.redoBtn.addEventListener('click', redo);

      refs.ctxEdit.addEventListener('click', ()=>{
        const el = selectedElement();
        if(!el) return;

        if(appState.mode === 'basic'){
          if(el.type === 'text') openTextSheetFor(el);
          else openUpgradeSheet();
          return;
        }

        if(el.type === 'text') openTextSheetFor(el);
        else showToast('Use the image panel to replace the image');
      });

      refs.ctxDuplicate.addEventListener('click', ()=>{
        if(appState.mode === 'basic'){ openUpgradeSheet(); return; }
        duplicateSelected();
      });

      refs.ctxBringFront.addEventListener('click', ()=>{
        if(appState.mode === 'basic'){ openUpgradeSheet(); return; }
        bringSelectedToFront();
      });

      refs.ctxDelete.addEventListener('click', ()=>{
        if(appState.mode === 'basic'){ openUpgradeSheet(); return; }
        deleteSelected();
      });
    }

    function init(){
      renderAll(false);
      pushHistory();
      updateHistoryButtons();
      setupDivider();
      initEvents();
      lucide.createIcons();
    }
    // 초기 템플릿 그라디언트 적용
    appState.currentTemplateId = 'birthday';
    appState.sides.front = defaultState('front', TEMPLATES_INLINE[0]);
    appState.sides.back = defaultState('back', TEMPLATES_INLINE[0]);

    init();
  

  // Override setMode and setSide to prevent rendering issues if elements are missing
  function safeSetMode(mode) {
    if (appState.mode === mode) return;
    appState.mode = mode;
    if (mode === 'basic') appState.activeTab = 'text';
    try { renderAll(true); } catch(e){}
  }

  function safeSetSide(side) {
    if (appState.side === side) return;
    appState.side = side;
    appState.selectionId = null;
    try { renderAll(true); } catch(e){}
  }

  function applyTemplateToLayers(tpl) {
    const matched = TEMPLATES_INLINE.find(t => t.id === tpl.id) || TEMPLATES_INLINE[0];
    appState.currentTemplateId = matched.id;
    appState.sides.front = defaultState('front', matched);
    appState.sides.back = defaultState('back', matched);
    appState.selectionId = null;
    try { commitAndRender(); } catch(e){}
  }



  function updateSenderReceiver(sender) {
    const f = appState.sides.front.elements;
    if (f[3]) f[3].text = `From ${sender || 'Sender'}`;
    try { commitAndRender(); } catch(e){}
  }

  function getLayers() {
    return appState.sides;
  }

  // Re-run init to make sure refs are correct
  // The original init() is called at the end of the script, but we expose it.

  return {
    init: function() {
      // Re-cache refs
      refs.app = document.getElementById('app');
      refs.main = document.getElementById('main');
      refs.card = document.getElementById('card');
      refs.cardInner = document.getElementById('cardInner');
      refs.cardBgColor = document.getElementById('cardBgColor');
      refs.cardBgImage = document.getElementById('cardBgImage');
      refs.cardBgOverlay = document.getElementById('cardBgOverlay');
      refs.toolTabs = document.getElementById('toolTabs');
      refs.panelHost = document.getElementById('panelHost');
      refs.modeSegment = document.getElementById('mode-toggle');
      refs.sideSegment = document.getElementById('side-toggle');
      refs.modeBadge = document.getElementById('modeBadge');
      refs.sideBadge = document.getElementById('sideBadge');
      refs.selectionBadge = document.getElementById('selectionBadge');
      refs.divider = document.getElementById('divider');
      refs.topPane = document.getElementById('topPane');
      refs.bottomPane = document.getElementById('bottomPane');
      refs.overlay = document.getElementById('overlay');
      refs.textSheet = document.getElementById('textSheet');
      refs.textSheetTitle = document.getElementById('textSheetTitle');
      refs.textContentInput = document.getElementById('textContentInput');
      refs.closeTextSheet = document.getElementById('closeTextSheet');
      refs.cancelTextEdit = document.getElementById('cancelTextEdit');
      refs.saveTextEdit = document.getElementById('saveTextEdit');
      refs.textSheetHelper = document.getElementById('textSheetHelper');
      refs.upgradeSheet = document.getElementById('upgradeSheet');
      refs.closeUpgradeSheet = document.getElementById('closeUpgradeSheet');
      refs.fakeUpgradeBtn = document.getElementById('fakeUpgradeBtn');
      refs.upgradeLaterBtn = document.getElementById('upgradeLaterBtn');
      refs.toast = document.getElementById('toast');
      refs.toastText = document.getElementById('toastText');
      refs.toastUndo = document.getElementById('toastUndo');
      refs.undoBtn = document.getElementById('undoBtn');
      refs.redoBtn = document.getElementById('redoBtn');
      refs.contextBar = document.getElementById('contextBar');
      refs.ctxEdit = document.getElementById('ctxEdit');
      refs.ctxDuplicate = document.getElementById('ctxDuplicate');
      refs.ctxBringFront = document.getElementById('ctxBringFront');
      refs.ctxDelete = document.getElementById('ctxDelete');
      refs.basicHint = document.getElementById('basicHint');

      try { renderAll(false); } catch(e){}
    },
    resizeStages: function() {},
    switchSide: safeSetSide,
    setMode: safeSetMode,
    getLayers: getLayers,
    applyTemplateToLayers: applyTemplateToLayers,
       updateSenderReceiver: updateSenderReceiver,
    setCurrentTemplate: function(id) {
      appState.currentTemplateId = id;
    }
  };


})();
