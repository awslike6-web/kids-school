/**
 * ⚡ Cloudflare Worker: minmin-notion 전사 단일 통합 초고속 엣지 캐시 & 노션 프록시 (v4.2 완결판)
 * 
 * 💡 통합 서빙 도메인:
 *  1. 🧸 보육비서 (Daycare-Helper): 3대 핵심 DB 엄격 보안 가드 (guardDaycareProxy) & CORS 안전 처리
 *  2. 📚 공부방 (Kids-School): 부트스트랩 번들링, 엣지 캐시, Gemini AI, Edge TTS
 *  3. 📸 패밀리 아카이브: 모바일 퀵업로드 미디어 큐 & 노션 연동 파이프라인 2.1 (L2 영구 인덱스 + GitHub SHA 덮어쓰기 방어)
 */

// ============================================================================
// 🧸 [보육비서] 노션 데이터베이스 보안 격리 가드 (Daycare Proxy Guard)
// ============================================================================
const protectedIds = new Set([
  "3e0a27115b688186ad30cbaea7687006",
  "3e0a27115b688182955ef116e4174e3a",
  "3e0a27115b6881229eeadd49bf8a625c"
]);

function normalizeId(value) {
  return String(value || "").replace(/-/g, "").toLowerCase();
}

function daycareDenied() {
  return new Response(JSON.stringify({ error: "보육 기록은 보육비서에서 인증 후 이용해 주세요." }), {
    status: 403,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS_HEADERS }
  });
}

function constantTimeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function guardDaycareProxy(request, env, callRaw, resolveAuth) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/v1/") || url.pathname === "/v1/gemini" || url.pathname === "/v1/audio/speech") return null;
  const auth = resolveAuth(request, env);
  if (!auth) return null;

  if (env && env.DAYCARE_SERVICE_KEY && constantTimeEqual(request.headers.get("X-Daycare-Service-Key"), env.DAYCARE_SERVICE_KEY)) {
    const body = ["GET", "HEAD"].includes(request.method) ? null : await request.clone().text();
    const response = await callRaw(url.pathname + url.search, request.method, body, auth);
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS_HEADERS }
    });
  }

  async function isProtected(type, id, depth = 0) {
    if (protectedIds.has(normalizeId(id))) return true;
    if (type === "databases") return false;
    if (depth > 20 || !/^[a-f0-9-]{32,36}$/i.test(id || "")) return true;
    const response = await callRaw(`/v1/${type}/${encodeURIComponent(id)}`, "GET", null, auth);
    if (!response.ok) return true;
    const object = await response.json();
    const p = object.parent || {};
    if (p.database_id) return protectedIds.has(normalizeId(p.database_id));
    if (p.data_source_id) return true;
    if (p.page_id) return isProtected("pages", p.page_id, depth + 1);
    if (p.block_id) return isProtected("blocks", p.block_id, depth + 1);
    return false;
  }

  const match = url.pathname.match(/^\/v1\/(databases|pages|blocks)\/([^/]+)/);
  if (match && await isProtected(match[1], decodeURIComponent(match[2]))) return daycareDenied();
  if (url.pathname === "/v1/search") return daycareDenied();

  if (["POST", "PATCH"].includes(request.method)) {
    let body;
    try {
      body = await request.clone().json();
    } catch {
      return daycareDenied();
    }
    const parent = body.parent || {};
    if (parent.database_id && protectedIds.has(normalizeId(parent.database_id))) return daycareDenied();
    if (parent.page_id && await isProtected("pages", parent.page_id)) return daycareDenied();
    if (parent.block_id && await isProtected("blocks", parent.block_id)) return daycareDenied();
  }
  return null;
}

// ============================================================================
// 🏰 노션 프록시 & CORS 설정
// ============================================================================
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, User-Agent, Notion-Version, X-Daycare-Service-Key, Pragma, Cache-Control, x-requested-with',
  'Access-Control-Max-Age': '86400',
};

const NOTION_API_BASE = 'https://api.notion.com';
const NOTION_VERSION = '2022-06-28';

const DEFAULT_DBS = {
  INVENTORY: '374a27115b688042bb61e6a102242e12',
  STUDY_LOG: '37aa27115b688001b2ffe5e6c8f82ab2',
  VOCA: '375a27115b688038b686d3994ee12919',
  STATIC_TIMETABLE: '32ba27115b68828bbda201a1bdce12fc',
  EVENT_OVERLAY: 'e3f9b3917c2b48bfa3d47db4bd0545fd',
  CHAT_MEMORY: '373a27115b6880ba82cdfeaa1c825547',
  CURRICULUM: '3e8a27115b68806d94bfc81e9b3435fa'
};

