// ==========================================
// 📚 민민이네 공부방 어휘·용어사전(VOCA) 노션 연동 모듈 (notion-voca.js)
// ==========================================

var PROXY_URL = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
var VOCA_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.VOCA_DB_ID ? APP_CONFIG.VOCA_DB_ID : "375a27115b688038b686d3994ee12919";

function parseVocaPage(page) {
    const p = page.properties;
    const imgFile = p["이미지파일"]?.files?.[0];
    const imageUrl = imgFile?.file?.url || imgFile?.external?.url
        || p["이미지파일"]?.url
        || p["이미지파일"]?.rich_text?.[0]?.plain_text
        || null;
    const audioFile = p["음성파일"]?.files?.[0];
    const audioUrl = audioFile?.file?.url || audioFile?.external?.url
        || p["음성파일"]?.url
        || p["음성파일"]?.rich_text?.[0]?.plain_text
        || null;
    const unitRaw = p["단원"]?.rich_text?.[0]?.plain_text
        ?? p["단원"]?.number
        ?? p["단원"]?.select?.name
        ?? p["단원"]?.multi_select?.[0]?.name
        ?? p["단계"]?.number
        ?? "기본 단원";
    const grades = p["학년"]?.multi_select?.map(item => item.name)
        || (p["학년"]?.select?.name ? [p["학년"].select.name] : [])
        || (p["학년"]?.rich_text?.[0]?.plain_text ? [p["학년"].rich_text[0].plain_text] : []);

    return {
        pageId: page.id,
        id: page.id,
        word: p["단어"]?.title?.[0]?.plain_text || p["이름"]?.title?.[0]?.plain_text || "",
        meaning: p["뜻풀이"]?.rich_text?.[0]?.plain_text || p["뜻"]?.rich_text?.[0]?.plain_text || "",
        detailContext: p["상세설명"]?.rich_text?.map(t => t.plain_text).join("") || "",
        imageUrl,
        audioUrl,
        interactiveUrl: p["인터렉티브 링크"]?.url || p["인터렉티브 링크"]?.rich_text?.[0]?.plain_text || p["인터랙티브 링크"]?.url || p["인터랙티브 링크"]?.rich_text?.[0]?.plain_text || null,
        pos: p["품사"]?.select?.name || p["품사"]?.rich_text?.[0]?.plain_text || "",
        wordType: p["어휘유형"]?.select?.name || p["어휘유형"]?.multi_select?.[0]?.name || p["어휘유형"]?.rich_text?.[0]?.plain_text || "",
        type: p["어휘유형"]?.select?.name || p["어휘유형"]?.multi_select?.[0]?.name || p["어휘유형"]?.rich_text?.[0]?.plain_text || "",
        stage: String(unitRaw),
        level: unitRaw,
        grades,
        grade: grades[0] || "공통",
        subject: p["과목"]?.multi_select?.map(item => item.name) || [],
        target: p["학생"]?.multi_select?.map(item => item.name) || [],
        isAchieved: p["달성"]?.checkbox || false,
        isMastered: p["달성"]?.checkbox || false, // '달성' 필드 기반 마스터 여부 동기화
        areaZone: p["영역 분류"]?.select?.name || "",
        hint: p["초성힌트"]?.rich_text?.[0]?.plain_text || "",
        quiz: p["퀴즈제시"]?.rich_text?.[0]?.plain_text || ""
    };
}

function _matchesVocaRecord(record, options) {
    if (!record.word) return false;

    if (options.filterByStudent !== false) {
        let loginName = (options.studentName ?? window.currentUserName ?? "민수").trim();
        
        // 💡 부모님 프로필(아빠/엄마/어른)로 로그인해서 테스트 중일 때는,
        // 선택된 아이(son/daughter) 프로필을 기반으로 타겟팅을 스위칭해줍니다.
        if (loginName === '아빠' || loginName === '엄마' || loginName === '어른') {
            const profile = window.currentProfile || localStorage.getItem('currentUser') || 'son';
            loginName = profile === 'daughter' ? '민서' : '민수';
        }

        if (record.target.length > 0 && !record.target.some(t => t.trim() === loginName)) {
            return false;
        }
    }

    if (options.subject) {
        const allowed = [options.subject, ...(options.altSubjects || [])];
        if (!record.subject.some(s => allowed.includes(s))) return false;
    }

    if (options.areaZone && record.areaZone !== options.areaZone) return false;

    return true;
}

// ========================================================
// ⚡ VOCA DB 당일(하루) 캐시 매니저 & 프리패치 엔진
// ========================================================
const VOCA_CACHE_PREFIX = "MINMIN_VOCA_CACHE_";

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
        
        // 이전 날짜 캐시 정리
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && k.startsWith(VOCA_CACHE_PREFIX) && !k.endsWith(todayStr)) {
                localStorage.removeItem(k);
            }
        }
        
        localStorage.setItem(key, JSON.stringify({
            date: todayStr,
            timestamp: Date.now(),
            records
        }));
    } catch (e) {
        console.warn("[VOCA Cache] 캐시 저장 실패:", e);
    }
}

