# 독립 페이지 전환 작업절차서

> 목표: iframe 제거, 스텝별 완전 독립 페이지, R2를 통한 데이터 교환

---

## 현재 구조 (AS-IS)

```
src/
  index.html          ← 발신자 (page 0~6 다중스텝, 단일 SPA)
  recipient.html      ← 수신자
  editor/index.html   ← 캔버스 에디터 (iframe으로 index.html에 임베드)
  studio-vault-7c9a.html ← 관리자

데이터: Supabase gifts 테이블 (localStorage 폴백)
```

## 목표 구조 (TO-BE)

```
src/
  step1/index.html    ← 템플릿 선택 + 기본 정보 입력
  step2/index.html    ← 영상 녹화/업로드
  step3/index.html    ← 영상 편집 (현 editor 이관)
  step4/index.html    ← 완성 + 링크 생성
  view/index.html     ← 수신자 (현 recipient 이관)
  admin/index.html    ← 관리자

데이터: R2 sessions/{sid}/progress.json → cards/{slug}.json
```

---

## Phase 0 — 준비 (시작 전 필수)

### 0-1. 세션 ID 설계 결정

스텝 간 이동은 URL 파라미터로 session-id 전달:
```
/step1/                      ← 최초 진입, sid 생성
/step2/?sid=abc123
/step3/?sid=abc123
/step4/?sid=abc123
/view/abc123                 ← 수신자 (sid = slug)
```

### 0-2. R2 데이터 스키마 확정

**`sessions/{sid}/progress.json`** — 스텝 진행 상태
```json
{
  "sid": "abc123",
  "currentStep": 3,
  "createdAt": "2026-04-20T00:00:00Z",
  "step1": {
    "templateId": "celebration",
    "receiver": "홍길동",
    "sender": "김철수",
    "title": "생일 축하해",
    "message": "항상 건강하게",
    "backMessage": "",
    "location": { "lat": 37.5, "lng": 127.0 }
  },
  "step2": {
    "videoR2Key": "sessions/abc123/video_raw.mp4",
    "videoUrl": "https://..."
  },
  "step3": {
    "videoR2Key": "sessions/abc123/video_edited.mp4",
    "videoUrl": "https://..."
  }
}
```

**`cards/{slug}.json`** — 발행된 최종 카드 (현 gifts 테이블 대체)
```json
{
  "slug": "abc123",
  "templateId": "celebration",
  "receiver": "홍길동",
  "sender": "김철수",
  "title": "생일 축하해",
  "message": "항상 건강하게",
  "backMessage": "",
  "videoUrl": "https://...",
  "location": { "lat": 37.5, "lng": 127.0 },
  "createdAt": "2026-04-20T00:00:00Z",
  "status": "active"
}
```

---

## Phase 1 — Workers API 구현

> 이 단계가 나머지 모든 페이지의 백엔드. 먼저 완성해야 함.

### 1-1. 파일 생성

```
src/functions/api/
  session/
    init.js          ← POST: sid 발급, progress.json 초기화
    [sid].js         ← GET/PUT: progress.json 읽기/쓰기
  card/
    publish.js       ← POST: sessions/{sid}/progress → cards/{slug}.json
    [slug].js        ← GET: 수신자용 카드 조회
  upload/
    presign.js       ← POST: R2 presigned URL 발급 (영상 직접 업로드용)
  runtime-config.js  ← 기존 유지
```

### 1-2. `session/init.js`

```js
// POST /api/session/init
export async function onRequestPost({ env }) {
  const sid = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const progress = {
    sid,
    currentStep: 1,
    createdAt: new Date().toISOString()
  };
  await env.R2_CARDS.put(
    `sessions/${sid}/progress.json`,
    JSON.stringify(progress),
    { httpMetadata: { contentType: 'application/json' } }
  );
  return Response.json({ sid });
}
```

### 1-3. `session/[sid].js`

```js
// GET /api/session/:sid  → progress.json 읽기
// PUT /api/session/:sid  → 스텝 데이터 병합 저장
export async function onRequest({ request, env, params }) {
  const { sid } = params;
  const key = `sessions/${sid}/progress.json`;

  if (request.method === 'GET') {
    const obj = await env.R2_CARDS.get(key);
    if (!obj) return new Response('Not Found', { status: 404 });
    return new Response(obj.body, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (request.method === 'PUT') {
    const body = await request.json(); // { stepN: {...}, currentStep: N }
    const existing = await env.R2_CARDS.get(key);
    const current = existing ? await existing.json() : { sid };
    const merged = { ...current, ...body, sid };
    await env.R2_CARDS.put(key, JSON.stringify(merged), {
      httpMetadata: { contentType: 'application/json' }
    });
    return Response.json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
```