const CACHE_TTL_QUERY = 300;
const CACHE_TTL_BOOTSTRAP = 180;

// ============================================================================
// ⚡ 2계층 스마트 캐시 시스템 (L1: In-Memory / L2: Cloudflare Cache API)
// ============================================================================
const MEMORY_CACHE = new Map();
const MAX_MEM_CACHE_ENTRIES = 300;

function getFromMemoryCache(key) {
  const item = MEMORY_CACHE.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    MEMORY_CACHE.delete(key);
    return null;
  }
  return item;
}

function saveToMemoryCache(key, bodyText, status, headers, ttlSeconds) {
  if (MEMORY_CACHE.size >= MAX_MEM_CACHE_ENTRIES) {
    const firstKey = MEMORY_CACHE.keys().next().value;
    MEMORY_CACHE.delete(firstKey);
  }
  MEMORY_CACHE.set(key, {
    body: bodyText,
    status,
    headers: Array.from(headers.entries()),
    expiresAt: Date.now() + (ttlSeconds * 1000)
  });
}

function createMemoryCacheResponse(cachedItem, source = 'HIT') {
  const headers = new Headers(cachedItem.headers);
  headers.set('X-Cache-Status', source);
  headers.set('Access-Control-Allow-Origin', '*');
  return new Response(cachedItem.body, {
    status: cachedItem.status,
    headers
  });
}

// ============================================================================
// 🔑 Edge TTS 엔진 (Microsoft Edge Neural AI)
// ============================================================================
const TRUSTED_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const DEFAULT_VOICE = 'ko-KR-SunHiNeural';
const SEC_MS_GEC_VERSION = '1-143.0.3650.75';

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function dateToString() {
  const d = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayName = days[d.getUTCDay()];
  const monName = months[d.getUTCMonth()];
  const day = String(d.getUTCDate()).padStart(2, '0');
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const mins = String(d.getUTCMinutes()).padStart(2, '0');
  const secs = String(d.getUTCSeconds()).padStart(2, '0');
  return `${dayName} ${monName} ${day} ${year} ${hours}:${mins}:${secs} GMT+0000 (Coordinated Universal Time)`;
}

async function generateSecMsGec() {
  const WIN_EPOCH = 11644473600;
  let ticks = Date.now() / 1000 + WIN_EPOCH;
  ticks -= ticks % 300;
  ticks = Math.floor(ticks * 10000000);
  const strToHash = `${ticks}${TRUSTED_TOKEN}`;
  const msgUint8 = new TextEncoder().encode(strToHash);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

async function synthesizeEdgeTTS(text, voice = DEFAULT_VOICE, rate = '+6%', pitch = '+4Hz') {
  const connectionId = crypto.randomUUID().replace(/-/g, '');
  const secMsGec = await generateSecMsGec();
  const muid = crypto.randomUUID().replace(/-/g, '').toUpperCase();
  const targetUrl = `https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_TOKEN}&ConnectionId=${connectionId}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;

  const resp = await fetch(targetUrl, {
    headers: {
      'Upgrade': 'websocket',
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache',
      'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cookie': `muid=${muid};`
    }
  });

  const ws = resp.webSocket;
  if (!ws) throw new Error(`Edge TTS WebSocket handshake failed (HTTP ${resp.status})`);
  ws.accept();

  return new Promise((resolve, reject) => {
    const audioChunks = [];
    const debugLogs = [];
    const dateStr = dateToString();
    const reqId = crypto.randomUUID().replace(/-/g, '');

    const timeout = setTimeout(() => {
      try { ws.close(); } catch (e) {}
      if (audioChunks.length > 0) finishSuccess();
      else reject(new Error('Edge TTS synthesis timeout (10s). Logs: ' + JSON.stringify(debugLogs)));
    }, 10000);

    const finishSuccess = () => {
      clearTimeout(timeout);
      try { ws.close(); } catch (e) {}
      if (audioChunks.length === 0) {
        reject(new Error('No audio chunks collected. Trace: ' + JSON.stringify(debugLogs)));
        return;
      }
      const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of audioChunks) {
        combined.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }
      resolve(combined.buffer);
    };

    const configMsg = `X-Timestamp:${dateStr}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n`;
    ws.send(configMsg);

    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'><prosody pitch='${pitch}' rate='${rate}'>${escapeXml(text)}</prosody></voice></speak>`;
    const ssmlMsg = `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${dateStr}Z\r\nPath:ssml\r\n\r\n${ssml}`;
    ws.send(ssmlMsg);

    ws.addEventListener('message', async (event) => {
      if (typeof event.data === 'string') {
        debugLogs.push('T:' + event.data.substring(0, 30));
        if (event.data.includes('Path:turn.end')) finishSuccess();
      } else {
        let buf = null;
        if (event.data instanceof ArrayBuffer) buf = event.data;
        else if (event.data instanceof Uint8Array) buf = event.data.buffer;
        else if (event.data && typeof event.data.arrayBuffer === 'function') buf = await event.data.arrayBuffer();

        if (buf && buf.byteLength > 2) {
          const view = new DataView(buf);
          const headerLength = view.getUint16(0, false);
          if (buf.byteLength >= 2 + headerLength) {
            const headerStr = new TextDecoder('utf-8').decode(new Uint8Array(buf, 2, headerLength));
            if (headerStr.includes('Path:audio')) {
              const audioData = buf.slice(2 + headerLength);
              if (audioData.byteLength > 0) {
                audioChunks.push(audioData);
                debugLogs.push('A:' + audioData.byteLength);
              }
            }
          }
        }
      }
    });

    ws.addEventListener('error', (err) => {
      clearTimeout(timeout);
      try { ws.close(); } catch (e) {}
      reject(new Error('Edge TTS WebSocket Error: ' + (err.message || 'Unknown')));
    });

    ws.addEventListener('close', () => {
      if (audioChunks.length > 0) finishSuccess();
    });
  });
}

