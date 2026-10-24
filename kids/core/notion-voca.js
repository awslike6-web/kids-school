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
        createdTime: page.created_time || null,
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
        examScope: p["시험범위"]?.checkbox || false,
        mastery: p["숙련도"]?.rich_text?.map(t => t.plain_text).join("") || "", // "count|silverDate|lastReviewed"
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
const VOCA_CACHE_PREFIX = "MINMIN_VOCA_CACHE_V12_";

// 🕒 캐시 날짜는 한국 시간 기준 (UTC로 자르면 오전 9시 전에는 전날 캐시를 씀)
function _vocaKstTodayStr() {
    const kst = new Date(Date.now() + 9 * 3600000);
    return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`;
}

function _getVocaCacheKey(studentName, dbId) {
    const todayStr = _vocaKstTodayStr(); // YYYY-MM-DD
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
        const todayStr = _vocaKstTodayStr();
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
            examScope: !!r.examScope,
            mastery: r.mastery || "",
            createdTime: r.createdTime || null,
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

    const cacheTarget = queryOptions.filterByStudent ? queryOptions.studentName : 'ALL';

    // 1. ⚡ 캐시 확인 (강제 새로고침이 아닐 때)
    if (!forceRefresh) {
        const cachedRecords = _loadVocaFromCache(cacheTarget, dbId);
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
            // 💡 Notion API Rate Limit(초당 3회) 및 Worker 과부하 방어 딜레이
            if (hasMore) {
                await new Promise(r => setTimeout(r, 60));
            }
        }

        const parsedRecords = allResults.map(parseVocaPage);

        // ⚡ 당일 캐시 저장
        _saveVocaToCache(cacheTarget, dbId, parsedRecords);

        return parsedRecords.filter(record => _matchesVocaRecord(record, queryOptions));
    } catch (error) {
        console.error(`[fetchVocaFromNotion] ${options.subject || "전체"} 데이터 로딩 실패:`, error);
        // 에러 시 기존 캐시로 안전 폴백
        const fallback = _loadVocaFromCache(cacheTarget, dbId);
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
            return localDatabase.find(book => book.id === barcode || book.aliasId === barcode) || null;
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

/**
 * 5분 퀘스트 숙련도 Pull 전용: 학생·과목(·단원) 서버 필터로 좁혀 당일 로컬 캐시 없이 노션 행을 읽는다.
 * 일 단위 로컬 캐시(_saveVocaToCache)는 건드리지 않는다. 실패 시 null 반환.
 *
 * @param {Object} options
 * @param {string} options.studentName - "민수" | "민서"
 * @param {string} [options.subject] - "영어" 등 과목(multi_select contains)
 * @param {string} [options.unit] - 단원 정확 일치(rich_text equals). 생략 시 과목 전체
 * @param {string[]} [options.units] - 여러 단원 묶음 (각각 정확 일치를 or로 묶어 요청 1회)
 * @param {number} [options.timeoutMs=4000]
 */
async function fetchVocaUnitFresh(options = {}) {
    const filters = [];
    if (options.studentName) filters.push({ property: "학생", multi_select: { contains: options.studentName } });
    if (options.subject) filters.push({ property: "과목", multi_select: { contains: options.subject } });
    if (Array.isArray(options.units) && options.units.length > 0) {
        filters.push({ or: options.units.map(u => ({ property: "단원", rich_text: { equals: String(u) } })) });
    } else if (options.unit) {
        filters.push({ property: "단원", rich_text: { equals: String(options.unit) } });
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), options.timeoutMs || 4000) : null;
    let results = [];
    let cursor;
    try {
        do {
            const body = { page_size: 100 };
            if (filters.length === 1) body.filter = filters[0];
            else if (filters.length > 1) body.filter = { and: filters };
            if (cursor) body.start_cursor = cursor;
            // 배포된 Worker는 Pragma 헤더(CORS)와 ?force(노션 400)를 받지 않으므로 기본 요청을 쓴다.
            // 엣지 캐시(최대 5분) 지연은 quest-mastery.js의 최근 전송 보호 규칙이 흡수한다.
            const res = await fetch(`${PROXY_URL}/v1/databases/${VOCA_DB_ID}/query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                signal: controller ? controller.signal : undefined
            });
            if (!res.ok) throw new Error(`노션 VOCA 단원 조회 오류 (상태: ${res.status})`);
            const data = await res.json();
            results = results.concat(data.results || []);
            cursor = data.has_more ? data.next_cursor : null;
        } while (cursor);
        return results.map(parseVocaPage);
    } catch (e) {
        console.warn("[fetchVocaUnitFresh] 최신 숙련도 조회 실패 (로컬 상태로 진행):", e);
        return null;
    } finally {
        if (timer) clearTimeout(timer);
    }
}

/**
 * 5분 퀘스트 숙련도 Push: '숙련도' 텍스트(+선택적으로 '달성')를 한 번에 PATCH.
 * @param {string} pageId
 * @param {string} masteryText - "count|silverDate|lastReviewed"
 * @param {boolean|null} [isAchieved] - null이면 '달성'은 건드리지 않음
 */
async function updateVocaMasteryProgress(pageId, masteryText, isAchieved = null) {
    if (!pageId) return false;
    const savedName = localStorage.getItem('currentUserName');
    if (savedName === '아빠' || savedName === '엄마' || savedName === '어른') {
        console.log(`🛠️ [마스터 프리패스] 관리자 모드이므로 숙련도 동기화를 생략합니다.`);
        return true;
    }
    const properties = { "숙련도": { rich_text: [{ text: { content: String(masteryText) } }] } };
    if (isAchieved === true || isAchieved === false) properties["달성"] = { checkbox: isAchieved };
    try {
        const res = await fetch(`${PROXY_URL}/v1/pages/${pageId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ properties })
        });
        if (!res.ok) throw new Error(await res.text());
        return true;
    } catch (e) {
        console.error("❌ VOCA 숙련도 업데이트 실패:", e);
        return false;
    }
}

// ========================================================
// 🌐 전역(window) 명시적 노출 (5분 퀘스트 및 서브 모듈 연동용)
// ========================================================
if (typeof window !== 'undefined') {
    window._loadVocaFromCache = _loadVocaFromCache;
    window._saveVocaToCache = _saveVocaToCache;
    window.fetchVocaFromNotion = fetchVocaFromNotion;
    window.prefetchVocaData = prefetchVocaData;
    window.clearVocaCache = clearVocaCache;
    window.updateVocaMasteryStatus = updateVocaMasteryStatus;
    window.fetchVocaUnitFresh = fetchVocaUnitFresh;
    window.updateVocaMasteryProgress = updateVocaMasteryProgress;
    window.parseVocaPage = parseVocaPage;
    window.VOCA_DB_ID = VOCA_DB_ID;
}