### 1-4. `card/publish.js`

```js
// POST /api/card/publish  body: { sid }
export async function onRequestPost({ request, env }) {
  const { sid } = await request.json();
  const progressObj = await env.R2_CARDS.get(`sessions/${sid}/progress.json`);
  if (!progressObj) return new Response('Session not found', { status: 404 });

  const progress = await progressObj.json();
  const step1 = progress.step1 || {};
  const step3 = progress.step3 || progress.step2 || {};

  const card = {
    slug: sid,
    templateId: step1.templateId,
    receiver: step1.receiver,
    sender: step1.sender,
    title: step1.title,
    message: step1.message,
    backMessage: step1.backMessage,
    location: step1.location,
    videoUrl: step3.videoUrl,
    createdAt: new Date().toISOString(),
    status: 'active'
  };

  await env.R2_CARDS.put(`cards/${sid}.json`, JSON.stringify(card), {
    httpMetadata: { contentType: 'application/json' }
  });

  return Response.json({ slug: sid });
}
```

### 1-5. `card/[slug].js`

```js
// GET /api/card/:slug
export async function onRequestGet({ env, params }) {
  const obj = await env.R2_CARDS.get(`cards/${params.slug}.json`);
  if (!obj) return new Response('Not Found', { status: 404 });
  return new Response(obj.body, {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### 1-6. `upload/presign.js`

> R2는 presigned URL을 Workers에서 직접 발급 가능 (AWS S3 방식)

```js
// POST /api/upload/presign  body: { sid, step, filename }
export async function onRequestPost({ request, env }) {
  const { sid, step, filename } = await request.json();
  const key = `sessions/${sid}/video_${step}_${filename}`;

  // Cloudflare R2 presigned URL (Workers SDK)
  const url = await env.R2_CARDS.createMultipartUpload(key); // 또는 presign
  // 실제 구현: @aws-sdk/s3-request-presigner + R2 S3 호환 엔드포인트 사용
  // 또는 Workers에서 직접 PUT 프록시 방식으로 대체 가능

  return Response.json({ url, key });
}
```

> **주의**: R2 presigned URL은 Workers에서 `PRESIGNED_URL` 방식 또는  
> `/api/upload/[sid]` 프록시 PUT 엔드포인트로 대체 구현 권장.

### 1-7. API 동작 테스트

```bash
# 로컬 테스트
npx wrangler pages dev src

# 세션 생성
curl -X POST http://localhost:8788/api/session/init
# → { "sid": "abc123def456" }

# 스텝1 저장
curl -X PUT http://localhost:8788/api/session/abc123def456 \
  -H 'Content-Type: application/json' \
  -d '{"currentStep":2,"step1":{"templateId":"celebration","receiver":"홍길동"}}'

# 조회
curl http://localhost:8788/api/session/abc123def456
```

---

## Phase 2 — Step1 페이지 구현

> 현재 `index.html`의 page 0(권한), 1(템플릿), 2(기본정보) 추출

### 2-1. 파일 생성

```
src/step1/
  index.html
src/js/step1/
  app.js
```

### 2-2. `src/step1/index.html` 구조

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <!-- 현재 index.html head 복사 -->
</head>
<body>
  <!-- 권한 게이트 (현재 #permission-gate) -->
  <div id="permission-gate">...</div>

  <!-- 템플릿 선택 (현재 page 1) -->
  <div id="template-select" hidden>...</div>

  <!-- 기본 정보 입력 (현재 page 2) -->
  <div id="basic-info" hidden>...</div>

  <!-- 위치 선택 (현재 page 3 일부) -->
  <div id="location-select" hidden>...</div>

  <script type="module" src="/js/step1/app.js"></script>
</body>
</html>
```

### 2-3. `src/js/step1/app.js` 핵심 로직

```js
// 세션 초기화
async function initSession() {
  const res = await fetch('/api/session/init', { method: 'POST' });
  const { sid } = await res.json();
  sessionStorage.setItem('chariel:sid', sid);
  return sid;
}

// 완료 시 R2 저장 후 step2로 이동
async function completeStep1(formData) {
  const sid = sessionStorage.getItem('chariel:sid');
  await fetch(`/api/session/${sid}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentStep: 2, step1: formData })
  });
  location.href = `/step2/?sid=${sid}`;
}
```

### 2-4. 현재 코드에서 이식할 부분

| 현재 위치 | 이식 대상 |
|-----------|-----------|
| `sender/app.js` `cacheDom()` perm/template/form 부분 | `step1/app.js` |
| `index.html` `#permission-gate` HTML | `step1/index.html` |
| `index.html` `#template-list` HTML | `step1/index.html` |
| `index.html` `#gift-form` HTML (수신자명, 발신자명, 제목, 메시지) | `step1/index.html` |
| `core/maps.js` MapPicker | 그대로 import |
| `css/sender.css` (관련 클래스만) | `step1/index.html` link |