async function sha256Hex(str) {
  const msgUint8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function createCacheKeyRequest(origin, virtualPath, hash) {
  const cacheUrl = `${origin}/__cf_cache${virtualPath}?h=${hash}`;
  return new Request(cacheUrl, { method: 'GET' });
}

function getNotionAuthHeader(request, env) {
  const clientAuth = request.headers.get('Authorization');
  if (clientAuth && clientAuth.startsWith('Bearer secret_')) return clientAuth;
  const token = env && (env.NOTION_TOKEN || env.NOTION_API_KEY);
  if (token) return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  return clientAuth || '';
}

async function callNotionRaw(endpoint, method, body, authHeader) {
  const targetUrl = `${NOTION_API_BASE}${endpoint}`;
  const headers = {
    'Authorization': authHeader,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json'
  };
  const options = { method, headers };
  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  return await fetch(targetUrl, options);
}

// ============================================================================
// 📸 미디어 퀵업로드 파이프라인 핸들러 (/api/upload-media, /api/pending-media)
// ============================================================================
const MEDIA_QUEUE = new Map();
const MAX_MEDIA_QUEUE_SIZE = 100;
const GALLERY_DIARY_DB_ID = '3dfa27115b688010a85be385f91d64ee';

// L2 Cache 기반 큐 인덱스 동기화 헬퍼 (워커 콜드스타트 복원 지원)
async function syncMediaIndexCache(origin, ctx, cache) {
  try {
    const ids = Array.from(MEDIA_QUEUE.keys());
    const indexReq = createCacheKeyRequest(origin, '/__pending_media_index', 'v1');
    const indexResp = new Response(JSON.stringify(ids), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=604800', ...CORS_HEADERS }
    });
    if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(indexReq, indexResp));
    else await cache.put(indexReq, indexResp);
  } catch (e) {}
}

async function restoreMediaQueueFromCache(origin) {
  try {
    const cache = caches.default;
    const indexReq = createCacheKeyRequest(origin, '/__pending_media_index', 'v1');
    const indexMatch = await cache.match(indexReq);
    if (!indexMatch) return;
    const ids = await indexMatch.json();
    if (!Array.isArray(ids)) return;

    for (const id of ids) {
      if (MEDIA_QUEUE.has(id)) continue;
      const itemReq = createCacheKeyRequest(origin, `/__pending_media/${id}`, 'item');
      const itemMatch = await cache.match(itemReq);
      if (itemMatch) {
        const itemData = await itemMatch.json();
        MEDIA_QUEUE.set(id, itemData);
      }
    }
  } catch (e) {}
}

