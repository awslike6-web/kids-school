// ==========================================
// 🎙️ 민민이네 공부방 STT 디바운스 엔진 (stt-debouncer.js)
// ==========================================

// ========================================================
// 🎙️ STT 디바운스 엔진 (interim 차단 + 1.5초 정적 후 1회 전송)
// ========================================================

window.__sttSession = null;

function setupDebouncedSTT(options = {}) {
    const {
        inputEl,
        onSend,
        debounceMs = 2500,
        lang = 'ko-KR',
        onStart,
        onEnd,
        onError
    } = options;

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
        alert("현재 브라우저에서는 마이크 기능이 지원되지 않아요. (크롬 브라우저를 사용해주세요!)");
        return null;
    }

    // 💡 이미 듣고 있는 상태에서 마이크 버튼을 다시 누르면 즉시 마무리 및 전송 (토글 기능)
    if (window.__sttSession && window.__sttSession.isListening) {
        console.log('[STT] 마이크 재클릭으로 즉시 마무리 및 전송');
        if (typeof window.__sttSession.flushAndSend === 'function') {
            window.__sttSession.flushAndSend();
        }
        return null;
    }

    // 기존 세션 정리 (이전 인스턴스의 이벤트 핸들러를 먼저 제거하여 aborted 전파 차단)
    if (window.__sttSession?.recognition) {
        const oldRec = window.__sttSession.recognition;
        oldRec.onstart = null;
        oldRec.onend = null;
        oldRec.onerror = null;
        oldRec.onresult = null;
        try { oldRec.abort(); } catch (e) { /* noop */ }
        clearTimeout(window.__sttSession.debounceTimer);
    }

    // 마이크 시작 전 TTS 즉시 중지 (마이크 하울링/간섭 방지)
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }

    // 🎤 데스크톱 크롬/웨일 마이크 하드웨어 스트림 깨우기 및 연결 장치 확인
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            window.__micStreamWoken = true;
            const track = stream.getAudioTracks()[0];
            const micLabel = track?.label || '기본 마이크';
            window.__activeMicDeviceLabel = micLabel;
            
            const isVirtual = /droidcam|virtual|stereo mix|스테레오 믹스/i.test(micLabel);
            if (isVirtual) {
                console.warn(`%c[STT 마이크 경고] ⚠️ 현재 브라우저가 가상 마이크("${micLabel}")를 바라보고 있습니다! 실제 마이크(Realtek 등)로 소리를 전달하려면 브라우저 주소창 좌측 🔒 자물쇠 > 마이크 설정(또는 chrome://settings/content/microphone)에서 실제 마이크로 변경해 주세요.`, 'color: #f59e0b; font-weight: bold;');
            } else {
                console.log(`%c[STT 마이크 진단] 🎤 활성 마이크 장치: "${micLabel}"`, 'color: #10b981; font-weight: bold;');
            }
            stream.getTracks().forEach(t => t.stop());
        }).catch(err => {
            console.warn('[STT 마이크 진단] getUserMedia 접근 실패 (권한 또는 장치 비활성화):', err);
        });

        if (navigator.mediaDevices.enumerateDevices) {
            navigator.mediaDevices.enumerateDevices().then(devices => {
                const mics = devices.filter(d => d.kind === 'audioinput').map(d => d.label || '이름 없음');
                if (mics.length > 0) {
                    console.log(`%c[STT 마이크 목록] 🎧 PC에 연결된 전체 마이크 (${mics.length}개):`, 'color: #6366f1; font-weight: bold;', mics);
                }
            }).catch(() => {});
        }
    }

    let accumulatedFinal = '';
    let debounceTimer = null;
    let hasSent = false;
    let isListening = false;

    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.continuous = false; // 크롬 데스크톱에서 가장 안정적인 단일 턴 모드
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // 💡 상세 오디오 상태 진단 이벤트
    recognition.onaudiostart = function() {
        console.log('%c[STT 진단] 🎙️ 오디오 스트림 수신 시작 (브라우저가 마이크 소리를 듣고 있습니다)', 'color: #0284c7;');
    };
    recognition.onspeechstart = function() {
        console.log('%c[STT 진단] 🗣️ 사람 목소리(발화) 감지됨!', 'color: #ec4899; font-weight: bold;');
    };
    recognition.onspeechend = function() {
        console.log('%c[STT 진단] 🤫 발화 종료 감지됨', 'color: #8b5cf6;');
    };
    recognition.onaudioend = function() {
        console.log('%c[STT 진단] ⏹️ 오디오 수신 종료', 'color: #64748b;');
    };

    function finishMicUI() {
        isListening = false;
        if (window.__sttSession) window.__sttSession.isListening = false;
        if (onEnd) onEnd();
    }

    function flushAndSend() {
        clearTimeout(debounceTimer);
        if (hasSent) return;
        const text = (inputEl.value || accumulatedFinal).trim();
        if (!text) {
            finishMicUI();
            return;
        }
        hasSent = true;
        accumulatedFinal = text;
        inputEl.value = text;
        try { recognition.stop(); } catch (e) { /* noop */ }
        finishMicUI();
        onSend(text);
    }

    recognition.onstart = function() {
        hasSent = false;
        isListening = true;
        accumulatedFinal = '';
        inputEl.value = '';
        if (window.__sttSession) window.__sttSession.isListening = true;
        if (onStart) onStart();
    };

    recognition.onresult = function(event) {
        if (hasSent) return;

        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        if (finalTranscript) {
            accumulatedFinal = (accumulatedFinal ? accumulatedFinal + ' ' : '') + finalTranscript.trim();
        }

        const fullText = (accumulatedFinal + (interimTranscript ? (accumulatedFinal ? ' ' : '') + interimTranscript.trim() : '')).trim();
        if (fullText) {
            inputEl.value = fullText;
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(flushAndSend, debounceMs);
    };

    recognition.onend = function() {
        clearTimeout(debounceTimer);
        if (!hasSent && (accumulatedFinal.trim() || inputEl.value.trim())) {
            flushAndSend();
        } else if (!hasSent) {
            finishMicUI();
        }
    };

    recognition.onerror = function(event) {
        clearTimeout(debounceTimer);
        const errType = String(event.error || '');
        // aborted는 사용자의 재클릭 또는 정상 리셋 동작이므로 오류로 취급하지 않음
        if (errType === 'aborted') {
            return;
        }
        console.warn('[STT 오류]', event.error);
        if (!hasSent) finishMicUI();
        if (onError) onError(event);
    };

    window.__sttSession = {
        recognition,
        debounceTimer: null,
        isListening: false,
        flushAndSend
    };

    try {
        recognition.start();
    } catch (e) {
        console.error('[STT 시작 실패]', e);
        finishMicUI();
        if (onError) onError({ error: e.message || 'start_failed' });
    }

    return recognition;
}

