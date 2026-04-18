/**
 * GET /api/template/:id
 * R2 버킷(R2_CARDS)에서 templates/{id}.json 파일 반환, 없으면 정적 템플릿 데이터 반환
 */
import affection from '../../../src/data/templates/affection.json';
import apology from '../../../src/data/templates/apology.json';
import celebration from '../../../src/data/templates/celebration.json';
import checkin from '../../../src/data/templates/checkin.json';
import comfort from '../../../src/data/templates/comfort.json';
import encouragement from '../../../src/data/templates/encouragement.json';
import forgiveness from '../../../src/data/templates/forgiveness.json';
import gratitude from '../../../src/data/templates/gratitude.json';
import longing from '../../../src/data/templates/longing.json';
import praise from '../../../src/data/templates/praise.json';
import promise from '../../../src/data/templates/promise.json';

const CATEGORY_DATA = {
  affection, apology, celebration, checkin, comfort,
  encouragement, forgiveness, gratitude, longing, praise, promise
};

function findTemplate(id) {
  // 카테고리 직접 매치
  if (CATEGORY_DATA[id]) return CATEGORY_DATA[id];

  // {category}-... 형태의 세부 템플릿 검색
  const category = id.split('-')[0];
  const cat = CATEGORY_DATA[category];
  if (!cat) return null;

  const items = cat[category] || cat;
  if (!Array.isArray(items)) return null;

  const found = items.find(t => t.id === id);
  return found ? (found.data ?? found) : null;
}

export async function onRequestGet({ params, env }) {
  const id = params.id;

  // 1) R2에서 직접 조회
  if (env.R2_CARDS) {
    try {
      const obj = await env.R2_CARDS.get(`templates/${id}.json`);
      if (obj) {
        const text = await obj.text();
        return new Response(text, { headers: corsHeaders() });
      }
    } catch (_) {}
  }

  // 2) 정적 임포트 데이터에서 검색
  const data = findTemplate(id);
  if (data) {
    return new Response(JSON.stringify(data), { headers: corsHeaders() });
  }

  return new Response(JSON.stringify({ error: 'Template not found' }), {
    status: 404,
    headers: corsHeaders()
  });
}

function corsHeaders() {
  return { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
}
