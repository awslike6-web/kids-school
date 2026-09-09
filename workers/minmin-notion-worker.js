/**
 * ⚡ Cloudflare Worker: minmin-notion 통합 초고속 엣지 캐시 & 노션 프록시 & Edge TTS 엔진
 *
 * 💡 주요 기능:
 *  1. 🏰 노션 REST API 보안 프록시 (Notion-Version: 2022-06-28 주입, CORS 처리, Token 관리)
 *  2. ⚡ Cloudflare Cache API (caches.default) 기반 초고속 엣지 캐싱 (100ms 이내 반환)
 *     - POST /v1/databases/:id/query 요청의 본문 해시 기반 스마트 캐싱 (TTL 5분)
 *     - X-Cache-Status: HIT / MISS 응답 헤더 제공
 *  3. 🚀 단일 번들링 부트스트랩 API (/api/bootstrap)
 *     - 접속 시 학생 인벤토리 + 오늘 시간표 + 알림장을 단 1회 호출로 일괄 번들링 응답
 *  4. 🎙️ Microsoft Edge Neural AI TTS 초고속 스트리밍 (/api/tts) 완전 내장
 *  5. 🩺 헬스체크 및 캐시 진단 (/health)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, User-Agent, Notion-Version',
  'Access-Control-Max-Age': '86400',
};

const NOTION_API_BASE = 'https://api.notion.com';
const NOTION_VERSION = '2022-06-28';

// 기본 노션 DB ID 단일 원천 (SSOT)
const DEFAULT_DBS = {
  INVENTORY: '374a27115b688042bb61e6a102242e12',
  STUDY_LOG: '37aa27115b688001b2ffe5e6c8f82ab2',
  VOCA: '375a27115b688038b686d3994ee12919',
  STATIC_TIMETABLE: '32ba27115b68828bbda201a1bdce12fc',
  EVENT_OVERLAY: 'e3f9b3917c2b48bfa3d47db4bd0545fd',
  CHAT_MEMORY: '373a27115b6880ba82cdfeaa1c825547'
};

// 캐시 TTL (초 단위)
const CACHE_TTL_QUERY = 300;      // 노션 DB 쿼리: 5분 (300초)
const CACHE_TTL_BOOTSTRAP = 180;  // 부트스트랩 번들: 3분 (180초)

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
  if (!ws) {
    throw new Error(`Edge TTS WebSocket handshake failed (HTTP ${resp.status})`);
  }
  ws.accept();

  return new Promise((resolve, reject) => {
    const audioChunks = [];
    const debugLogs = [];
    const dateStr = dateToString();
    const reqId = crypto.randomUUID().replace(/-/g, '');

    const timeout = setTimeout(() => {
      try { ws.close(); } catch (e) {}
      if (audioChunks.length > 0) {
        finishSuccess();
      } else {
        reject(new Error('Edge TTS synthesis timeout (10s). Logs: ' + JSON.stringify(debugLogs)));
      }
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
        if (event.data.includes('Path:turn.end')) {
          finishSuccess();
        }
      } else {
        let buf = null;
        if (event.data instanceof ArrayBuffer) {
          buf = event.data;
        } else if (event.data instanceof Uint8Array) {
          buf = event.data.buffer;
        } else if (event.data && typeof event.data.arrayBuffer === 'function') {
          buf = await event.data.arrayBuffer();
        }

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
      reject(new Error('Edge TTS WebSocket Error: ' + (err.message || 'Unknown') + '. Logs: ' + JSON.stringify(debugLogs)));
    });

    ws.addEventListener('close', () => {
      if (audioChunks.length > 0) {
        finishSuccess();
      }
    });
  });
}

// ============================================================================
// ⚡ 해시 및 캐시 키 생성 유틸리티
// ============================================================================
async function sha256Hex(str) {
  const msgUint8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Cloudflare Cache API용 고유 GET 가상 요청 객체 생성
 * (Cache API는 GET/HEAD 메서드만 캐싱 가능하므로 가상 URL을 key로 매핑)
 */
