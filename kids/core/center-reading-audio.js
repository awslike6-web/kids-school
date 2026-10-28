// 센터 지문·국어 어휘 정적 Edge MP3. fairy-engine의 단일 중지 경로를 사용한다.
(function (root) {
    'use strict';
    const script = typeof document !== 'undefined' ? document.currentScript : null;
    const base = script ? new URL('../assets/audio/center_reading/', script.src).href : '';
    let manifestPromise = null;
    let generation = 0;
    let active = null;

    function normalize(text) {
        return String(text || '').replace(/\*/g, '')
            .replace(/\(?\s*[㉠-㉭]\s*\)?/g, ' 빈칸 ')
            .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/gu, ' ').trim();
    }

    async function hash(text, settings) {
        const key = `${settings.normalization}|${settings.engine}|${settings.voice}|${settings.rate}|${settings.pitch}|${normalize(text)}`;
        const bytes = await root.crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
        return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('').slice(0, 24);
    }

    function enabled() {
        return root.localStorage.getItem('fairy_tts_enabled') !== 'false';
    }

    function stop() {
        generation++;
        if (active) {
            active.onended = active.onerror = null;
            active.pause();
            active.currentTime = 0;
            active = null;
        }
    }

    async function loadManifest() {
        if (!manifestPromise) {
            manifestPromise = (async () => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 4000);
                try {
                    const res = await root.fetch(`${base}manifest.json`, { cache: 'no-cache', signal: controller.signal });
                    if (!res.ok) throw new Error(`매니페스트 HTTP ${res.status}`);
                    const data = await res.json();
                    if (data.version !== 2 || data.settings?.normalization !== 'v2' || data.settings.engine !== 'edge-tts') {
                        throw new Error('센터 음성 매니페스트 버전 불일치');
                    }
                    return data;
                } finally { clearTimeout(timeout); }
            })().catch(error => {
                manifestPromise = null;
                throw error;
            });
        }
        return manifestPromise;
    }

    // false: 일치 자산 없음(공통 TTS 계속), true: 정적 재생 또는 취소됨.
    async function play(text, options = {}) {
        stop();
        const request = generation;
        const current = () => request === generation && enabled();
        if (!enabled()) return true;
        let data;
        try { data = await loadManifest(); }
        catch (error) {
            console.warn('[센터 MP3] 목록 조회 실패:', error.message);
            return !current();
        }
        if (!current()) return true;
        const key = await hash(text, data.settings);
        if (!current()) return true;
        const clip = data.clips?.[key];
        // 대본·설정 일치 검사. 노션 본문을 바꾸면 옛 음성으로 읽지 않는다.
        if (!clip || clip.spoken_text !== normalize(text) || clip.audio_file !== `${key}.mp3`) return false;
        const audio = new root.Audio(`${base}${clip.audio_file}`);
        // 설정창 한국어 말하기 속도 (fairy-tts.js, 1.0 = 녹음 그대로)
        const rate = typeof root.getKoreanSpeechRate === 'function' ? root.getKoreanSpeechRate() : 1;
        if (rate !== 1) audio.playbackRate = rate;
        active = audio;
        let failed = false;
        const fail = error => {
            if (!current() || failed) return;
            failed = true;
            console.warn('[센터 MP3] 재생 실패:', key, error);
            stop();
            if (options.onError) options.onError();
        };
        audio.onended = () => {
            if (!current()) return;
            stop();
            if (options.onEnd) options.onEnd();
        };
        audio.onerror = fail;
        try {
            await audio.play();
            // 대기 중 닫기·음성 OFF가 발생하면 재생 재개를 허용하지 않는다.
            if (!current()) { audio.pause(); return true; }
            return true;
        } catch (error) {
            // 자동재생 제한은 네트워크 TTS로 재시도해도 해결되지 않는다.
            if (error.name === 'NotAllowedError') {
                if (current()) { stop(); if (options.onEnd) options.onEnd(); }
                return true;
            }
            fail(error);
            return true;
        }
    }

    root.CenterReadingAudio = { normalize, hash, play, stop };
    if (root.addEventListener) {
        root.addEventListener('pagehide', stop);
        root.addEventListener('beforeunload', stop);
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = root.CenterReadingAudio;
})(typeof window !== 'undefined' ? window : globalThis);
