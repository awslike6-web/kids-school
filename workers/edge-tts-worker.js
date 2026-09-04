/**
 * ⚡ Cloudflare Worker: Microsoft Edge Neural AI TTS 초고속 스트리밍 프록시
 * 
 * 💡 기능:
 *  - POST/GET /api/tts 지원
 *  - Microsoft Edge WebSocket 기반 실시간 고음질 MP3 합성
 *  - Sec-MS-GEC DRM 서명 내장 (403 해결)
 *  - ArrayBuffer / Uint8Array / Blob 다중 바이너리 자동 변환
 *  - 정확한 Date 타임스탬프 규격 적용
 *  - 완전한 CORS 지원
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, User-Agent',
  'Access-Control-Max-Age': '86400',
};

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

/**
 * 🔑 Microsoft Edge DRM 서명 (Sec-MS-GEC)
 */
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

    // 1. 음성 포맷 설정 전송
    const configMsg = `X-Timestamp:${dateStr}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n`;
    ws.send(configMsg);

    // 2. SSML 합성 요청 전송
    const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice name='${voice}'><prosody pitch='${pitch}' rate='${rate}'>${escapeXml(text)}</prosody></voice></speak>`;
    const ssmlMsg = `X-RequestId:${reqId}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${dateStr}Z\r\nPath:ssml\r\n\r\n${ssml}`;
    ws.send(ssmlMsg);

    // 3. 수신 스트림 처리 (모든 바이너리 타입 호환)
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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/health' || url.pathname === '/') {
      return new Response(JSON.stringify({ status: 'ok', service: 'Edge-TTS-Streamer', timestamp: new Date().toISOString() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
      });
    }

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
        return new Response(JSON.stringify({ error: err.message || 'Synthesis failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
        });
      }
    }

    return new Response('Not Found', { status: 404, headers: CORS_HEADERS });
  }
};