function createCacheKeyRequest(virtualPath, hash) {
  const cacheUrl = `https://cache.minmin-notion.internal${virtualPath}?h=${hash}`;
  return new Request(cacheUrl, { method: 'GET' });
}

// ============================================================================
// 🏰 노션 API 요청 헬퍼
// ============================================================================
function getNotionAuthHeader(request, env) {
  const clientAuth = request.headers.get('Authorization');
  if (clientAuth && clientAuth.startsWith('Bearer secret_')) {
    return clientAuth;
  }
  const token = env && (env.NOTION_TOKEN || env.NOTION_API_KEY);
  if (token) {
    return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }
  return clientAuth || '';
}

async function callNotionRaw(endpoint, method, body, authHeader) {
  const targetUrl = `${NOTION_API_BASE}${endpoint}`;
  const headers = {
    'Authorization': authHeader,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json'
  };

  const options = {
    method,
    headers
  };
  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  return await fetch(targetUrl, options);
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

  // 1. 엣지 캐시 확인
  const cache = caches.default;
  const cacheKeyReq = createCacheKeyRequest(`/api/bootstrap`, `${encodeURIComponent(childName)}`);

  if (!forceRefresh) {
    const cachedResponse = await cache.match(cacheKeyReq);
    if (cachedResponse) {
      const respHeaders = new Headers(cachedResponse.headers);
      respHeaders.set('X-Cache-Status', 'HIT');
      respHeaders.set('Access-Control-Allow-Origin', '*');
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: respHeaders
      });
    }
  }

  // 2. 캐시 부재 시 백엔드에서 3대 핵심 DB 병렬 벌크 호출
  const inventoryDbId = (env && env.INVENTORY_DB_ID) || DEFAULT_DBS.INVENTORY;
  const timetableDbId = (env && env.STATIC_TIMETABLE_DB_ID) || DEFAULT_DBS.STATIC_TIMETABLE;
  const overlayDbId = (env && env.EVENT_OVERLAY_DB_ID) || DEFAULT_DBS.EVENT_OVERLAY;

  try {
    const [invRes, timeRes, overRes] = await Promise.all([
      // 1) 학생 인벤토리
      callNotionRaw(`/v1/databases/${inventoryDbId}/query`, 'POST', {
        filter: { property: '이름', title: { equals: childName } }
      }, authHeader),
      // 2) 고정 시간표
      callNotionRaw(`/v1/databases/${timetableDbId}/query`, 'POST', { page_size: 100 }, authHeader),
      // 3) 알림장/이벤트 오버레이
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
    const response = new Response(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_TTL_BOOTSTRAP}, stale-while-revalidate=300`,
        'X-Cache-Status': 'MISS',
        ...CORS_HEADERS
      }
    });

    // 백그라운드 엣지 캐시 저장
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(cache.put(cacheKeyReq, response.clone()));
    } else {
      await cache.put(cacheKeyReq, response.clone());
    }
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

    // 1. CORS Preflight (OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // 2. 헬스체크 및 진단 엔드포인트 (/health)
    if (url.pathname === '/health' || url.pathname === '/') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'minmin-notion-edge-cache',
        version: '2026.09-v2',
        features: ['notion-proxy', 'edge-cache-api', 'bootstrap-bundle', 'edge-tts'],
        cacheTTL: {
          query: `${CACHE_TTL_QUERY}s`,
          bootstrap: `${CACHE_TTL_BOOTSTRAP}s`
        },
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
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

        const cache = caches.default;
        const cacheKeyReq = createCacheKeyRequest(url.pathname, bodyHash);

        if (!forceRefresh) {
          const cachedResp = await cache.match(cacheKeyReq);
          if (cachedResp) {
            const respHeaders = new Headers(cachedResp.headers);
            respHeaders.set('X-Cache-Status', 'HIT');
            respHeaders.set('Access-Control-Allow-Origin', '*');
            return new Response(cachedResp.body, {
              status: cachedResp.status,
              headers: respHeaders
            });
          }
        }

        // 캐시 MISS: 노션 원본 API 호출
        const notionResp = await callNotionRaw(url.pathname + url.search, 'POST', reqBodyText, authHeader);
        const respData = await notionResp.text();

        const responseHeaders = new Headers(notionResp.headers);
        Object.entries(CORS_HEADERS).forEach(([k, v]) => responseHeaders.set(k, v));
        responseHeaders.set('X-Cache-Status', 'MISS');

        if (notionResp.ok) {
          responseHeaders.set('Cache-Control', `public, max-age=${CACHE_TTL_QUERY}, stale-while-revalidate=600`);
          const cacheableResponse = new Response(respData, {
            status: notionResp.status,
            headers: responseHeaders
          });
          // 엣지 캐시 저장
          if (ctx && ctx.waitUntil) {
            ctx.waitUntil(cache.put(cacheKeyReq, cacheableResponse.clone()));
          } else {
            await cache.put(cacheKeyReq, cacheableResponse.clone());
          }
          return cacheableResponse;
        } else {
          return new Response(respData, {
            status: notionResp.status,
            headers: responseHeaders
          });
        }
      }

      // 5-B. 노션 페이지 읽기 (GET /v1/pages/:id, GET /v1/blocks/:id/children 등)
      if (request.method === 'GET') {
        const cache = caches.default;
        const bodyHash = await sha256Hex(url.pathname + url.search);
        const cacheKeyReq = createCacheKeyRequest(url.pathname, bodyHash);
        const forceRefresh = url.searchParams.get('force') === 'true';

        if (!forceRefresh) {
          const cachedResp = await cache.match(cacheKeyReq);
          if (cachedResp) {
            const respHeaders = new Headers(cachedResp.headers);
            respHeaders.set('X-Cache-Status', 'HIT');
            respHeaders.set('Access-Control-Allow-Origin', '*');
            return new Response(cachedResp.body, {
              status: cachedResp.status,
              headers: respHeaders
            });
          }
        }

        const notionResp = await callNotionRaw(url.pathname + url.search, 'GET', null, authHeader);
        const respData = await notionResp.text();

        const responseHeaders = new Headers(notionResp.headers);
        Object.entries(CORS_HEADERS).forEach(([k, v]) => responseHeaders.set(k, v));
        responseHeaders.set('X-Cache-Status', 'MISS');

        if (notionResp.ok) {
          responseHeaders.set('Cache-Control', `public, max-age=${CACHE_TTL_QUERY}, stale-while-revalidate=600`);
          const cacheableResponse = new Response(respData, {
            status: notionResp.status,
            headers: responseHeaders
          });
          if (ctx && ctx.waitUntil) {
            ctx.waitUntil(cache.put(cacheKeyReq, cacheableResponse.clone()));
          } else {
            await cache.put(cacheKeyReq, cacheableResponse.clone());
          }
          return cacheableResponse;
        }
        return new Response(respData, { status: notionResp.status, headers: responseHeaders });
      }

      // 5-C. 노션 쓰기/수정 (PATCH /v1/pages/:id, POST /v1/pages 등)
      const reqBody = await request.text();
      const notionResp = await callNotionRaw(url.pathname + url.search, request.method, reqBody, authHeader);
      const respData = await notionResp.text();

      const responseHeaders = new Headers(notionResp.headers);
      Object.entries(CORS_HEADERS).forEach(([k, v]) => responseHeaders.set(k, v));
      responseHeaders.set('X-Cache-Status', 'BYPASS-WRITE');

      return new Response(respData, {
        status: notionResp.status,
        headers: responseHeaders
      });
    }

    // 그 외 요청 404
    return new Response(JSON.stringify({ error: 'Endpoint not found', path: url.pathname }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
};
