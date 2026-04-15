const _elBase = {
  rot: 0, opa: 100, sh: false,
  sdirs: ['bottom-right'], sdist: 8, sblur: 12, sclrHex: '#000000', sopa: 18,
  tsh: false, tsdirs: ['bottom-right'], tsdist: 4, tsblur: 4, tsclrHex: '#000000', tsopa: 30,
  ift: false, ifdirs: ['bottom'], ifamt: 100, ifsoft: 50, ifclr: '#ffffff',
  bft: false, bfdirs: ['bottom'], bfamt: 40, bfsoft: 50, bfclr: '#ffffff',
  mot: 'none', motDur: 2, motDelay: 0, motCount: 'infinite', motEase: 'ease-in-out',
  motAmp: 12, motScl: 1.5, motOMax: 1, motOMin: 0.1, motSlideDir: 'bottom'
};

function _img(id, x, y, w, h, src, extra = {}) {
  return {
    ..._elBase, id, type: 'img', x, y, w, h, z: 1,
    src, filt: 'none', bg: 'transparent',
    bw: 3, bc: '#ffffff', bs: 'solid', br: 18,
    sh: true, ...extra
  };
}

function _txt(id, x, y, w, h, txt, size, font, extra = {}) {
  return {
    ..._elBase, id, type: 'text', x, y, w, h,
    txt, size, font,
    clr: '#ffffff', align: 'left', space: 0, line: 1.2,
    strokeClr: 'transparent', strokeW: 0, txtGrad: null,
    bg: 'transparent', bw: 0, bc: '#000000', bs: 'solid', br: 0,
    tsh: true, tsdist: 2, tsblur: 8, tsopa: 14,
    z: 2, ...extra
  };
}

function _bg(src) {
  return { type: 'img', src, opa: 100, filt: 'none' };
}