function clearVocaCache(studentName = null) {
    try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && k.startsWith(VOCA_CACHE_PREFIX)) {
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

function _buildVocaQueryBody(options) {
    const body = { page_size: 100 };

    const filters = [];

    // 1. 학생별 서버 필터 (1000건 -> 해당 학생 300~500건으로 3배 압축)
    if (options.filterByStudent && options.studentName) {
        filters.push({
            property: "학생",
            multi_select: { contains: options.studentName }
        });
    }

    // 2. 과목 및 영역 분류 서버 필터 (지정된 경우)
    if (options.useServerFilter && options.subject && options.areaZone) {
        filters.push({ property: "과목", multi_select: { contains: options.subject } });
        filters.push({ property: "영역 분류", select: { equals: options.areaZone } });
    }

    if (filters.length === 1) {
        body.filter = filters[0];
    } else if (filters.length > 1) {
        body.filter = { and: filters };
    }

    return body;
}

/**
 * 노션 VOCA DB에서 단어·공부 데이터를 가져오는 통합 fetch (당일 캐시 탑재)
 *
 * @param {Object} [options]
 * @param {string} [options.subject] - "국어", "영어", "사회", "받아쓰기" 등. 생략 시 전 과목
 * @param {string[]} [options.altSubjects] - 과목 별칭 (예: 영어 → ["영단어"])
 * @param {string} [options.areaZone] - 사회방 "영역 분류" (용어방, 자료실, 지도탐방, 역사)
 * @param {string} [options.studentName] - 학생 이름 필터 (기본: window.currentUserName)
 * @param {boolean} [options.filterByStudent=true] - 학생 필터 적용 여부
 * @param {boolean} [options.useServerFilter=false] - true면 과목+영역을 노션 API filter로 전송
 * @param {boolean} [options.forceRefresh=false] - true면 캐시 무시하고 노션 서버에서 강제 최신화
 * @param {string} [options.dbId] - DB ID override (기본: VOCA_DB_ID)
 * @returns {Promise<Array>}
 */
async function fetchVocaFromNotion(options = {}) {
    const dbId = options.dbId || VOCA_DB_ID;
    const forceRefresh = options.forceRefresh === true;

    let studentTarget = (options.studentName ?? window.currentUserName ?? "민수").trim();
    if (studentTarget === '아빠' || studentTarget === '엄마' || studentTarget === '어른' || studentTarget === 'admin') {
        const profile = window.currentProfile || localStorage.getItem('currentUser') || 'son';
        studentTarget = profile === 'daughter' ? '민서' : '민수';
    }

    const queryOptions = {
        subject: options.subject || null,
        altSubjects: options.altSubjects || [],
        areaZone: options.areaZone || null,
        studentName: studentTarget,
        filterByStudent: options.filterByStudent !== false,
        useServerFilter: options.useServerFilter === true
    };

    // 1. ⚡ 캐시 확인 (강제 새로고침이 아닐 때)
    if (!forceRefresh) {
        const cachedRecords = _loadVocaFromCache(queryOptions.studentName, dbId);
        if (cachedRecords && cachedRecords.length > 0) {
            return cachedRecords.filter(record => _matchesVocaRecord(record, queryOptions));
        }
    }

    // 2. 🌐 노션 API 통신 (캐시 없거나 강제 새로고침 시)
    let allResults = [];
    let hasMore = true;
    let nextCursor = undefined;

    try {
        while (hasMore) {
            const bodyData = _buildVocaQueryBody(queryOptions);
            if (nextCursor) bodyData.start_cursor = nextCursor;

            const response = await fetch(`${PROXY_URL}/v1/databases/${dbId}/query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData)
            });

            if (!response.ok) throw new Error(`노션 VOCA DB 통신 오류 (상태: ${response.status})`);

            const data = await response.json();
            allResults = allResults.concat(data.results || []);
            hasMore = data.has_more;
            nextCursor = data.next_cursor;
        }

        const parsedRecords = allResults.map(parseVocaPage);

        // ⚡ 당일 캐시 저장
        _saveVocaToCache(queryOptions.studentName, dbId, parsedRecords);

        return parsedRecords.filter(record => _matchesVocaRecord(record, queryOptions));
    } catch (error) {
        console.error(`[fetchVocaFromNotion] ${options.subject || "전체"} 데이터 로딩 실패:`, error);
        // 에러 시 기존 캐시로 안전 폴백
        const fallback = _loadVocaFromCache(queryOptions.studentName, dbId);
        if (fallback && fallback.length > 0) {
            return fallback.filter(record => _matchesVocaRecord(record, queryOptions));
        }
        return [];
    }
}

/**
 * 🚀 로비 진입 시 백그라운드에서 조용히 VOCA 데이터를 사전 다운로드 및 캐싱하는 헬퍼 (논블로킹)
 */
async function prefetchVocaData(studentName = null) {
    try {
        let target = (studentName || window.currentUserName || '민수').trim();
        if (target === '아빠' || target === '엄마' || target === '어른' || target === 'admin') {
            const profile = window.currentProfile || localStorage.getItem('currentUser') || 'son';
            target = profile === 'daughter' ? '민서' : '민수';
        }

        // 캐시가 이미 존재하면 추가 쿼리 없이 완료
        const existing = _loadVocaFromCache(target, VOCA_DB_ID);
        if (existing && existing.length > 0) {
            console.log(`⚡ [VOCA Prefetch] ${target}의 단어 캐시가 이미 준비되어 있습니다 (${existing.length}건).`);
            return;
        }

        console.log(`🚀 [VOCA Prefetch] ${target}의 단어 데이터를 백그라운드에서 사전 동기화합니다...`);
        await fetchVocaFromNotion({ studentName: target, forceRefresh: false });
        console.log(`✅ [VOCA Prefetch] ${target} 백그라운드 프리패치 완료!`);
    } catch (e) {
        console.warn(`⚠️ [VOCA Prefetch] 사전 동기화 지연:`, e);
    }
}

async function fetchLibraryBooksFromNotion() {
    const LIBRARY_DB_ID = "37ca27115b688023a7d2cc5b3ff51fee";
    try {
        const response = await fetch(`${PROXY_URL}/v1/databases/${LIBRARY_DB_ID}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filter: { property: "추천 여부", checkbox: { equals: true } },
                page_size: 10
            })
        });
        if (!response.ok) throw new Error(`노션 도서관 DB 통신 오류 (상태: ${response.status})`);
        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error("[fetchLibraryBooksFromNotion] 로딩 실패:", error);
        throw error;
    }
}