---

## Phase 3 — Step2 페이지 구현

> 영상 녹화 또는 유튜브/파일 업로드

### 3-1. 파일 생성

```
src/step2/
  index.html
src/js/step2/
  app.js
```

### 3-2. 핵심 로직

```js
// URL에서 sid 읽기
const sid = new URLSearchParams(location.search).get('sid');

// 이전 스텝 데이터 로드
const res = await fetch(`/api/session/${sid}`);
const progress = await res.json();
// progress.step1.receiver 등으로 UI에 표시

// 영상 업로드 완료 후
async function completeStep2(videoUrl, videoR2Key) {
  await fetch(`/api/session/${sid}`, {
    method: 'PUT',
    body: JSON.stringify({
      currentStep: 3,
      step2: { videoUrl, videoR2Key }
    })
  });
  location.href = `/step3/?sid=${sid}`;
}
```

### 3-3. 영상 업로드 방식 결정 (택1)

**옵션 A: Workers 프록시 PUT** (단순, 권장)
```
브라우저 → POST /api/upload/video (sid, file)
Workers → R2_CARDS.put(key, body)
```

**옵션 B: R2 S3 호환 presigned URL** (대용량 효율)
```
브라우저 → POST /api/upload/presign → { url }
브라우저 → PUT url (직접 R2에 업로드)
```

---

## Phase 4 — Step3 페이지 구현

> 현재 `editor/index.html` 이관 + R2 연동

### 4-1. 현재 editor 구조 파악

- `editor/index.html` — 캔버스 에디터 (현재 standalone)
- `canvas-editor.js` — 캔버스 조작 로직

### 4-2. 변경 사항

```js
// 기존: postMessage로 부모 iframe과 통신
// 변경: URL 파라미터 sid로 R2에서 직접 읽기

const sid = new URLSearchParams(location.search).get('sid');
const progress = await fetch(`/api/session/${sid}`).then(r => r.json());
const videoUrl = progress.step2.videoUrl; // R2에서 가져온 원본 영상

// 편집 완료 후
async function completeStep3(editedVideoUrl, editedVideoR2Key) {
  await fetch(`/api/session/${sid}`, {
    method: 'PUT',
    body: JSON.stringify({
      currentStep: 4,
      step3: { videoUrl: editedVideoUrl, videoR2Key: editedVideoR2Key }
    })
  });
  location.href = `/step4/?sid=${sid}`;
}
```

### 4-3. 파일 이동

```
src/editor/index.html → src/step3/index.html (내용 이관)
src/js/sender/canvas-editor.js → src/js/step3/canvas-editor.js
```

---

## Phase 5 — Step4 페이지 구현

> 카드 발행 + 링크 생성

### 5-1. 핵심 로직

```js
const sid = new URLSearchParams(location.search).get('sid');

async function publishCard() {
  const res = await fetch('/api/card/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sid })
  });
  const { slug } = await res.json();

  const shareUrl = `${location.origin}/view/${slug}`;
  document.getElementById('share-link').textContent = shareUrl;
}
```

### 5-2. UI 구성

- 카드 미리보기 (progress.json에서 데이터 조합)
- "공유 링크 복사" 버튼
- "다시 만들기" → `/step1/`

---

## Phase 6 — View 페이지 구현

> 현재 `recipient.html` 이관

### 6-1. URL 구조

```
/view/abc123  ← slug가 URL path에 포함
```

`wrangler.toml`에 라우팅 설정 또는 `_redirects` 활용:
```
# src/_redirects
/view/*  /view/index.html  200
```

### 6-2. 핵심 로직

```js
// /view/abc123 에서 slug 추출
const slug = location.pathname.split('/').filter(Boolean).pop();

const res = await fetch(`/api/card/${slug}`);
if (!res.ok) { /* 404 처리 */ return; }
const card = await res.json();

// card.videoUrl, card.receiver, card.message 등으로 UI 렌더링
```

### 6-3. 현재 코드에서 이식

