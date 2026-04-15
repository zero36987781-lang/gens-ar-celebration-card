const CATEGORIES = [
  'affection', 'apology', 'celebration', 'checkin', 'comfort',
  'encouragement', 'forgiveness', 'gratitude', 'longing', 'praise', 'promise'
];

export async function loadAllTemplates() {
  const results = await Promise.all(
    CATEGORIES.map(cat =>
      fetch(`/data/templates/${cat}.json`).then(r => r.json())
    )
  );
  return results.flatMap((json, i) => {
    const cat = CATEGORIES[i];
    return json[cat].map(tpl => {
      const textEls = tpl.data.els.filter(e => e.type === 'text');
      return {
        ...tpl,
        category: cat,
        bg: tpl.data.bg?.src || '',
        texts: [textEls[0]?.txt || '', textEls[1]?.txt || '']
      };
    });
  });
}