export const CARD_SAMPLES = [
  {
    id: 'gratitude-soft-bloom',
    name: 'Soft Bloom Thanks',
    category: 'gratitude',
    bg: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=80',
    texts: ['Thank You\nSo Much', 'For your kindness,\nyour care, and your heart.'],
    data: {
      els: [
        _img(101, 160, 214, 78, 92,
          'https://images.unsplash.com/photo-1526045478516-99145907023c?auto=format&fit=crop&w=700&q=80',
          { rot: -6 }),
        _txt(102, 24, 40, 172, 56,
          'Thank You\nSo Much', 28, 'Playfair Display',
          { line: 1.02, txtGrad: 'linear-gradient(90deg,#FFFFFF 0%,#FFF0C7 100%)', z: 2 }),
        _txt(103, 24, 112, 168, 40,
          'For your kindness,\nyour care, and your heart.', 13, 'Poppins',
          { line: 1.35, z: 3 }),
        _txt(104, 24, 268, 176, 44,
          'Your thoughtfulness made\nall the difference.', 13, 'Open Sans',
          { bg: 'rgba(255,255,255,0.18)', br: 14, tsh: false, z: 4 })
      ],
      bg: _bg('https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1200&q=80')
    }
  },
  {
    id: 'birthday-fresh-light',
    name: 'Fresh Birthday Light',
    category: 'birthday',
    bg: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80',
    texts: ['Happy\nBirthday', 'A bright new chapter\nbegins today.'],
    data: {
      els: [
        _img(201, 168, 220, 76, 76,
          'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=700&q=80',
          { rot: 7 }),
        _txt(202, 24, 38, 178, 58,
          'Happy\nBirthday', 30, 'Bebas Neue',
          { clr: 'transparent', space: 0.03, line: 1, txtGrad: 'linear-gradient(90deg,#FFFFFF 0%,#FFE7C2 100%)', z: 2 }),
        _txt(203, 24, 104, 172, 40,
          'A bright new chapter\nbegins today.', 13, 'Poppins',
          { line: 1.35, z: 3 }),
        _txt(204, 24, 268, 180, 44,
          'Wishing you laughter,\nbeauty, and sweet surprises.', 13, 'Open Sans',
          { bg: 'rgba(255,255,255,0.18)', br: 14, tsh: false, z: 4 })
      ],
      bg: _bg('https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80')
    }
  },
  {
    id: 'congrats',
    name: 'Congrats',
    category: 'congrats',
    bg: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80',
    texts: ['You Did It', 'This moment belongs\nentirely to you.'],
    data: {
      els: [
        _img(301, 164, 210, 82, 82,
          'https://images.unsplash.com/photo-1543269664-56d93c1b41a6?auto=format&fit=crop&w=700&q=80',
          { rot: 4 }),
        _txt(302, 24, 38, 196, 50,
          'You Did It', 34, 'Bebas Neue',
          { clr: 'transparent', space: 0.04, line: 1, txtGrad: 'linear-gradient(90deg,#FFFFFF 0%,#FFEAB0 100%)', z: 2 }),
        _txt(303, 24, 100, 172, 40,
          'This moment belongs\nentirely to you.', 13, 'Poppins',
          { line: 1.35, z: 3 }),
        _txt(304, 24, 268, 180, 44,
          'Hard work and heart\npaved every step here.', 13, 'Open Sans',
          { bg: 'rgba(255,255,255,0.18)', br: 14, tsh: false, z: 4 })
      ],
      bg: _bg('https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=80')
    }
  },
  {
    id: 'wedding',
    name: 'Wedding',
    category: 'wedding',
    bg: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80',
    texts: ['Forever\nStarts Now', 'Two souls, one\nbeautiful beginning.'],
    data: {
      els: [
        _img(401, 162, 216, 80, 88,
          'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=700&q=80',
          { rot: -3 }),
        _txt(402, 24, 38, 178, 58,
          'Forever\nStarts Now', 28, 'Playfair Display',
          { line: 1.08, txtGrad: 'linear-gradient(90deg,#FFFFFF 0%,#FFE8D6 100%)', z: 2 }),
        _txt(403, 24, 108, 170, 40,
          'Two souls, one\nbeautiful beginning.', 13, 'Poppins',
          { line: 1.35, z: 3 }),
        _txt(404, 24, 268, 180, 44,
          'May every day be filled\nwith love and grace.', 13, 'Open Sans',
          { bg: 'rgba(255,255,255,0.18)', br: 14, tsh: false, z: 4 })
      ],
      bg: _bg('https://images.unsplash.com/photo-1519741497674-611481863552?w=800&auto=format&fit=crop&q=80')
    }
  },
  {
    id: 'anniversary',
    name: 'Anniversary',
    category: 'anniversary',
    bg: 'https://images.unsplash.com/photo-1606216174052-c74b3f25ae28?w=800&auto=format&fit=crop&q=80',
    texts: ['Happy\nAnniversary', 'Still choosing each other,\nevery single day.'],
    data: {
      els: [
        _img(501, 162, 210, 80, 86,
          'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=700&q=80',
          { rot: -5 }),
        _txt(502, 24, 38, 192, 56,
          'Happy\nAnniversary', 26, 'Playfair Display',
          { line: 1.1, txtGrad: 'linear-gradient(90deg,#FFFFFF 0%,#FFDDE4 100%)', z: 2 }),
        _txt(503, 24, 106, 172, 40,
          'Still choosing each other,\nevery single day.', 13, 'Poppins',
          { line: 1.35, z: 3 }),
        _txt(504, 24, 268, 180, 44,
          'Years of memories,\ncountless more to come.', 13, 'Open Sans',
          { bg: 'rgba(255,255,255,0.18)', br: 14, tsh: false, z: 4 })
      ],
      bg: _bg('https://images.unsplash.com/photo-1606216174052-c74b3f25ae28?w=800&auto=format&fit=crop&q=80')
    }
  },
  {
    id: 'new-home',
    name: 'New Home',
    category: 'new-home',
    bg: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format&fit=crop&q=80',
    texts: ['Welcome\nHome', 'A new door opens to\na whole new life.'],
    data: {
      els: [
        _img(601, 162, 212, 80, 84,
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=700&q=80',
          { rot: 3 }),
        _txt(602, 24, 38, 180, 54,
          'Welcome\nHome', 32, 'Bebas Neue',
          { clr: 'transparent', space: 0.04, line: 1, txtGrad: 'linear-gradient(90deg,#FFFFFF 0%,#D6F0FF 100%)', z: 2 }),
        _txt(603, 24, 104, 172, 40,
          'A new door opens to\na whole new life.', 13, 'Poppins',
          { line: 1.35, z: 3 }),
        _txt(604, 24, 268, 180, 44,
          'May this space be filled\nwith joy and warmth.', 13, 'Open Sans',
          { bg: 'rgba(255,255,255,0.18)', br: 14, tsh: false, z: 4 })
      ],
      bg: _bg('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&auto=format&fit=crop&q=80')
    }
  },
  {
    id: 'thank-you',
    name: 'Thank You',
    category: 'thank-you',
    bg: 'https://images.unsplash.com/photo-1525909002519-e21cda53d584?w=800&auto=format&fit=crop&q=80',
    texts: ['Thank You', 'Your kindness landed\nexactly when it was needed.'],
    data: {
      els: [
        _img(701, 160, 212, 78, 82,
          'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=700&q=80',
          { rot: -4 }),
        _txt(702, 24, 38, 196, 50,
          'Thank You', 36, 'Playfair Display',
          { line: 1.05, txtGrad: 'linear-gradient(90deg,#FFFFFF 0%,#FFF3C4 100%)', z: 2 }),
        _txt(703, 24, 100, 172, 40,
          'Your kindness landed\nexactly when it was needed.', 13, 'Poppins',
          { line: 1.35, z: 3 }),
        _txt(704, 24, 268, 180, 44,
          'Grateful beyond\nwords can say.', 13, 'Open Sans',
          { bg: 'rgba(255,255,255,0.18)', br: 14, tsh: false, z: 4 })
      ],
      bg: _bg('https://images.unsplash.com/photo-1525909002519-e21cda53d584?w=800&auto=format&fit=crop&q=80')
    }
  },
  {
    id: 'praise',
    name: 'Praise',
    category: 'praise',
    bg: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=80',
    texts: ['You Shine\nBright', 'Your brilliance is\nimpossible to ignore.'],
    data: {
      els: [
        _img(801, 162, 210, 80, 84,
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=700&q=80',
          { rot: 5 }),
        _txt(802, 24, 38, 190, 56,
          'You Shine\nBright', 30, 'Bebas Neue',
          { clr: 'transparent', space: 0.04, line: 1, txtGrad: 'linear-gradient(90deg,#FFFFFF 0%,#FFE8A0 100%)', z: 2 }),
        _txt(803, 24, 104, 172, 40,
          'Your brilliance is\nimpossible to ignore.', 13, 'Poppins',
          { line: 1.35, z: 3 }),
        _txt(804, 24, 268, 180, 44,
          'The work you do\ninspires everyone around you.', 13, 'Open Sans',
          { bg: 'rgba(255,255,255,0.18)', br: 14, tsh: false, z: 4 })
      ],
      bg: _bg('https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&auto=format&fit=crop&q=80')
    }
  },
  {
    id: 'encouragement',
    name: 'Encouragement',
    category: 'encouragement',
    bg: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80',
    texts: ['Keep Going', 'Every step forward\nis a victory.'],
    data: {
      els: [
        _img(901, 162, 212, 80, 80,
          'https://images.unsplash.com/photo-1502481851512-e9e2529bfbf9?auto=format&fit=crop&w=700&q=80',
          { rot: 6 }),
        _txt(902, 24, 38, 200, 50,
          'Keep Going', 36, 'Bebas Neue',
          { clr: 'transparent', space: 0.06, line: 1, txtGrad: 'linear-gradient(90deg,#FFFFFF 0%,#C8E6FF 100%)', z: 2 }),
        _txt(903, 24, 100, 172, 40,
          'Every step forward\nis a victory.', 13, 'Poppins',
          { line: 1.35, z: 3 }),
        _txt(904, 24, 268, 180, 44,
          'You have more strength\nthan you know.', 13, 'Open Sans',
          { bg: 'rgba(255,255,255,0.18)', br: 14, tsh: false, z: 4 })
      ],
      bg: _bg('https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80')
    }
  },
  {
    id: 'comfort',
    name: 'Comfort',
    category: 'comfort',
    bg: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&auto=format&fit=crop&q=80',
    texts: ['You Are\nNot Alone', 'Compassion for\nwhat you carry.'],
    data: {
      els: [
        _img(1001, 162, 212, 80, 84,
          'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=700&q=80',
          { rot: -3 }),
        _txt(1002, 24, 38, 190, 60,
          'You Are\nNot Alone', 28, 'Playfair Display',
          { line: 1.1, txtGrad: 'linear-gradient(90deg,#FFFFFF 0%,#D8EEFF 100%)', z: 2 }),
        _txt(1003, 24, 110, 172, 40,
          'Compassion for\nwhat you carry.', 13, 'Poppins',
          { line: 1.35, z: 3 }),
        _txt(1004, 24, 268, 180, 44,
          'I am here,\nright beside you.', 13, 'Open Sans',
          { bg: 'rgba(255,255,255,0.18)', br: 14, tsh: false, z: 4 })
      ],
      bg: _bg('https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=800&auto=format&fit=crop&q=80')
    }
  }
];