const MAX_READING_PASSAGES = 10;

function mapNotionRecordsToReadingBooks(records, localDatabase) {
    if (!Array.isArray(localDatabase) || localDatabase.length === 0) return [];
    return (records || [])
        .map(res => {
            const barcode = res.properties?.["도서 키(ID)"]?.rich_text?.[0]?.plain_text;
            if (!barcode) return null;
            return localDatabase.find(book => book.id === barcode) || null;
        })
        .filter(Boolean)
        .slice(0, MAX_READING_PASSAGES);
}

/**
 * 노션 추천 도서 + 로컬 지문 DB를 합쳐 최대 10편 반환
 * - 노션 추천이 없으면 로컬 DB 앞에서부터 최대 10편
 * - 노션이 일부만 추천해도 로컬 DB로 빈 자리를 채움
 */
function resolveReadingPassageList(records, localDatabase) {
    const localCap = (localDatabase || []).slice(0, MAX_READING_PASSAGES);
    if (!localCap.length) return [];

    const fromNotion = mapNotionRecordsToReadingBooks(records, localDatabase);
    if (fromNotion.length === 0) return localCap;

    const merged = [...fromNotion];
    const seen = new Set(fromNotion.map(book => book.id));
    for (const book of localCap) {
        if (merged.length >= MAX_READING_PASSAGES) break;
        if (!seen.has(book.id)) {
            merged.push(book);
            seen.add(book.id);
        }
    }
    return merged.slice(0, MAX_READING_PASSAGES);
}

window.fetchLibraryBooksFromNotion = fetchLibraryBooksFromNotion;
window.resolveReadingPassageList = resolveReadingPassageList;
window.MAX_READING_PASSAGES = MAX_READING_PASSAGES;


/**
 * 용어사전(VOCA DB)의 '달성(체크박스)' 필드 갱신 (마스터 연동용)
 */
async function updateVocaMasteryStatus(pageId, isMastered) {
    if (!pageId) return false;
    // 관리자 모드이거나 로컬 런타임이면 무시
    const savedName = localStorage.getItem('currentUserName');
    if (savedName === '아빠' || savedName === '엄마' || savedName === '어른') {
        console.log(`🛠️ [마스터 프리패스] 관리자 모드이므로 노션 마스터 체크 갱신을 생략합니다.`);
        return true;
    }
    
    try {
        const res = await fetch(`${PROXY_URL}/v1/pages/${pageId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                properties: {
                    "달성": { checkbox: isMastered }
                }
            })
        });
        if (!res.ok) throw new Error(await res.text());
        console.log(`✅ [마스터 연동 완료] 페이지(${pageId}) 달성 상태가 ${isMastered}로 갱신되었습니다.`);
        return true;
    } catch (e) {
        console.error("❌ VOCA 달성 상태 업데이트 실패:", e);
        return false;
    }
}

// ========================================================
// 🎙️ STT 디바운스 엔진 (interim 차단 + 1.5초 정적 후 1회 전송)
// ========================================================