| 현재 위치 | 이식 대상 |
|-----------|-----------|
| `recipient.html` HTML 구조 | `view/index.html` |
| `js/recipient/app.js` | `js/view/app.js` |
| `getGiftBySlug()` 호출 | `/api/card/${slug}` fetch로 교체 |
| AR 기능 (`webxr-engine.js`) | 그대로 import |

---

## Phase 7 — 관리자 페이지 이관

```
src/studio-vault-7c9a.html → src/admin/index.html
```

- `/api/card/` 목록 조회 API 추가 필요
- Supabase auth → Cloudflare Access 또는 간단한 비밀번호 보호로 대체 가능

---

## Phase 8 — Supabase 제거

> data-service.js와 auth.js 의존성 제거

### 8-1. 제거 대상

```
src/js/core/auth.js          ← 전체 삭제
src/js/core/data-service.js  ← 전체 삭제
src/js/core/storage.js       ← localStorage 폴백, 삭제 또는 유지
```

### 8-2. 대체

| 기존 함수 | 대체 |
|-----------|------|
| `saveGift(gift)` | `PUT /api/session/{sid}` + `POST /api/card/publish` |
| `getGiftBySlug(slug)` | `GET /api/card/{slug}` |
| `getAllGifts()` | `GET /api/admin/cards` (신규 구현) |
| `getSupabaseClient()` | 불필요 |

### 8-3. 환경변수 정리

```toml
# wrangler.toml에서 제거 가능
# SUPABASE_URL, SUPABASE_SERVICE_KEY → 불필요
```

---

## Phase 9 — 라우팅 및 배포 설정

### 9-1. `src/_headers` 업데이트

```
/step*/
  Cache-Control: no-store
/view/*
  Cache-Control: no-store
/api/*
  Cache-Control: no-store
```

### 9-2. `src/_redirects`

```
/view/*   /view/index.html   200
/admin/*  /admin/index.html  200
```

### 9-3. `wrangler.toml` 최종

```toml
name = "gens-ar-celebration-card"
compatibility_date = "2024-01-01"
pages_build_output_dir = "src"

[[r2_buckets]]
binding = "R2_CARDS"
bucket_name = "gens-ar-cards"
```

---

## Phase 10 — 통합 테스트

### 10-1. 로컬 테스트 순서

```bash
npx wrangler pages dev src
```

1. `/step1/` 접속 → sid 생성 확인 (Network 탭)
2. 템플릿 선택 + 정보 입력 → `/step2/?sid=xxx` 이동 확인
3. 영상 업로드 → R2 콘솔에서 `sessions/xxx/` 키 존재 확인
4. 편집 → `/step4/?sid=xxx` 이동 확인
5. 발행 → `cards/xxx.json` R2 콘솔 확인
6. `/view/xxx` 접속 → 카드 정상 렌더링 확인

### 10-2. 모바일 테스트

```bash
# 로컬 IP로 모바일에서 접속
npx wrangler pages dev src --ip 0.0.0.0
# http://192.168.x.x:8788/step1/
```

체크리스트:
- [ ] 카메라/마이크 권한 게이트 동작
- [ ] 위치 권한 동작
- [ ] 영상 녹화 → 업로드 완료
- [ ] 편집 터치 인터랙션
- [ ] 링크 공유 → 수신자 재생

---

## GitHub 리포지토리 분리 여부

**현재 리포 유지 권장** (분리 불필요):

- 모든 스텝이 같은 Cloudflare Pages 프로젝트에서 서빙
- R2 바인딩, Workers 설정 공유
- 배포 단위가 동일

분리가 필요한 경우: 스텝별로 팀이 다르거나, 스텝 중 하나를 다른 인프라(예: Next.js 앱)로 교체할 때

---

## 작업 우선순위 요약

```
Phase 0  데이터 스키마 확정          ← 30분, 나머지 모두 블로킹
Phase 1  Workers API 구현            ← 2~3시간
Phase 2  Step1 (템플릿+정보 입력)    ← 3~4시간
Phase 3  Step2 (영상 업로드)         ← 2~3시간
Phase 4  Step3 (영상 편집 이관)      ← 2~3시간
Phase 5  Step4 (발행+링크)           ← 1~2시간
Phase 6  View 페이지 이관            ← 2~3시간
Phase 7  관리자 이관                 ← 1~2시간
Phase 8  Supabase 제거               ← 1시간
Phase 9  라우팅/배포 설정            ← 30분
Phase 10 통합 테스트                 ← 2~3시간
```

총 예상 작업량: **17~27시간**