async function handleUploadMedia(request, env, ctx) {
  try {
    const data = await request.json();
    const { id, filename, author, category, memo, date, image, createNotionPage = true } = data;

    if (!image || !filename) {
      return new Response(JSON.stringify({ error: 'image (base64) and filename are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    const uploadId = id || `up_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const uploadDate = date || new Date().toISOString().split('T')[0];
    const uploadAuthor = author || '민수';
    const uploadCategory = category || '만들기/공예';
    const uploadMemo = memo || '';

    const base64Data = image.includes(';base64,') ? image.split(';base64,')[1] : image;
    let githubCommitted = false;
    let githubError = null;

    // 1. GitHub API 직접 커밋 (GITHUB_TOKEN 있을 시 - SHA 자동 확인으로 422 덮어쓰기 방어)
    const githubToken = env && (env.GITHUB_TOKEN || env.GH_TOKEN);
    if (githubToken) {
      try {
        let subFolder = '갤러리/' + uploadAuthor;
        if (uploadCategory === '종이일기') subFolder = '일기/' + uploadAuthor;
        else if (uploadCategory === '특별한 날') subFolder = '갤러리/하루아카이브/공통';

        const filePath = `uploads/ex/${subFolder}/${filename}`;
        const ghUrl = `https://api.github.com/repos/awslike6-web/kids-school/contents/${encodeURI(filePath)}`;

        // 중복 파일명 체크 (SHA 획득)
        let fileSha = undefined;
        try {
          const checkRes = await fetch(ghUrl, {
            headers: {
              'Authorization': `token ${githubToken}`,
              'User-Agent': 'Minmin-Worker-Media-Pipeline'
            }
          });
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            fileSha = checkData.sha;
          }
        } catch (e) {}

        const putBody = {
          message: `feat(media): [모바일 퀵업로드] ${uploadAuthor} ${uploadCategory} (${filename})`,
          content: base64Data,
          branch: 'main'
        };
        if (fileSha) putBody.sha = fileSha;

        const ghRes = await fetch(ghUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${githubToken}`,
            'User-Agent': 'Minmin-Worker-Media-Pipeline',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(putBody)
        });

        if (ghRes.ok) githubCommitted = true;
        else {
          const errText = await ghRes.text();
          githubError = `GitHub HTTP ${ghRes.status}: ${errText.substring(0, 80)}`;
        }
      } catch (ghErr) {
        githubError = ghErr.message;
      }
    }

    // 2. 큐 보관 (메모리 + L2 Cache API 7일 보존 & 인덱스 갱신)
    const mediaItem = {
      id: uploadId,
      filename,
      author: uploadAuthor,
      category: uploadCategory,
      memo: uploadMemo,
      date: uploadDate,
      timestamp: new Date().toISOString(),
      githubCommitted,
      githubError,
      imageSize: base64Data.length,
      image: image
    };

    if (MEDIA_QUEUE.size >= MAX_MEDIA_QUEUE_SIZE) {
      const oldestKey = MEDIA_QUEUE.keys().next().value;
      MEDIA_QUEUE.delete(oldestKey);
    }
    MEDIA_QUEUE.set(uploadId, mediaItem);

    const origin = new URL(request.url).origin;
    const cache = caches.default;

    try {
      const mediaReq = createCacheKeyRequest(origin, `/__pending_media/${uploadId}`, 'item');
      const mediaResp = new Response(JSON.stringify(mediaItem), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=604800',
          ...CORS_HEADERS
        }
      });
      if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(mediaReq, mediaResp));
      else await cache.put(mediaReq, mediaResp);

      await syncMediaIndexCache(origin, ctx, cache);
    } catch (e) {}

    // 3. 노션 DB 페이지 자동 생성
    let notionPageId = null;
    let notionError = null;
    if (createNotionPage) {
      try {
        const authHeader = getNotionAuthHeader(request, env);
        if (authHeader) {
          const shortTitle = uploadMemo || `${uploadCategory} 기록`;
          const recordTitle = `[퀵업로드] ${uploadAuthor}_${uploadDate} (${shortTitle})`;
          let heroSelect = uploadAuthor;
          if (uploadAuthor === '아빠' || uploadAuthor === '엄마') heroSelect = '부모관리자';

          const pageBody = {
            parent: { database_id: GALLERY_DIARY_DB_ID },
            properties: {
              '식별ID': { title: [{ text: { content: recordTitle } }] },
              '구분': { select: { name: uploadCategory } },
              '주인공': { select: { name: heroSelect } },
              '날짜': { date: { start: uploadDate } },
              '작가의 한마디/일기본문': {
                rich_text: [{ text: { content: uploadMemo || `[모바일 퀵업로드] ${uploadAuthor}의 사진이 등록되었습니다. (${filename})` } }]
              }
            },
            children: [
              {
                object: 'block',
                type: 'callout',
                callout: {
                  icon: { type: 'emoji', emoji: '📸' },
                  rich_text: [{
                    type: 'text',
                    text: { content: `[모바일 퀵업로드] 파일명: ${filename} · 작성자: ${uploadAuthor} · 분류: ${uploadCategory}` }
                  }]
                }
              }
            ]
          };

          if (uploadMemo) {
            pageBody.children.push({
              object: 'block',
              type: 'paragraph',
              paragraph: { rich_text: [{ type: 'text', text: { content: uploadMemo } }] }
            });
          }

          const nRes = await callNotionRaw('/v1/pages', 'POST', pageBody, authHeader);
          if (nRes.ok) {
            const nData = await nRes.json();
            notionPageId = nData.id;
          } else {
            notionError = `Notion HTTP ${nRes.status}`;
          }
        }
      } catch (nErr) {
        notionError = nErr.message;
      }
    }

    return new Response(JSON.stringify({
      status: 'ok',
      id: uploadId,
      filename,
      githubCommitted,
      githubError,
      notionPageId,
      notionError,
      timestamp: mediaItem.timestamp
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Media upload failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

async function handleGetPendingMedia(url, request, env) {
  const includeData = url.searchParams.get('include_data') === 'true';
  const targetId = url.searchParams.get('id');

  // 콜드스타트 복원: 큐가 비어있으면 L2 Cache에서 인덱스 복원 시도
  if (MEDIA_QUEUE.size === 0) {
    await restoreMediaQueueFromCache(url.origin);
  }

  if (targetId) {
    let item = MEDIA_QUEUE.get(targetId);
    if (!item) {
      // 캐시에서 직접 개별 조회 시도
      try {
        const cache = caches.default;
        const itemReq = createCacheKeyRequest(url.origin, `/__pending_media/${targetId}`, 'item');
        const match = await cache.match(itemReq);
        if (match) item = await match.json();
      } catch (e) {}
    }

    if (!item) {
      return new Response(JSON.stringify({ error: 'Media not found', id: targetId }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }
    return new Response(JSON.stringify(item), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  const list = [];
  for (const item of MEDIA_QUEUE.values()) {
    if (includeData) {
      list.push(item);
    } else {
      const { image, ...summary } = item;
      list.push(summary);
    }
  }

  return new Response(JSON.stringify({
    status: 'ok',
    count: list.length,
    items: list
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

async function handleDeletePendingMedia(url, request, ctx) {
  const targetId = url.searchParams.get('id');
  const clearAll = url.searchParams.get('clear_all') === 'true';
  const origin = url.origin;
  const cache = caches.default;

  if (clearAll) {
    const count = MEDIA_QUEUE.size;
    MEDIA_QUEUE.clear();
    await syncMediaIndexCache(origin, ctx, cache);
    return new Response(JSON.stringify({ status: 'ok', cleared: count }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  if (!targetId) {
    return new Response(JSON.stringify({ error: 'id parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  const existed = MEDIA_QUEUE.delete(targetId);
  await syncMediaIndexCache(origin, ctx, cache);

  return new Response(JSON.stringify({ status: 'ok', id: targetId, deleted: existed }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
  });
}

// ============================================================================
// 🚀 번들링 부트스트랩 API 핸들러 (/api/bootstrap)
// ============================================================================
async function handleBootstrap(url, request, env, ctx) {
  const childName = url.searchParams.get('child') || '민수';
  const forceRefresh = url.searchParams.get('force') === 'true';
  const authHeader = getNotionAuthHeader(request, env);

  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Notion Authorization token required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }

  const cacheKeyStr = `bootstrap_${childName}`;
  const cacheKeyReq = createCacheKeyRequest(url.origin, `/api/bootstrap`, `${encodeURIComponent(childName)}`);

  if (!forceRefresh) {
    const memCached = getFromMemoryCache(cacheKeyStr);
    if (memCached) return createMemoryCacheResponse(memCached, 'HIT');
  }

  const cache = caches.default;
  if (!forceRefresh) {
    try {
      const cachedResponse = await cache.match(cacheKeyReq);
      if (cachedResponse) {
        const respHeaders = new Headers(cachedResponse.headers);
        respHeaders.set('X-Cache-Status', 'HIT');
        respHeaders.set('Access-Control-Allow-Origin', '*');
        const bodyText = await cachedResponse.text();
        saveToMemoryCache(cacheKeyStr, bodyText, cachedResponse.status, respHeaders, CACHE_TTL_BOOTSTRAP);
        return new Response(bodyText, { status: cachedResponse.status, headers: respHeaders });
      }
    } catch (e) {}
  }

  const inventoryDbId = (env && env.INVENTORY_DB_ID) || DEFAULT_DBS.INVENTORY;
  const timetableDbId = (env && env.STATIC_TIMETABLE_DB_ID) || DEFAULT_DBS.STATIC_TIMETABLE;
  const overlayDbId = (env && env.EVENT_OVERLAY_DB_ID) || DEFAULT_DBS.EVENT_OVERLAY;

  try {
    const [invRes, timeRes, overRes] = await Promise.all([
      callNotionRaw(`/v1/databases/${inventoryDbId}/query`, 'POST', {
        filter: { property: '이름', title: { equals: childName } }
      }, authHeader),
      callNotionRaw(`/v1/databases/${timetableDbId}/query`, 'POST', { page_size: 100 }, authHeader),
      callNotionRaw(`/v1/databases/${overlayDbId}/query`, 'POST', { page_size: 50 }, authHeader)
    ]);

    const [invData, timeData, overData] = await Promise.all([
      invRes.ok ? invRes.json() : { results: [] },
      timeRes.ok ? timeRes.json() : { results: [] },
      overRes.ok ? overRes.json() : { results: [] }
    ]);

    const bundle = {
      status: 'ok',
      child: childName,
      timestamp: new Date().toISOString(),
      inventory: (invData.results && invData.results[0]) ? invData.results[0] : null,
      timetable: timeData.results || [],
      events: overData.results || []
    };

    const responseBody = JSON.stringify(bundle);
    const respHeaders = new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CACHE_TTL_BOOTSTRAP}, stale-while-revalidate=300`,
      'X-Cache-Status': 'MISS',
      ...CORS_HEADERS
    });

    saveToMemoryCache(cacheKeyStr, responseBody, 200, respHeaders, CACHE_TTL_BOOTSTRAP);
    const response = new Response(responseBody, { status: 200, headers: respHeaders });
    try {
      if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(cacheKeyReq, response.clone()));
      else await cache.put(cacheKeyReq, response.clone());
    } catch (e) {}

    return response;
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Bootstrap bundle failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

// ============================================================================
// 🌐 메인 라우터 (Cloudflare Worker fetch)
// ============================================================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 0. 🧸 보육비서 노션 보안 가드 우선 검증
    const guarded = await guardDaycareProxy(request, env, callNotionRaw, getNotionAuthHeader);
    if (guarded) return guarded;

    // 1. CORS Preflight (OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // 2. 헬스체크 및 진단 엔드포인트 (/health)
    if (url.pathname === '/health' || url.pathname === '/') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'minmin-notion-edge-cache',
        version: '2026.10-v4.2-perfect',
        features: ['notion-proxy', 'daycare-guard', 'l1-memory-cache', 'l2-cache-api', 'bootstrap-bundle', 'edge-tts', 'gemini-key', 'gemini-proxy', 'quick-upload-pipeline'],
        cacheTTL: { query: `${CACHE_TTL_QUERY}s`, bootstrap: `${CACHE_TTL_BOOTSTRAP}s` },
        memoryCacheEntries: MEDIA_QUEUE.size,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    // 2-B. 🔑 Gemini API 키 런타임 디스펜서 (/api/gemini-key)
    if (url.pathname === '/api/gemini-key') {
      const apiKey = (env && (env.GEMINI_API_KEY || env.GEMINI_KEY)) ? (env.GEMINI_API_KEY || env.GEMINI_KEY) : '';
      return new Response(JSON.stringify({
        status: apiKey ? 'ok' : 'empty',
        key: apiKey,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

    // 2-C. 🤖 Gemini AI 백엔드 프록시 (/v1/gemini)
    if (url.pathname === '/v1/gemini') {
      try {
        const apiKey = (env && (env.GEMINI_API_KEY || env.GEMINI_KEY)) ? (env.GEMINI_API_KEY || env.GEMINI_KEY) : '';
        if (!apiKey) {
          return new Response(JSON.stringify({ error: 'GEMINI_API_KEY secret is not configured in Worker' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }
        const reqBody = await request.json();
        const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
        const googleRes = await fetch(googleUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody)
        });
        const googleData = await googleRes.text();
        return new Response(googleData, {
          status: googleRes.status,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message || 'Gemini proxy error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
    }

    // 3. Edge Neural AI TTS 스트리밍 엔드포인트 (/api/tts)
    if (url.pathname === '/api/tts' || url.pathname === '/v1/audio/speech' || url.pathname.endsWith('/tts')) {
      try {
        let text = '';
        let voice = DEFAULT_VOICE;
        let rate = '+6%';
        let pitch = '+4Hz';

        if (request.method === 'POST') {
          const contentType = request.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const body = await request.json();
            text = body.text || body.input || '';
            if (body.voice) voice = body.voice;
            if (body.rate) rate = body.rate;
            if (body.pitch) pitch = body.pitch;
            if (body.speed) {
              const speedNum = parseFloat(body.speed);
              const pct = Math.round((speedNum - 1.0) * 100);
              rate = `${pct >= 0 ? '+' : ''}${pct}%`;
            }
          } else {
            text = await request.text();
          }
        } else {
          text = url.searchParams.get('text') || url.searchParams.get('input') || '';
          if (url.searchParams.get('voice')) voice = url.searchParams.get('voice');
          if (url.searchParams.get('rate')) rate = url.searchParams.get('rate');
          if (url.searchParams.get('pitch')) pitch = url.searchParams.get('pitch');
        }

        const trimmed = text.trim();
        if (!trimmed) {
          return new Response(JSON.stringify({ error: 'Text is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
          });
        }

        const audioBuffer = await synthesizeEdgeTTS(trimmed, voice, rate, pitch);
        return new Response(audioBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            ...CORS_HEADERS
          }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message || 'TTS Synthesis failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
    }

    // 3-B. 📸 미디어 퀵업로드 엔드포인트 (/api/upload-media)
    if (url.pathname === '/api/upload-media' && request.method === 'POST') {
      return await handleUploadMedia(request, env, ctx);
    }

    // 3-C. 📥 대기 중인 퀵업로드 미디어 조회/삭제 (/api/pending-media)
    if (url.pathname === '/api/pending-media') {
      if (request.method === 'GET') {
        return await handleGetPendingMedia(url, request, env);
      }
      if (request.method === 'DELETE') {
        return await handleDeletePendingMedia(url, request, ctx);
      }
    }

    // 4. 단일 번들링 부트스트랩 엔드포인트 (/api/bootstrap)
    if (url.pathname === '/api/bootstrap') {
      return await handleBootstrap(url, request, env, ctx);
    }

    // 5. 노션 REST API 요청 처리 (/v1/...)
    if (url.pathname.startsWith('/v1/')) {
      const authHeader = getNotionAuthHeader(request, env);
      if (!authHeader) {
        return new Response(JSON.stringify({
          object: 'error',
          status: 401,
          message: 'Missing Notion Authorization token. Provide in request or configure NOTION_TOKEN secret.'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }

      // 5-A. ⚡ 노션 DB 쿼리 (POST /v1/databases/:id/query) - 엣지 캐싱 대상
      if (url.pathname.includes('/query') && request.method === 'POST') {
        const reqBodyText = await request.text();
        const forceRefresh = url.searchParams.get('force') === 'true' || request.headers.get('Pragma') === 'no-cache';
        const bodyHash = await sha256Hex(url.pathname + '_' + reqBodyText);
        const cacheKeyStr = `query_${bodyHash}`;
        const cacheKeyReq = createCacheKeyRequest(url.origin, url.pathname, bodyHash);

        if (!forceRefresh) {
          const memCached = getFromMemoryCache(cacheKeyStr);
          if (memCached) return createMemoryCacheResponse(memCached, 'HIT');
        }

        const cache = caches.default;
        if (!forceRefresh) {
          try {
            const cachedResp = await cache.match(cacheKeyReq);
            if (cachedResp) {
              const respHeaders = new Headers(cachedResp.headers);
              respHeaders.set('X-Cache-Status', 'HIT');
              respHeaders.set('Access-Control-Allow-Origin', '*');
              const bodyText = await cachedResp.text();
              saveToMemoryCache(cacheKeyStr, bodyText, cachedResp.status, respHeaders, CACHE_TTL_QUERY);
              return new Response(bodyText, { status: cachedResp.status, headers: respHeaders });
            }
          } catch (e) {}
        }

        // 🌟 force, _t 파라미터 정제 (노션 400 Bad Request 방어)
        const forwardUrl = new URL(url.toString());
        forwardUrl.searchParams.delete('force');
        forwardUrl.searchParams.delete('_t');
        const forwardSearch = forwardUrl.search;
        const notionResp = await callNotionRaw(url.pathname + forwardSearch, 'POST', reqBodyText, authHeader);
        const respData = await notionResp.text();

        const responseHeaders = new Headers(notionResp.headers);
        Object.entries(CORS_HEADERS).forEach(([k, v]) => responseHeaders.set(k, v));
        responseHeaders.set('X-Cache-Status', 'MISS');

        if (notionResp.ok) {
          responseHeaders.set('Cache-Control', `public, max-age=${CACHE_TTL_QUERY}, stale-while-revalidate=600`);
          saveToMemoryCache(cacheKeyStr, respData, notionResp.status, responseHeaders, CACHE_TTL_QUERY);

          const cacheableResponse = new Response(respData, { status: notionResp.status, headers: responseHeaders });
          try {
            if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(cacheKeyReq, cacheableResponse.clone()));
            else await cache.put(cacheKeyReq, cacheableResponse.clone());
          } catch (e) {}
          return cacheableResponse;
        } else {
          return new Response(respData, { status: notionResp.status, headers: responseHeaders });
        }
      }

      // 5-B. ⚡ 노션 페이지 읽기 (GET /v1/pages/:id 등)
      if (request.method === 'GET') {
        const bodyHash = await sha256Hex(url.pathname + url.search);
        const cacheKeyStr = `get_${bodyHash}`;
        const cacheKeyReq = createCacheKeyRequest(url.origin, url.pathname, bodyHash);
        const forceRefresh = url.searchParams.get('force') === 'true';

        if (!forceRefresh) {
          const memCached = getFromMemoryCache(cacheKeyStr);
          if (memCached) return createMemoryCacheResponse(memCached, 'HIT');
        }

        const cache = caches.default;
        if (!forceRefresh) {
          try {
            const cachedResp = await cache.match(cacheKeyReq);
            if (cachedResp) {
              const respHeaders = new Headers(cachedResp.headers);
              respHeaders.set('X-Cache-Status', 'HIT');
              respHeaders.set('Access-Control-Allow-Origin', '*');
              const bodyText = await cachedResp.text();
              saveToMemoryCache(cacheKeyStr, bodyText, cachedResp.status, respHeaders, CACHE_TTL_QUERY);
              return new Response(bodyText, { status: cachedResp.status, headers: respHeaders });
            }
          } catch (e) {}
        }

        // 🌟 [미세 보완 ①] GET 요청 시에도 force, _t 파라미터 정제 (노션 400 Bad Request 방어)
        const forwardUrl = new URL(url.toString());
        forwardUrl.searchParams.delete('force');
        forwardUrl.searchParams.delete('_t');
        const notionResp = await callNotionRaw(url.pathname + forwardUrl.search, 'GET', null, authHeader);
        const respData = await notionResp.text();

        const responseHeaders = new Headers(notionResp.headers);
        Object.entries(CORS_HEADERS).forEach(([k, v]) => responseHeaders.set(k, v));
        responseHeaders.set('X-Cache-Status', 'MISS');

        if (notionResp.ok) {
          responseHeaders.set('Cache-Control', `public, max-age=${CACHE_TTL_QUERY}, stale-while-revalidate=600`);
          saveToMemoryCache(cacheKeyStr, respData, notionResp.status, responseHeaders, CACHE_TTL_QUERY);

          const cacheableResponse = new Response(respData, { status: notionResp.status, headers: responseHeaders });
          try {
            if (ctx && ctx.waitUntil) ctx.waitUntil(cache.put(cacheKeyReq, cacheableResponse.clone()));
            else await cache.put(cacheKeyReq, cacheableResponse.clone());
          } catch (e) {}
          return cacheableResponse;
        }
        return new Response(respData, { status: notionResp.status, headers: responseHeaders });
      }

      // 5-C. 노션 쓰기/수정
      MEMORY_CACHE.clear();
      const reqBody = await request.text();
      const notionResp = await callNotionRaw(url.pathname + url.search, request.method, reqBody, authHeader);
      const respData = await notionResp.text();

      const responseHeaders = new Headers(notionResp.headers);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => responseHeaders.set(k, v));
      responseHeaders.set('X-Cache-Status', 'BYPASS-WRITE');

      return new Response(respData, { status: notionResp.status, headers: responseHeaders });
    }

    return new Response(JSON.stringify({ error: 'Endpoint not found', path: url.pathname }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
};
