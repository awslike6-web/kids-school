// ==============================================================================
// ⚡ [Notion Cache Manager] 노션 데이터 전사 캐시 & 프리패치 매니저 (notion-cache-manager.js)
// - 단일 책임: LocalStorage 1일 캐시 관리, 백그라운드 프리패치, 전사 마스터 동기화, 캐시 무효화
// - 골디락스 응집도: ~300줄 컴팩트 독립 모듈
// ==============================================================================

(function(window) {
    'use strict';

    // ----------------------------------------------------
    // 1. VOCA 단어 캐시 관리
    // ----------------------------------------------------
    const VOCA_CACHE_PREFIX = "MINMIN_VOCA_CACHE_V13_";

    function _getVocaCacheKey(studentName, dbId) {
        const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const name = (studentName || 'ALL').trim();
        return `${VOCA_CACHE_PREFIX}${dbId}_${name}_${todayStr}`;
    }

    function _loadVocaFromCache(studentName, dbId) {
        try {
            const key = _getVocaCacheKey(studentName, dbId);
            const cachedStr = localStorage.getItem(key);
            if (!cachedStr) return null;
            const parsed = JSON.parse(cachedStr);
            if (parsed && Array.isArray(parsed.records) && parsed.records.length > 0) {
                return parsed.records;
            }
        } catch (e) {
            console.warn("[VOCA Cache] 캐시 로드 오류:", e);
        }
        return null;
    }

    function _saveVocaToCache(studentName, dbId, records) {
        try {
            if (!Array.isArray(records) || records.length === 0) return;
            const todayStr = new Date().toISOString().slice(0, 10);
            const key = _getVocaCacheKey(studentName, dbId);
            
            // 이전 날짜 및 구버전 캐시 전수 정리
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (k && k.includes("_VOCA_CACHE_") && (!k.startsWith(VOCA_CACHE_PREFIX) || !k.endsWith(todayStr))) {
                    localStorage.removeItem(k);
                }
            }
            
            // 💡 localStorage 용량(5MB) 방어를 위해 핵심 필드만 슬림화하여 저장
            const slimRecords = records.map(r => ({
                id: r.id,
                word: r.word,
                meaning: r.meaning,
                detailContext: r.detailContext || "",
                imageUrl: r.imageUrl || null,
                audioUrl: r.audioUrl || null,
                interactiveUrl: r.interactiveUrl || null,
                pos: r.pos || "",
                wordType: r.wordType || r.type || "",
                type: r.type || r.wordType || "",
                stage: r.stage || "기본 단원",
                level: r.level || "기본 단원",
                grades: r.grades || [],
                grade: r.grade || "공통",
                subject: r.subject || [],
                target: r.target || [],
                isAchieved: !!r.isAchieved,
                hint: r.hint || "",
                areaZone: r.areaZone || ""
            }));

            localStorage.setItem(key, JSON.stringify({
                date: todayStr,
                timestamp: Date.now(),
                records: slimRecords
            }));
        } catch (e) {
            console.warn("[VOCA Cache] 캐시 저장 실패 (용량 초과 등):", e);
        }
    }

    function clearVocaCache(studentName = null) {
        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (k && k.includes("_VOCA_CACHE_")) {
                    if (!studentName || k.includes(`_${studentName.trim()}_`)) {
                        localStorage.removeItem(k);
                    }
                }
            }
            console.log("⚡ [VOCA Cache] 단어 캐시가 성공적으로 초기화되었습니다.");
        } catch (e) {
            console.warn("[VOCA Cache] 캐시 초기화 실패:", e);
        }
    }

    // ----------------------------------------------------
    // 2. 독해 & 도서관 지문 캐시 관리
    // ----------------------------------------------------
    const READING_CACHE_PREFIX = "MINMIN_READING_CACHE_V1_";
    const LIBRARY_CACHE_PREFIX = "MINMIN_LIBRARY_CACHE_V1_";

    function _getReadingCacheKey(subject, track, studentName) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const sName = (studentName || 'ALL').trim();
        const tr = (track || 'ALL').replace(/\s+/g, '_');
        return `${READING_CACHE_PREFIX}${subject}_${tr}_${sName}_${todayStr}`;
    }

    function _loadReadingFromCache(subject, track, studentName) {
        try {
            const key = _getReadingCacheKey(subject, track, studentName);
            const cachedStr = localStorage.getItem(key);
            if (!cachedStr) return null;
            const parsed = JSON.parse(cachedStr);
            if (parsed && Array.isArray(parsed.records) && parsed.records.length > 0) {
                return parsed.records;
            }
        } catch (e) {
            console.warn("[Reading Cache] 캐시 로드 오류:", e);
        }
        return null;
    }

    function _saveReadingToCache(subject, track, studentName, records) {
        try {
            if (!Array.isArray(records) || records.length === 0) return;
            const todayStr = new Date().toISOString().slice(0, 10);
            const key = _getReadingCacheKey(subject, track, studentName);
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (k && k.includes("_READING_CACHE_") && (!k.startsWith(READING_CACHE_PREFIX) || !k.endsWith(todayStr))) {
                    localStorage.removeItem(k);
                }
            }
            localStorage.setItem(key, JSON.stringify({
                date: todayStr,
                timestamp: Date.now(),
                records
            }));
        } catch (e) {
            console.warn("[Reading Cache] 캐시 저장 실패:", e);
        }
    }

    // ----------------------------------------------------
    // 3. 시간표 캐시 관리 (SWR 지원)
    // ----------------------------------------------------
    const TIMETABLE_CACHE_KEY = "MINMIN_TIMETABLE_CACHE_V11";

    function loadTimetableFromCache() {
        try {
            const str = localStorage.getItem(TIMETABLE_CACHE_KEY);
            if (!str) return null;
            return JSON.parse(str);
        } catch (e) {
            console.warn("[Timetable Cache] 로드 오류:", e);
            return null;
        }
    }

    function saveTimetableToCache(data) {
        try {
            localStorage.setItem(TIMETABLE_CACHE_KEY, JSON.stringify({
                staticRows: data.staticRows || [],
                overlayRows: data.overlayRows || [],
                allRows: data.allRows || [],
                cachedAt: Date.now()
            }));
        } catch (e) {
            console.warn("[Timetable Cache] 저장 실패:", e);
        }
    }

    function clearTimetableCache() {
        try {
            localStorage.removeItem(TIMETABLE_CACHE_KEY);
            console.log("⚡ [Timetable Cache] 시간표 캐시가 초기화되었습니다.");
        } catch (e) {}
    }

    // ----------------------------------------------------
    // 4. 백그라운드 프리패치 엔진 (논블로킹)
    // ----------------------------------------------------
    async function prefetchVocaData(studentName = null) {
        try {
            let target = (studentName || window.currentUserName || '민수').trim();
            if (target === '아빠' || target === '엄마' || target === '어른' || target === 'admin') {
                const profile = window.currentProfile || localStorage.getItem('currentUser') || 'son';
                target = profile === 'daughter' ? '민서' : '민수';
            }

            const dbId = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.VOCA_DB_ID) || "375a27115b688038b686d3994ee12919";
            const existing = _loadVocaFromCache(target, dbId);
            if (existing && existing.length > 0) {
                console.log(`⚡ [VOCA Prefetch] ${target}의 단어 캐시가 이미 준비되어 있습니다 (${existing.length}건).`);
                return;
            }

            console.log(`🚀 [VOCA Prefetch] ${target}의 단어 데이터를 백그라운드에서 사전 동기화합니다...`);
            if (typeof window.fetchVocaFromNotion === 'function') {
                await window.fetchVocaFromNotion({ studentName: target, forceRefresh: false });
                console.log(`✅ [VOCA Prefetch] ${target} 백그라운드 프리패치 완료!`);
            }
        } catch (e) {
            console.warn(`⚠️ [VOCA Prefetch] 사전 동기화 지연:`, e);
        }
    }

    async function prefetchReadingData(options = {}) {
        try {
            const student = options.student || (window.currentUserName === '민서' ? '민서' : '민수');
            const subject = options.subject || "국어";
            if (typeof window.fetchReadingPassagesFromNotion === 'function') {
                await Promise.allSettled([
                    window.fetchReadingPassagesFromNotion({ subject, track: "🏥 센터 독해", student, forceRefresh: false }),
                    window.fetchReadingPassagesFromNotion({ subject, track: "🏫 교과서 독해", student, forceRefresh: false })
                ]);
            }
        } catch (e) {}
    }

    // ----------------------------------------------------
    // 5. 전사 공통 마스터 동기화 & 토스트 알림
    // ----------------------------------------------------
    async function syncAllNotionData(options = {}) {
        const student = options.student || (window.currentUserName === '민서' ? '민서' : '민수');
        console.log(`🔄 [syncAllNotionData] 노션 전체 데이터 동기화 시작 (학생: ${student})...`);

        // 1) 모든 노션 로컬 캐시 일괄 삭제
        try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (k && (k.includes("_VOCA_CACHE_") || k.includes("_READING_CACHE_") || k.includes("_LIBRARY_CACHE_") || k.includes("_CURRICULUM_CACHE_"))) {
                    localStorage.removeItem(k);
                }
            }
        } catch (e) {}

        // 2) 전체 핵심 데이터 일괄 재수급 (강제 새로고침)
        try {
            const tasks = [];
            if (typeof window.fetchVocaFromNotion === 'function') {
                tasks.push(window.fetchVocaFromNotion({ studentName: student, forceRefresh: true }));
            }
            if (typeof window.fetchReadingPassagesFromNotion === 'function') {
                tasks.push(window.fetchReadingPassagesFromNotion({ subject: "국어", track: "🏥 센터 독해", student, forceRefresh: true }));
                tasks.push(window.fetchReadingPassagesFromNotion({ subject: "국어", track: "🏫 교과서 독해", student, forceRefresh: true }));
            }
            if (typeof window.fetchLibraryBooksFromNotion === 'function') {
                tasks.push(window.fetchLibraryBooksFromNotion({ forceRefresh: true }));
            }
            await Promise.allSettled(tasks);
        } catch (e) {
            console.warn("일부 동기화 실패:", e);
        }

        // 3) 토스트 알림
        showNotionSyncToast("✅ 노션 전체 데이터가 최신 상태로 동기화되었습니다!");
        return true;
    }

    function showNotionSyncToast(msg) {
        let toast = document.getElementById('notionSyncToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'notionSyncToast';
            toast.style.cssText = `
                position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-100px);
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: #fff; font-family: 'Jua', sans-serif; font-size: 1.05rem;
                padding: 12px 24px; border-radius: 30px; box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                z-index: 99999; transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                pointer-events: none; border: 2px solid rgba(255,255,255,0.3);
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.transform = "translateX(-50%) translateY(0)";
        setTimeout(() => {
            if (toast) toast.style.transform = "translateX(-50%) translateY(-100px)";
        }, 2800);
    }

    // ----------------------------------------------------
    // 6. 전역 노출 및 네임스페이스 바인딩 (하위 호환 100%)
    // ----------------------------------------------------
    window.NotionCacheManager = {
        _getVocaCacheKey,
        _loadVocaFromCache,
        _saveVocaToCache,
        clearVocaCache,
        _getReadingCacheKey,
        _loadReadingFromCache,
        _saveReadingToCache,
        loadTimetableFromCache,
        saveTimetableToCache,
        clearTimetableCache,
        prefetchVocaData,
        prefetchReadingData,
        syncAllNotionData,
        showNotionSyncToast
    };

    // 기존 단독 전역 바인딩 보존
    window._loadVocaFromCache = _loadVocaFromCache;
    window._saveVocaToCache = _saveVocaToCache;
    window.clearVocaCache = clearVocaCache;
    window._loadReadingFromCache = _loadReadingFromCache;
    window._saveReadingToCache = _saveReadingToCache;
    window.loadTimetableFromCache = loadTimetableFromCache;
    window.saveTimetableToCache = saveTimetableToCache;
    window.clearTimetableCache = clearTimetableCache;
    window.prefetchVocaData = prefetchVocaData;
    window.prefetchReadingData = prefetchReadingData;
    window.syncAllNotionData = syncAllNotionData;
    window.showNotionSyncToast = showNotionSyncToast;

})(typeof window !== 'undefined' ? window : this);
