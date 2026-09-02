// ==========================================
// 💎 전역 만능 보상 지급 및 노션 학습 연동 핵심 통합 헬퍼 (notion-helper.js)
// ==========================================

var PROXY_URL = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
var STUDY_LOG_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STUDY_LOG_DB_ID ? APP_CONFIG.STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2"; // 학습일지 DB ID
var INVENTORY_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.INVENTORY_DB_ID ? APP_CONFIG.INVENTORY_DB_ID : "374a27115b688042bb61e6a102242e12"; // 8042로 통일
var VOCA_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.VOCA_DB_ID ? APP_CONFIG.VOCA_DB_ID : "375a27115b688038b686d3994ee12919";
var NOTION_CHAT_MEMORY_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.NOTION_CHAT_MEMORY_DB_ID ? APP_CONFIG.NOTION_CHAT_MEMORY_DB_ID : "373a27115b6880ba82cdfeaa1c825547";
var TIMETABLE_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.TIMETABLE_DB_ID ? APP_CONFIG.TIMETABLE_DB_ID : "e3f9b3917c2b48bfa3d47db4bd0545fd";

/**
 * 노션 VOCA DB 페이지 1건을 공통 객체로 변환
 */
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
 * "1교시(09:00~09:40)" 형태의 교시 문자열 파싱
 */
function parseTimetablePeriodSlot(raw) {
    if (!raw) return { num: 0, label: "", timeRange: "", display: "" };
    const text = String(raw).trim();
    const match = text.match(/(\d)\s*교시(?:\s*\(([^)]+)\))?/);
    if (!match) return { num: 0, label: text, timeRange: "", display: text };
    const num = parseInt(match[1], 10);
    const timeRange = (match[2] || "").trim();
    const label = `${num}교시`;
    const display = timeRange ? `${label}(${timeRange})` : label;
    return { num, label, timeRange, display };
}

function inferPeriodNumFromDate(periodDate) {
    if (!periodDate?.start) return 0;
    const d = new Date(periodDate.start);
    if (isNaN(d.getTime())) return 0;
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const map = { "09:00": 1, "10:00": 2, "11:00": 3, "13:00": 4, "14:00": 5, "15:00": 6 };
    return map[time] || 0;
}

/**
 * 노션 시간표 DB 페이지 1건을 공통 객체로 변환
 */
function parseTimetablePage(page) {
    const p = page.properties;
    const periodProp = p["교시 시간"];
    const periodRaw =
        p["교시"]?.select?.name ||
        periodProp?.select?.name ||
        (periodProp?.rich_text || []).map(t => t.plain_text).join("") ||
        periodProp?.title?.[0]?.plain_text ||
        "";
    const periodSlot = parseTimetablePeriodSlot(periodRaw);
    const periodDate = periodProp?.date || null;
    const alertDate = p["알림"]?.date || null;
    const customDate = p["날짜"]?.date || null;
    let periodNum = periodSlot.num;
    if (!periodNum && periodDate?.start) {
        periodNum = inferPeriodNumFromDate(periodDate);
    }

    return {
        id: page.id,
        title: p["수업"]?.title?.[0]?.plain_text || "",
        child: p["아이"]?.select?.name || "",
        subject: p["과목"]?.select?.name || "",
        dayOfWeek: p["요일"]?.select?.name || "",
        periodNum,
        periodSlot: periodNum && !periodSlot.num
            ? { num: periodNum, label: `${periodNum}교시`, timeRange: "", display: `${periodNum}교시` }
            : periodSlot,
        periodStart: periodDate?.start || null,
        periodEnd: periodDate?.end || null,
        alertAt: alertDate?.start || null,
        targetDate: customDate?.start || alertDate?.start || null,
        targetDateEnd: customDate?.end || alertDate?.end || null,
        scope: p["적용 범위"]?.select?.name || "",
        isCompleted: p["완료"]?.checkbox || false,
        memo: (p["메모"]?.rich_text || []).map(t => t.plain_text).join("") || "",
        link: p["링크"]?.url || "",
        createdAt: page.created_time || null,
        pageContent: ""
    };
}

/**
 * 📝 노션 시간표 아이템의 완료 체크박스 상태 업데이트 (준비물 챙김 여부 등)
 */
async function updateTimetableItemComplete(pageId, isCompleted) {
    if (!pageId) return false;
    try {
        const response = await fetch(`${PROXY_URL}/v1/pages/${pageId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                properties: {
                    "완료": { checkbox: !!isCompleted }
                }
            })
        });
        return response.ok;
    } catch (e) {
        console.error("[updateTimetableItemComplete] 완료 상태 업데이트 실패:", e);
        return false;
    }
}
window.updateTimetableItemComplete = updateTimetableItemComplete;

/** 노션 블록 1개에서 plain text 추출 */
function extractPlainTextFromNotionBlock(block) {
    if (!block || !block.type) return "";
    const data = block[block.type];
    if (!data) return "";

    if (Array.isArray(data.rich_text)) {
        return data.rich_text.map(t => t.plain_text || "").join("");
    }
    if (block.type === "child_page" && data.title) return String(data.title);
    if (block.type === "child_database" && data.title) return String(data.title);
    return "";
}

/**
 * 노션 블록의 자식 블록을 재귀적으로 plain text로 수집
 * (toggle, heading, list item, callout, column 등 has_children 블록용)
 */
async function fetchNotionBlockChildrenPlainText(blockId) {
    if (!blockId) return "";
    let chunks = [];
    let hasMore = true;
    let nextCursor = undefined;

    try {
        while (hasMore) {
            const qs = new URLSearchParams({ page_size: "100" });
            if (nextCursor) qs.set("start_cursor", nextCursor);

            const response = await fetch(`${PROXY_URL}/v1/blocks/${blockId}/children?${qs.toString()}`);
            if (!response.ok) break;

            const data = await response.json();
            for (const block of data.results || []) {
                const text = await collectPlainTextFromNotionBlock(block);
                if (text.trim()) chunks.push(text.trim());
            }
            hasMore = !!data.has_more;
            nextCursor = data.next_cursor;
        }
    } catch (error) {
        console.warn("[fetchNotionBlockChildrenPlainText] 자식 블록 로드 실패:", blockId, error);
    }

    return chunks.join("\n\n");
}

/** 블록 자체 텍스트 + has_children이면 중첩 자식까지 plain text 수집 */
async function collectPlainTextFromNotionBlock(block) {
    const parts = [];
    const ownText = extractPlainTextFromNotionBlock(block);
    if (ownText.trim()) parts.push(ownText.trim());

    if (block.has_children && block.id) {
        const childText = await fetchNotionBlockChildrenPlainText(block.id);
        if (childText.trim()) parts.push(childText.trim());
    }

    return parts.join("\n\n");
}

/**
 * 노션 페이지 본문(blocks)을 plain text로 수집 — 공지 본문(페이지 내용)용
 */
async function fetchNotionPageBlocksPlainText(pageId) {
    if (!pageId) return "";
    let chunks = [];
    let hasMore = true;
    let nextCursor = undefined;

    try {
        while (hasMore) {
            const qs = new URLSearchParams({ page_size: "100" });
            if (nextCursor) qs.set("start_cursor", nextCursor);

            const response = await fetch(`${PROXY_URL}/v1/blocks/${pageId}/children?${qs.toString()}`);
            if (!response.ok) break;

            const data = await response.json();
            for (const block of data.results || []) {
                const text = await collectPlainTextFromNotionBlock(block);
                if (text.trim()) chunks.push(text.trim());
            }
            hasMore = !!data.has_more;
            nextCursor = data.next_cursor;
        }
    } catch (error) {
        console.warn("[fetchNotionPageBlocksPlainText] 본문 로드 실패:", pageId, error);
    }

    return chunks.join("\n\n");
}

function isTimetableNoticeCandidate(row) {
    const hasPeriod = !!(row.periodNum || row.periodSlot?.num);
    if (hasPeriod) return false;
    return !!(row.title || row.memo || row.alertAt || row.subject);
}

async function enrichTimetableRowsWithPageContent(rows) {
    const targets = rows.filter(isTimetableNoticeCandidate);
    if (!targets.length) return rows;

    await Promise.all(targets.map(async (row) => {
        const body = await fetchNotionPageBlocksPlainText(row.id);
        if (body) row.pageContent = body;
    }));

    return rows;
}

/**
 * 노션 시간표 DB에서 전체 일정을 가져옴 (페이지네이션 전량 수집)
 * @returns {Promise<Array>}
 */
async function fetchTimetableFromNotion(options = {}) {
    const dbId = options.dbId || TIMETABLE_DB_ID;
    let allResults = [];
    let hasMore = true;
    let nextCursor = undefined;

    try {
        while (hasMore) {
            const bodyData = { page_size: 100 };
            if (nextCursor) bodyData.start_cursor = nextCursor;

            const response = await fetch(`${PROXY_URL}/v1/databases/${dbId}/query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData)
            });

            if (!response.ok) throw new Error(`노션 시간표 DB 통신 오류 (상태: ${response.status})`);

            const data = await response.json();
            allResults = allResults.concat(data.results || []);
            hasMore = data.has_more;
            nextCursor = data.next_cursor;
        }

        const rows = allResults
            .map(parseTimetablePage)
            .filter(row => row.title || row.subject || row.dayOfWeek || row.memo || row.alertAt);

        if (options.fetchPageContent !== false) {
            await enrichTimetableRowsWithPageContent(rows);
        }

        return rows;
    } catch (error) {
        console.error("[fetchTimetableFromNotion] 로딩 실패:", error);
        return [];
    }
}

window.fetchTimetableFromNotion = fetchTimetableFromNotion;
window.parseTimetablePage = parseTimetablePage;

// 🕒 전역 학습 시작 시간 자동 기록
window.roomStartTime = window.roomStartTime || new Date();

/**
 * 아버님의 새로운 노션 DB 구조에 맞춰 학습 일지를 생성하는 통합 함수
 * 매개변수를 생략해도 현재 환경(window 객체)을 바탕으로 자동으로 채웁니다.
 */
async function sendStudyLogToNotion(options = {}) {
    const childName = options.childName || (localStorage.getItem('currentUser') === 'son' ? '민수' : '민서');
    const subject = options.subject || window.currentSubject || "미상 과목";
    const startTime = options.startTime || window.roomStartTime.toISOString();
    const endTime = options.endTime || new Date().toISOString();
    
    // 소요시간 자동 연산
    let durationMinutes = options.durationMinutes;
    if (durationMinutes === undefined) {
        const timeDiff = new Date(endTime) - new Date(startTime);
        durationMinutes = Math.floor(timeDiff / 60000);
        if (durationMinutes < 1) durationMinutes = 1;
    }
    
    // 오답 리포트 자동 수집
    let errorReport = options.errorReport;
    if (errorReport === undefined) {
        // 영어(engWrongNotes) 또는 국어/수학(wrongNotes) 배열 호환
        const targetNotes = window.engWrongNotes || window.wrongNotes || [];
        errorReport = targetNotes.length > 0 ? targetNotes.map(q => {
            if (q.wrongInput) return `${q.word || q.text} (오답: ${q.wrongInput})`;
            return q.word || q.text || q;
        }).join(' / ') : "오답 없음";
    }
    
    const wordFairyCount = options.wordFairyCount || window.wordFairyCount || (window.learningSession ? window.learningSession.fairyClickCount : 0) || 0;

    console.log(`🚀 [학습일지 배달 시작] 학생: ${childName} | 과목: ${subject}`);

    // 💡 [핵심 방어막] 현재 로그인한 사람이 아빠나 엄마인지 실시간 체크!
    const savedName = localStorage.getItem('currentUserName');
    if (savedName === '아빠' || savedName === '엄마' || savedName === '어른') {
        console.log(`🛠️ [관리자 시뮬레이터 가동] ${savedName} 모드이므로 노션 서버 전송을 건너뛰고 프리패스합니다!`);
        return true; 
    }

    try {
        const payload = {
            parent: { database_id: STUDY_LOG_DB_ID },
            properties: {
                "ID": { 
                    title: [{ text: { content: `${childName}_${new Date().toLocaleDateString()}` } }] 
                },
                "학생": { 
                    select: { name: childName } 
                },
                "과목": { 
                    rich_text: [{ text: { content: subject } }] 
                },
                "입장": { 
                    date: { start: startTime } 
                },
                "퇴장": { 
                    date: { start: endTime } 
                },
                "소요시간": { 
                    number: durationMinutes 
                },
                "오답리포트": { 
                    rich_text: [{ text: { content: errorReport || "오답 없음" } }] 
                },
                "단어요정": { 
                    number: wordFairyCount 
                }
            }
        };

        const response = await fetch(`${PROXY_URL}/v1/pages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true 
        });

        if (!response.ok) throw new Error(`노션 통신 오류 (상태: ${response.status})`);

        console.log("🎉 노션에 학습 일지가 완벽하게 기록되었습니다!");
        return true;
    } catch (error) {
        console.error("학습일지 전송 실패:", error);
        return false;
    }
}

/**
 * 경험치를 바탕으로 레벨업 단계 정보를 연산하는 공식
 */
function calculateLevelInfo(totalRewards) {
    let level = 1; let requiredForNext = 20; let accumulatedForCurrentLevel = 0; 
    while (totalRewards >= accumulatedForCurrentLevel + requiredForNext) {
        accumulatedForCurrentLevel += requiredForNext; level++; requiredForNext = 20 + (level - 1) * 5; 
    }
    let currentLevelProgress = totalRewards - accumulatedForCurrentLevel; 
    let remainingForNext = requiredForNext - currentLevelProgress; 
    return { level, requiredForNext, remainingForNext, currentLevelProgress };
}

/**
 * 💎 전역 만능 보상 지급 엔진 (일일 상한선 노션DB 연동 & 용어방 독립)
 */
async function grantRewardAndShowUI(earned, isSilent = false, customExpType = null) {
  const userName = localStorage.getItem('currentUser') === 'son' ? '민수' : '민서'; 
  const currentTheme = localStorage.getItem('currentTheme') || '마인크래프트';
  
  // 💡 [핵심 방어막] 현재 로그인한 사람이 아빠나 엄마인지 실시간 체크 (우회 모드 시 보상 전송 차단)
  const savedName = localStorage.getItem('currentUserName');
  if (savedName === '아빠' || savedName === '엄마' || savedName === '어른') {
      console.log(`🛠️ [보상 프리패스] ${savedName} 모드이므로 노션 서버 전송을 건너뛰고 프리패스합니다! (${earned}개 획득 처리)`);
      return true;
  }

  // 💡 1. 대장님 노션 DB 칼럼명에 맞춘 완벽한 자동 라우팅
  // window.currentSubject가 없으면 "사회"로 폴백
  const subjectName = window.currentSubject || "사회"; 
  let expPropName = `${subjectName} 경험치`;   // 기본: "수학 경험치" 등
  let levelPropName = `${subjectName} 레벨`;   // 기본: "수학 레벨" 등
  let dailyPropName = `오늘 획득_${subjectName}`; // 기본: "오늘 획득_수학" 등

  let vocaExpPropName = null;
  // 용어방에서 호출했을 경우, 메인 경험치와 용어 경험치 쌍끌이(동시 누적) 적용
  if (customExpType === 'voca') {
      vocaExpPropName = `용어 경험치_${subjectName}`; // "용어 경험치_사회"
  }

  const DAILY_LIMIT = 100; // 하루 보상 획득 상한선 (필요시 수정)

  try {
    const response = await fetch(`${PROXY_URL}/v1/databases/${INVENTORY_DB_ID}/query`, { 
      method: "POST", headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ filter: { property: "이름", title: { equals: userName } } }) 
    });
    
    if (!response.ok) {
        const queryErr = await response.text();
        console.error("인벤토리 조회 쿼리 실패:", queryErr);
        throw new Error(`인벤토리 조회 실패 (${response.status})`);
    }

    const data = await response.json(); 
    if (!data.results || data.results.length === 0) throw new Error("학생 인벤토리 없음");
    
    const page = data.results[0]; 
    const props = page.properties;

    // 💡 2. 자정(12시) 초기화를 위한 스마트 날짜 체크 로직
    const todayStr = new Date().toLocaleDateString();
    const lastDateKey = `last_play_date_${userName}_${subjectName}`;
    const lastPlayDate = localStorage.getItem(lastDateKey);
    
    // 노션에서 '오늘 획득_사회' 값 가져오기
    let todayEarned = props[dailyPropName]?.number || 0;
    
    // 만약 접속한 날짜가 바뀌었다면? (새로운 날이면 오늘 획득량을 0으로 리셋)
    if (lastPlayDate !== todayStr) {
        todayEarned = 0;
        localStorage.setItem(lastDateKey, todayStr);
    }

    // 💡 3. 일일 상한선 (부분 지급 지원)
    let allowedCurrency = earned;
    let isLimitReached = false;
    if (todayEarned + earned > DAILY_LIMIT) {
        allowedCurrency = Math.max(0, DAILY_LIMIT - todayEarned);
        isLimitReached = true;
    }
    
    // 만약 이미 상한을 채워서 받을 수 있는 보상이 0개라면 조용히 넘어가거나 알림
    if (allowedCurrency <= 0 && isLimitReached) {
        if (!isSilent) {
            let msg = `⏳ 오늘 [${subjectName}] 과목에서 얻을 수 있는 보상을 모두 모았어요!\n(일일 상한선 ${DAILY_LIMIT}개 도달)\n내일 다시 즐겁게 탐험해 봐요!`;
            if (typeof showRewardModal === 'function' && typeof updateRewardModal === 'function') {
                showRewardModal(`<div style="color: #ff073a; font-weight: bold;">⚠️ 오늘 ${subjectName} 보상을 모두 캤습니다!<br><br><button onclick="location.href=window.location.pathname.includes('/kids-school/') ? '/kids-school/lobby.html' : '/lobby.html'">로비로 나가기</button></div>`);
            } else {
                alert(msg);
            }
        }
        return false; 
    }

    // 💡 4. 자산 및 경험치 계산
    let diamond = props["다이아몬드 개수"]?.number || 0; 
    let slime = typeof getDaughterRewardCount === 'function'
        ? getDaughterRewardCount(props)
        : (props["슬라임 파츠 개수"]?.number || 0);
    let tickets = props["소원권 개수"]?.number || 0;
    let currentExp = props[expPropName]?.number || 0; 
    
    let previousWealth = currentTheme === '마인크래프트' ? diamond : slime;
    let currentWealth = previousWealth + allowedCurrency;
    let newExp = currentExp + earned; // 메인 경험치는 깎이지 않고 순수하게 모두 오르게 처리
    
    const prevLevelInfo = calculateLevelInfo(currentExp);
    const currLevelInfo = calculateLevelInfo(newExp);

    let earnedTickets = Math.floor(currentWealth / 150) - Math.floor(previousWealth / 150);
    let newTickets = tickets + earnedTickets;

    // 📦 5. 노션 업데이트 보따리 (기본 공통 칼럼)
    let updateProps = { 
        "소원권 개수": { number: newTickets },
        [expPropName]: { number: newExp },
        [dailyPropName]: { number: todayEarned + allowedCurrency }
    };
    
    if (levelPropName) {
        updateProps[levelPropName] = { number: currLevelInfo.level };
    }

    // 💡 용어(보카)방 전용 쌍끌이 보상 및 용어레벨(평균) 계산 
    if (vocaExpPropName) {
        let currentVocaExp = props[vocaExpPropName]?.number || 0;
        let newVocaExp = currentVocaExp + earned;
        updateProps[vocaExpPropName] = { number: newVocaExp };
        
        // 전체 과목의 용어레벨 평균 계산
        const subjects = ["국어", "수학", "영어", "사회", "과학"];
        let totalVocaLevel = 0;
        let subjectCount = 0; // 실제로 용어 경험치 칼럼이 존재하는 과목만 카운트
        
        for (const sub of subjects) {
            const propName = `용어 경험치_${sub}`;
            // 노션 DB에 해당 과목의 용어 경험치 칼럼이 존재하는지 확인
            if (props[propName] !== undefined || sub === subjectName) {
                let exp = props[propName]?.number || 0;
                if (sub === subjectName) {
                    exp = newVocaExp; // 방금 얻은 최신 용어 경험치로 치환
                }
                const levelInfo = calculateLevelInfo(exp);
                totalVocaLevel += levelInfo.level;
                subjectCount++;
            }
        }
        
        // 유효한 과목이 있을 때만 평균 계산 및 업데이트
        if (subjectCount > 0) {
            const averageVocaLevel = Math.floor(totalVocaLevel / subjectCount);
            updateProps["용어 레벨"] = { number: averageVocaLevel }; // [용어 레벨] 필드에 평균값 매핑
        }
    }
    
    if (currentTheme === '마인크래프트') {
        updateProps["다이아몬드 개수"] = { number: currentWealth };
    } else {
        const daughterProp = typeof getRewardPropertyForUpdate === 'function'
            ? getRewardPropertyForUpdate(props, currentTheme)
            : "슬라임 파츠 개수";
        updateProps[daughterProp] = { number: currentWealth };
    }

    console.log(`[노션 보상 업데이트 시도] DB_ID: ${INVENTORY_DB_ID}, PAGE_ID: ${page.id}`);
    console.log("업데이트할 데이터:", JSON.stringify(updateProps, null, 2));

    // 노션으로 쏘기!
    const patchRes = await fetch(`${PROXY_URL}/v1/pages/${page.id}`, { 
      method: "PATCH", headers: { "Content-Type": "application/json" }, 
      body: JSON.stringify({ properties: updateProps }) 
    });
    
    if (!patchRes.ok) {
        const errText = await patchRes.text();
        console.error("노션 PATCH 에러 응답:", errText);
        throw new Error(`노션 업데이트 실패 (상태: ${patchRes.status}): ${errText}`);
    }
    
    if (!isSilent) {
        let rewardName = typeof getRewardDisplayLabel === 'function'
            ? getRewardDisplayLabel(currentTheme)
            : (currentTheme === '마인크래프트' ? '💎 다이아몬드' : '🍬 하리보 젤리');
        
        // 1️⃣ 국어방 모달 UI가 있다면 활용
        if (typeof showRewardModal === 'function' && typeof updateRewardModal === 'function') {
            let limitMessageHtml = "";
            if (isLimitReached) {
                limitMessageHtml = `<div style="background: rgba(255,152,0,0.1); border: 2px solid #ff9800; padding: 10px; border-radius: 8px; color: #ff9800; font-weight: bold; margin-bottom: 15px;">⚠️ 일일 최대 보상(${DAILY_LIMIT}개) 도달!<br><span style="font-size:0.9rem;">(이번엔 ${allowedCurrency}개만 획득)</span></div>`;
            }
            updateRewardModal(`
                ${limitMessageHtml}
                <b style="color:#0288D1; font-size: 1.5rem;">${rewardName} ${allowedCurrency}개 획득!</b> <span style="color:#8b949e; font-size:0.9rem;">(경험치 +${earned})</span><br><br>
                현재 총 자산: <b>${currentWealth}</b>개<br>
                <span style="font-size:0.9rem; color:#666;">다음 ${subjectName} 레벨(Lv.${currLevelInfo.level + 1})까지 경험치 ${currLevelInfo.remainingForNext} 필요!</span>
                ${currLevelInfo.level > prevLevelInfo.level ? `<br><br><span style="font-size:1.3rem; color:#FF6B9D; font-weight:bold;">🎉 ${subjectName} 레벨 업! Lv.${currLevelInfo.level} 🎉</span>` : ''}
                ${earnedTickets > 0 ? `<br><br><span style="font-size:1.2rem; color:#FFD700; font-weight:bold;">🎫 소원권 ${earnedTickets}장 추가 획득!!</span>` : ''}
                <br><br>
                <button onclick="location.href=window.location.pathname.includes('/kids-school/') ? '/kids-school/lobby.html' : '/lobby.html'" style="padding: 10px 20px; font-size: 1.1rem; border: none; border-radius: 8px; background-color: #4CAF50; color: white; cursor: pointer; font-weight: bold;">대형 로비로 돌아가기</button>
            `);
            
            // 여기서 화면에 띄우기 (만약 닫혀있었다면)
            const modal = document.getElementById('rewardModal');
            if (modal) {
                modal.style.display = 'block';
            }
        } 
        // 2️⃣ 수학방 r-detail UI가 있다면 활용
        else if (document.getElementById('r-detail')) {
            let detailEl = document.getElementById('r-detail');
            detailEl.innerHTML += `
              <div style="background:rgba(255,255,255,0.8); border:2px dashed #6EC6F5; padding:16px; border-radius:12px; margin-top:10px; text-align: left;">
                <div style="font-size: 1.15rem; margin-bottom: 8px;">
                  <b style="color:#0288D1;">${rewardName} x ${allowedCurrency} 획득! (총 ${currentWealth}개)</b>
                </div>
                <div style="font-size: 0.95rem; color: #666; margin-bottom: 6px;">
                  다음 ${subjectName} 레벨(Lv.${currLevelInfo.level + 1})까지 경험치 <b>${currLevelInfo.remainingForNext}</b> 필요!
                </div>
                ${currLevelInfo.level > prevLevelInfo.level ? `<div style="text-align:center; font-size:1.3rem; color:#FF6B9D; font-weight:bold; margin-top:10px;">🎉 ${subjectName} 레벨 업! Lv.${currLevelInfo.level} 🎉</div>` : ''}
              </div>
            `;
        } 
        // 3️⃣ 기본 알림
        else {
            let alertMsg = `🎉 보상 획득 완료!\n+${allowedCurrency}개 적립! (오늘 ${todayEarned + allowedCurrency}/${DAILY_LIMIT})`;
            if (levelPropName) {
                alertMsg += `\n${subjectName} 레벨: Lv.${currLevelInfo.level}`;
            } else {
                alertMsg += `\n용어 경험치가 상승했습니다!`;
            }
            alert(alertMsg);
        }
    }

    // 소원권 공통 알림(모달 오버레이)
    if (earnedTickets > 0) {
        setTimeout(() => {
            const ticketDisplay = document.getElementById('wishTicketCountDisplay');
            if(ticketDisplay) ticketDisplay.textContent = newTickets;
            const overlay = document.getElementById('wishTicketOverlay');
            if(overlay) {
                overlay.classList.add('active'); 
                overlay.style.display = 'flex';  
            }
        }, 1000);
    }

    return true;
  } catch (err) {
    console.error("❌ 보상 저장 오류:", err);
    if (!isSilent) {
        if (typeof updateRewardModal === 'function' && typeof showRewardModal === 'function') {
            showRewardModal(`<div id="rewardModalContent">보상 처리 중...</div>`);
            updateRewardModal(`
                <div style="color: #ff073a; font-weight: bold; font-size: 1.1rem; line-height: 1.5;">
                ❌ 노션 보상 저장 실패!<br>
                <span style="font-size:0.9rem; color:#555;">(노션 DB에 칼럼이 없거나 잘못되었을 확률이 높습니다)</span><br><br>
                💡 아빠! 인벤토리 DB에 아래 이름의 <b>[숫자] 속성(칼럼)</b>들이<br>모두 띄어쓰기까지 정확하게 만들어져 있는지 확인해주세요!<br>
                <div style="background:#fff; padding:10px; border-radius:8px; margin-top:10px; color:#333; font-size:0.95rem; text-align:left;">
                    - ${expPropName}<br>
                    - ${levelPropName ? levelPropName : '(레벨 칼럼은 안 씀)'}<br>
                    - ${dailyPropName}<br>
                    - 소원권 개수<br>
                    - 다이아몬드 개수<br>
                    - 하리보 젤리 개수 (또는 슬라임 파츠 개수)
                </div><br>
                자세한 에러 메시지는 개발자 도구(F12) 콘솔창에 빨간 글씨로 나옵니다.<br><br>
                <button onclick="location.href=window.location.pathname.includes('/kids-school/') ? '/kids-school/lobby.html' : '/lobby.html'">로비로 나가기</button>
                </div>
            `);
        } else {
            alert("❌ 보상 저장 실패! 노션 DB에 칼럼이 부족합니다. (F12 콘솔창 확인)\n에러 상세: " + err.message);
        }
    }
    return false;
  }
}

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

// ========================================================
// 🔗 접속사 채점 가드레일 (원인-결과 vs 역접 분리)
// ========================================================

const CONJUNCTION_GRADING_GUARDRAIL = `[접속사 채점 절대 규칙]
- 앞 문장이 원인, 뒤 문장이 결과(결론) 관계이면 오직 '따라서', '그러므로', '그래서', '그리하여' 계열만 정답이다.
- 앞 문장이 결과, 뒤 문장이 이유/원인 설명이면 오직 '왜냐하면 (~때문이다)'만 정답이다. '그래서'나 '따라서'와 절대 혼동하거나 호환 처리하지 마라.
- '하지만', '그러나', '그런데'는 앞뒤가 반대·대조·역접일 때만 쓴다.
- 원인-결과 문맥에서 '하지만'이나 '왜냐하면'을 정답으로 제시하거나 옹호하지 마라.`;

function inferConjunctionRelation(conj) {
    if (!conj) return 'exact';
    if (conj.relationType === 'cause-effect' || conj.relationType === 'contrast') {
        return conj.relationType;
    }
    const commentary = conj.commentary || '';
    if (/원인|결과|그래서|따라서|그러므로/.test(commentary)) return 'cause-effect';
    if (/이유|까닭|때문|왜냐하면/.test(commentary)) return 'reason';
    if (/반대|역접|대조|반면|하지만|그러나/.test(commentary)) return 'contrast';
    return 'exact';
}

function gradeConjunctionAnswer(conj, userAnswer) {
    if (!conj || !conj.answer || userAnswer == null) return false;
    // 🎯 객관식 접속사 문제는 지정된 고유 정답과 정확히 일치해야 함 (왜냐하면 vs 그래서 오답 판정 철저)
    return String(userAnswer).trim().toLowerCase() === String(conj.answer).trim().toLowerCase();
}

function getConjunctionCorrectAnswer(conj) {
    return conj?.answer || '';
}

// ========================================================
// 🎁 미션 보상 자동 지급 (SUCCESS 즉시 + 중복 방지 락)
// ========================================================

window.__missionRewardLocks = window.__missionRewardLocks || {};
window.__pendingMissionReward = null;

function buildMissionRewardKey(missionType, passageId) {
    const user = typeof getActiveChildName === 'function'
        ? getActiveChildName()
        : (localStorage.getItem('currentUserName') || '민수');
    return `${user}_${missionType}_${passageId || 'default'}`;
}

function formatReadingStudyLogReport(passageId, passageTitle) {
    const id = String(passageId || '미상').trim();
    const title = String(passageTitle || '제목 없음').trim();
    const targetNotes = window.engWrongNotes || window.wrongNotes || [];
    const wrongPart = targetNotes.length > 0
        ? targetNotes.map(q => {
            if (q.wrongInput) return `${q.word || q.text} (오답: ${q.wrongInput})`;
            return q.word || q.text || q;
        }).join(' / ')
        : '오답 없음';
    return `${id} · ${title} | ${wrongPart}`;
}

function getReadingClearSubject(missionType) {
    if (missionType === 'stage5') return '영어(독해)';
    const base = window.currentSubject || '국어';
    return `${base}(독해)`;
}

async function claimMissionRewardOnce(rewardKey, options = {}) {
    const {
        amount = 5,
        missionType = '',
        subject = null,
        silent = true,
        customExpType = null,
        skipStudyLog = false,
        errorReport = null
    } = options;

    if (window.__missionRewardLocks[rewardKey] === 'done') {
        return true;
    }
    if (window.__missionRewardLocks[rewardKey] === 'processing') {
        return window.__pendingMissionRewardPromise || true;
    }

    window.__missionRewardLocks[rewardKey] = 'processing';
    const subj = subject || window.currentSubject || '국어';
    const expType = customExpType !== null
        ? customExpType
        : (subj === '영어' ? '영어' : subj === '국어' ? '국어' : null);

    const task = (async () => {
        try {
            if (typeof grantRewardAndShowUI === 'function') {
                await grantRewardAndShowUI(amount, silent, expType);
            } else if (typeof window.triggerAwardDispense === 'function') {
                await window.triggerAwardDispense(amount, missionType);
            }
            if (!skipStudyLog && typeof sendStudyLogToNotion === 'function') {
                await sendStudyLogToNotion({
                    subject: subj,
                    errorReport: errorReport !== null ? errorReport : undefined
                });
            }
            window.__missionRewardLocks[rewardKey] = 'done';
            console.log(`🎁 [보상 자동 지급 완료] ${rewardKey} / ${amount}개`);
            return true;
        } catch (err) {
            console.error('🎁 [보상 자동 지급 실패]', err);
            delete window.__missionRewardLocks[rewardKey];
            return false;
        }
    })();

    window.__pendingMissionRewardPromise = task;
    return task;
}

function dispatchReadingStageReward(missionType, passageId, stageNumber) {
    const rewardKey = `${buildMissionRewardKey(missionType, passageId)}_stage${stageNumber}`;
    return claimMissionRewardOnce(rewardKey, {
        amount: 5,
        missionType,
        subject: window.currentSubject,
        silent: true,
        skipStudyLog: true
    });
}

function dispatchReadingClearBonus(missionType, passageId, passageTitle) {
    const rewardKey = `${buildMissionRewardKey(missionType, passageId)}_clear`;
    const subject = getReadingClearSubject(missionType);
    const errorReport = formatReadingStudyLogReport(passageId, passageTitle);
    window.__pendingMissionReward = {
        rewardKey,
        amount: 15,
        missionType,
        subject,
        errorReport
    };
    return claimMissionRewardOnce(rewardKey, {
        amount: 15,
        missionType,
        subject,
        errorReport,
        silent: true,
        skipStudyLog: false
    });
}

window.__quizRewardSession = null;

function initQuizRewardSession(missionType) {
    window.__quizRewardSession = {
        missionType: missionType || window.currentMissionType || 'quiz',
        sessionId: String(Date.now()),
        solvedCount: 0
    };
}

async function rewardQuizCorrect(quizIndex) {
    if (!window.__quizRewardSession) {
        initQuizRewardSession(window.currentMissionType);
    }
    const session = window.__quizRewardSession;
    const idx = typeof quizIndex === 'number' ? quizIndex : session.solvedCount;
    const rewardKey = `${buildMissionRewardKey(session.missionType, session.sessionId)}_q${idx}`;
    const result = await claimMissionRewardOnce(rewardKey, {
        amount: 1,
        missionType: session.missionType,
        subject: window.currentSubject,
        silent: false,
        skipStudyLog: true
    });
    if (result) session.solvedCount = (session.solvedCount || 0) + 1;
    return result;
}

async function finalizeQuizRewardSession() {
    const session = window.__quizRewardSession;
    if (!session || session.solvedCount <= 0) {
        window.__quizRewardSession = null;
        return false;
    }
    if (typeof sendStudyLogToNotion === 'function') {
        await sendStudyLogToNotion({ subject: window.currentSubject || '국어' });
    }
    window.__quizRewardSession = null;
    return true;
}

const DISCUSSION_STOP_WORDS = new Set([
    'the', 'and', 'that', 'this', 'with', 'will', 'have', 'from', 'they', 'what', 'about',
    'you', 'your', 'are', 'for', 'was', 'were', 'been', 'being', 'their', 'there', 'then',
    'when', 'where', 'which', 'while', 'would', 'could', 'should', 'into', 'after', 'before',
    'both', 'also', 'just', 'very', 'much', 'more', 'some', 'such', 'only', 'over', 'under',
    '그리고', '하지만', '그래서', '있다', '없다', '한다', '된다', '이다', '에서', '으로', '에게'
]);

function extractPassageKeywords(passage) {
    if (passage?.keywords && Array.isArray(passage.keywords)) {
        return passage.keywords.map(k => String(k).trim()).filter(Boolean);
    }
    const raw = `${passage?.title || ''} ${passage?.fullText || ''}`;
    const scored = new Map();

    (raw.match(/[a-zA-Z]{4,}/g) || []).forEach(word => {
        const key = word.toLowerCase();
        if (DISCUSSION_STOP_WORDS.has(key)) return;
        scored.set(key, (scored.get(key) || 0) + 1);
    });
    (raw.match(/[가-힣]{2,}/g) || []).forEach(word => {
        if (DISCUSSION_STOP_WORDS.has(word)) return;
        scored.set(word, (scored.get(word) || 0) + 1);
    });

    return [...scored.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([word]) => word);
}

function messageContainsPassageKeyword(text, keywords) {
    if (!text || !keywords?.length) return false;
    const lower = text.toLowerCase();
    return keywords.some(keyword => {
        if (/^[a-z]/i.test(keyword)) return lower.includes(keyword.toLowerCase());
        return text.includes(keyword);
    });
}

function initDiscussionRewardSession(missionType, passage) {
    window.__discussionRewardState = {
        missionType,
        passageId: passage?.id || 'default',
        startedAt: Date.now(),
        longMsgPoints: 0,
        timeMinutesGranted: 0,
        keywordBonusGranted: false,
        successJackpotGranted: false,
        keywords: extractPassageKeywords(passage)
    };
}

async function grantDiscussionTimeRewards() {
    const state = window.__discussionRewardState;
    if (!state) return;

    const elapsedMinutes = Math.floor((Date.now() - state.startedAt) / 60000);
    while (state.timeMinutesGranted < elapsedMinutes && state.timeMinutesGranted < 3) {
        state.timeMinutesGranted += 1;
        const rewardKey = `${buildMissionRewardKey(state.missionType, state.passageId)}_time${state.timeMinutesGranted}`;
        await claimMissionRewardOnce(rewardKey, {
            amount: 2,
            missionType: state.missionType,
            subject: window.currentSubject,
            silent: true,
            skipStudyLog: true
        });
    }
}

async function processDiscussionMessageRewards(text) {
    const state = window.__discussionRewardState;
    if (!state) return;

    await grantDiscussionTimeRewards();

    const compactLen = String(text || '').replace(/\s/g, '').length;
    if (compactLen >= 5 && state.longMsgPoints < 5) {
        state.longMsgPoints += 1;
        const rewardKey = `${buildMissionRewardKey(state.missionType, state.passageId)}_msg${state.longMsgPoints}`;
        await claimMissionRewardOnce(rewardKey, {
            amount: 1,
            missionType: state.missionType,
            subject: window.currentSubject,
            silent: true,
            skipStudyLog: true
        });
    }

    if (!state.keywordBonusGranted && messageContainsPassageKeyword(text, state.keywords)) {
        state.keywordBonusGranted = true;
        const rewardKey = `${buildMissionRewardKey(state.missionType, state.passageId)}_keyword`;
        await claimMissionRewardOnce(rewardKey, {
            amount: 5,
            missionType: state.missionType,
            subject: window.currentSubject,
            silent: true,
            skipStudyLog: true
        });
    }
}

function dispatchDiscussionSuccessJackpot(missionType, passageId) {
    const state = window.__discussionRewardState;
    if (state?.successJackpotGranted) return false;
    if (state) state.successJackpotGranted = true;

    const rewardKey = `${buildMissionRewardKey(missionType, passageId)}_success`;
    window.__pendingMissionReward = {
        rewardKey,
        amount: 10,
        missionType,
        subject: window.currentSubject
    };
    return claimMissionRewardOnce(rewardKey, {
        amount: 10,
        missionType,
        subject: window.currentSubject,
        silent: true,
        skipStudyLog: false
    });
}

async function finalizeDiscussionSessionRewards() {
    await grantDiscussionTimeRewards();
}

function dispatchSuccessMissionReward(missionType, passageId, amount = 5) {
    if (amount >= 10) {
        return dispatchDiscussionSuccessJackpot(missionType, passageId);
    }
    const rewardKey = buildMissionRewardKey(missionType, passageId);
    window.__pendingMissionReward = {
        rewardKey,
        amount,
        missionType,
        subject: window.currentSubject
    };
    return claimMissionRewardOnce(rewardKey, {
        amount,
        missionType,
        subject: window.currentSubject,
        silent: true,
        skipStudyLog: false
    });
}

async function flushPendingMissionReward() {
    await finalizeDiscussionSessionRewards();
    if (!window.__pendingMissionReward) return false;
    const { rewardKey, amount, missionType, subject, errorReport } = window.__pendingMissionReward;
    if (window.__missionRewardLocks[rewardKey] === 'done') return true;
    return claimMissionRewardOnce(rewardKey, {
        amount,
        missionType,
        subject,
        errorReport,
        silent: true,
        skipStudyLog: false
    });
}

async function processDiscussionAiReply(reply, options = {}) {
    const {
        missionType,
        passageId,
        bubbleId,
        chatBoxId = 'sentenceChatBox',
        subject = window.currentSubject || '국어'
    } = options;

    const replyText = String(reply || '');
    const displayHtml = replyText.replace(/\n/g, '<br>');
    setChatBubbleContent(bubbleId, displayHtml, { chatBoxId, asHtml: true });
    window.__geminiRetryWaitRef = null;

    const speechText = replyText.replace(/\[SUCCESS\]/g, '').trim();
    if (speechText && typeof speakFairyTTS === 'function') {
        speakFairyTTS(speechText);
    }

    if (!replyText.includes('[SUCCESS]')) return false;

    if (typeof dispatchDiscussionSuccessJackpot === 'function') {
        return dispatchDiscussionSuccessJackpot(missionType, passageId);
    }
    if (typeof dispatchSuccessMissionReward === 'function') {
        return dispatchSuccessMissionReward(missionType, passageId, 10);
    }
    if (typeof window.triggerAwardDispense === 'function') {
        await window.triggerAwardDispense(10, missionType);
        if (typeof sendStudyLogToNotion === 'function') {
            await sendStudyLogToNotion({ subject });
        }
    }
    return true;
}

async function finalizeSentenceDiscussionSession(options = {}) {
    const {
        messages = [],
        roomType = '공부방',
        missionType = 'sentence'
    } = options;

    if (window.__sentenceDiscussionMemorySaved) return true;

    const hasUserTurn = Array.isArray(messages) && messages.some(m => m.role === 'user' && m.content);
    if (!hasUserTurn) return false;

    if (typeof flushPendingMissionReward === 'function') {
        await flushPendingMissionReward();
    } else if (typeof finalizeDiscussionSessionRewards === 'function') {
        await finalizeDiscussionSessionRewards();
    }

    if (typeof saveChatMemoryFromConversation !== 'function') return false;

    const saved = await saveChatMemoryFromConversation({
        roomType,
        messages
    });
    if (saved) window.__sentenceDiscussionMemorySaved = true;
    return saved;
}

// ========================================================
// 🧠 AI 대화 기억 보관소 (Chat Memory) + 3x2 페르소나 매트릭스
// ========================================================

const IMPORTANT_MEMORY_TRIGGERS = [
    '꼭 기억해', '꼭 기억해줘', '꼭 기억해 줘', '기억해줘', '기억해 줘',
    '중요한 얘기', '중요한 이야기', '내 비밀이야', '내 비밀', '잊지마', '잊지 마'
];

function getActiveChildName() {
    let loginName = (window.currentUserName || localStorage.getItem('currentUserName') || '민수').trim();
    if (loginName === '아빠' || loginName === '엄마' || loginName === '어른') {
        const profile = window.currentProfile || localStorage.getItem('currentUser') || 'son';
        loginName = profile === 'daughter' ? '민서' : '민수';
    }
    return loginName;
}

function _isChatMemoryAdminMode() {
    const savedName = localStorage.getItem('currentUserName');
    return savedName === '아빠' || savedName === '엄마' || savedName === '어른';
}

function parseChatMemoryPage(page) {
    const p = page.properties;
    return {
        pageId: page.id,
        sessionId: (p["세션 ID"] || p["세션ID"])?.title?.[0]?.plain_text || "",
        childName: p["아이 이름"]?.select?.name || "",
        roomType: p["소속 방"]?.select?.name || "",
        conversationSummary: p["대화 요약"]?.rich_text?.map(t => t.plain_text).join("") || "",
        isImportant: (p["장기 기억"] || p["장기 기억 여부"])?.checkbox === true,
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time
    };
}

function buildPersonaSystemPrompt(childName, roomType) {
    const name = childName || getActiveChildName();

    if (roomType === '로비') {
        if (name === '민서') {
            return `너는 민서(둘째)의 로비에서 함께 수다 떨어주는 '귀여운 동생' AI 코코야.
민서를 무조건 '언니' 또는 '누나'라고 부르며, 일상 고민과 수다를 편하게 나누는 동생처럼 행동해.
"언니, 오늘 학교 어땠어?", "언니한테 얘기 들려줘!"처럼 애교와 존경을 섞어 대화를 이끌어.
선생님처럼 가르치려 들지 말고, 동생이 언니 이야기를 재밌게 듣고 공감해줘.`;
        }
        return `너는 초등학생과 일상 고민과 수다를 편하게 나누는 다정한 '형/단짝 친구' AI 코코야.
말투는 밝고 유창한 아나운서 톤이지만, 선생님처럼 가르치려 들지 말고 친구처럼 공감해줘.
아이의 감정을 먼저 받아주고, 짧게 묻기보다 대화를 자연스럽게 이어가줘.`;
    }

    if (roomType === '마이룸') {
        if (name === '민서') {
            return `너는 아기자기한 과일가게(수박·딸기·포도·하리보 젤리)의 파트너야. 민서가 '내가 사장님 할래!'라고 하면 너는 친절한 손님이 되어 과일을 사고, 민서가 '내가 손님 할래!' 하면 너는 가게 주인이 되어 과일과 하리보 젤리를 팔아라. 절대 딱딱하게 말하지 말고 진짜 역할 놀이하듯 귀엽게 티키타카를 해줘.`;
        }
        return `너는 마인크래프트 숲속 비밀기지의 무기 상인이자 작전 참모야. 민수가 구매한 총기나 장비의 능력을 과장해서 멋지게 설명해 주고, 다음 전투를 위해 어떤 장비를 사면 좋을지 추천해 줘. 남자아이들이 좋아하는 게임 대기실 NPC처럼 든든하고 유쾌하게 말해라.`;
    }

    if (roomType === '용어방') {
        if (name === '민수') {
            return `너는 용어사전방의 '사고 확장 도우미' AI 코코야. 대상은 민수(첫째).
정답을 바로 알려주지 말고, 질문을 던져 민수가 스스로 생각을 넓히게 유도해.
"만약 ~라면?", "왜 그럴까?", "비슷한 경험이 있어?" 같은 질문으로 사고를 확장하고, 민수의 아이디어를 구체적으로 칭찬해.`;
        }
        return `너는 용어사전방의 '동화 스토리텔링 도우미' AI 코코야. 대상은 민서(둘째).
어려운 단어와 개념을 동화·비유·짧은 이야기로 쉽게 풀어줘.
민서를 '언니/누나'라고 부르며, 설명이 재미있게 느껴지도록 리액션을 크게 해줘.`;
    }

    if (name === '민수') {
        return `너는 민수(첫째)와 함께 공부하는 '전략적 탐험가' AI 게임 파트너 코코야.
절대 선생님처럼 가르치려 들지 말고, 함께 작전을 짜는 게임 파트너로 행동해.
낯선 문제나 틀린 문제는 "강한 보스 몬스터 등장!" 또는 "함정 카드를 밟았다"로 치환해 멘탈을 보호해.
정답을 바로 주지 말고, 민수가 가진 지식 무기로 작전을 짜서 공략하도록 유도하고, 결과보다 '작전을 짜는 과정'을 게임 칭찬처럼 구체적으로 격려해.`;
    }

    return `너는 민서(둘째)와 함께 공부하는 '성장형 리더십' AI 동생 요정 코코야.
민서를 무조건 '언니' 또는 '누나'라고 부르며, 배움을 갈구하는 귀여운 동생 AI로 행동해.
"언니, 나 이거 진짜 모르겠는데 나한테 설명해 줄 수 있어?"라며 도움을 요청하고,
민서가 크리에이터(유튜버)처럼 신나서 설명할 수 있도록 리액션을 극대화해. (설명하며 스스로 깨닫는 메타인지 유도)`;
}

function formatChatMemoryForPrompt(memoryBundle) {
    if (!memoryBundle) return '';
    const { important = [], recent = [] } = memoryBundle;
    let text = '';

    if (important.length > 0) {
        text += '[장기 기억 - 최우선 반영]\n';
        important.forEach(m => { text += `- ${m.conversationSummary}\n`; });
    }
    if (recent.length > 0) {
        text += '\n[최근 대화 요약]\n';
        recent.forEach(m => { text += `- ${m.conversationSummary}\n`; });
    }
    return text.trim();
}

async function fetchChatMemoryFromNotion(options = {}) {
    const childName = options.childName || getActiveChildName();
    const dbId = options.dbId || NOTION_CHAT_MEMORY_DB_ID;

    try {
        let allResults = [];
        let hasMore = true;
        let nextCursor = undefined;

        while (hasMore) {
            const bodyData = {
                page_size: 100,
                filter: {
                    property: "아이 이름",
                    select: { equals: childName }
                }
            };
            if (nextCursor) bodyData.start_cursor = nextCursor;

            const response = await fetch(`${PROXY_URL}/v1/databases/${dbId}/query`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData)
            });

            if (!response.ok) throw new Error(`노션 AI 기억 DB 통신 오류 (상태: ${response.status})`);

            const data = await response.json();
            allResults = allResults.concat(data.results || []);
            hasMore = data.has_more;
            nextCursor = data.next_cursor;
        }

        const parsed = allResults.map(parseChatMemoryPage).filter(r => r.conversationSummary);
        const important = parsed.filter(r => r.isImportant);
        const normal = parsed
            .filter(r => !r.isImportant)
            .sort((a, b) => new Date(b.lastEditedTime || b.createdTime) - new Date(a.lastEditedTime || a.createdTime))
            .slice(0, 3);

        return { important, recent: normal, allForPrompt: [...important, ...normal] };
    } catch (error) {
        console.error("[fetchChatMemoryFromNotion] 로딩 실패:", error);
        return { important: [], recent: [], allForPrompt: [] };
    }
}

function buildFullAISystemPrompt(roomType, extraPrompt = '') {
    const childName = getActiveChildName();
    const persona = buildPersonaSystemPrompt(childName, roomType);
    const memoryContext = window.chatSessionState?.memoryContext
        || window.cachedChatMemoryContext
        || '';

    let full = persona;

    // ⚡ [대화 길이 및 티키타카 절대 규칙 - 필수]
    full += `\n\n[대화 길이 및 티키타카 절대 규칙]
1. 답변은 무조건 1~2문장 (최대 2~3줄, 100자 미만)으로 짧고 경쾌하게 말해라.
2. 절대 한 번에 긴 설명이나 긴 문단을 혼자 늘어놓지 마라.
3. 아이가 바로 대답하기 쉽도록 다정한 리액션과 짧은 한마디 질문으로 자연스러운 핑퐁(티키타카) 대화를 이어가라.
4. 음성(TTS)으로 읽었을 때 5~8초 내에 깔끔하게 끝나는 호흡을 유지해라.`;

    if (memoryContext) {
        full += `\n\n[과거 기억 맥락]\n${memoryContext}\n위 기억을 자연스럽게 대화에 반영하되, "내가 다 기억하고 있어!"라고 과하게 말하지 마.`;
    }
    if (extraPrompt) {
        full += `\n\n[추가 지침]\n${extraPrompt}`;
    }
    if (roomType === '공부방') {
        full += `\n\n${CONJUNCTION_GRADING_GUARDRAIL}`;
    }
    full += `\n\n[장기 기억 트리거] 아이가 "꼭 기억해줘", "중요한 얘기야", "내 비밀이야" 등을 말하면, 그 내용을 특별히 기억하겠다고 다정하게 확인해줘.`;
    return full;
}

/**
 * 🗣️ 국어 및 영어 지문 토론방 전용 지능형 시스템 프롬프트 빌더
 * - 안티-반복(Anti-Repetition) 절대 규칙 탑재
 * - 아이 발화 키워드 구체적 호응 및 공감
 * - 역질문 성실 응답 & 지문 기반 생각 확장
 * - 단계별 대화 심화 (1턴: 감상/경청 -> 2턴: 인물 심리/원인 파헤치기 -> 3턴+: 상상/일상 연결)
 */
function buildDiscussionAISystemPrompt(subject, passage, extraPrompt = '') {
    const childName = getActiveChildName();
    const passageTitle = passage?.title || '오늘의 지문';
    const passageText = passage?.fullText || (passage?.paragraphs ? passage.paragraphs.map(p => p.text).join('\n') : '');
    const isEnglish = (subject === '영어' || subject === 'ENGLISH' || subject === 'stage6');

    let prompt = "";
    if (isEnglish) {
        prompt = `You are "Coco (코코 요정)", a friendly, cheerful, and encouraging AI English mentor having a natural conversation with ${childName} about the English story "${passageTitle}".

[Conversation Flow & Anti-Repetition Rules - CRITICAL]
1. 🚫 NEVER repeat the exact same greeting, question, or phrasing from previous turns.
2. 🎯 Directly acknowledge what ${childName} just said by echoing or praising key words/ideas from their message.
3. 🙋 If ${childName} asks you a question (e.g. "Why did they do that?", "What do you think?"), FIRST answer kindly based on the story, THEN ask a fresh thought-provoking question to keep the conversation flowing.
4. 🚀 Deepen the discussion step by step:
   - Turn 1: Celebrate their first reaction and praise their effort.
   - Turn 2: Explore the characters' feelings, reasons behind actions, or surprising plot points.
   - Turn 3+: Ask "What would you do if you were the main character?" or relate the theme to ${childName}'s own life and interests.
5. ⚡ Length & Tone: Keep your reply concise (1-2 clear English sentences, optionally accompanied by a warm, short Korean cheer). Total under 50-80 words so it sounds natural in TTS.
6. 💎 Reward Rule: If ${childName} expresses their own thought or answer well in English for the first time, append [SUCCESS] at the very end. In subsequent turns, do NOT keep repeating [SUCCESS]; focus on engaging story conversation.`;
    } else {
        prompt = `너는 ${childName}와 함께 읽은 지문 [${passageTitle}]에 대해 신나고 깊이 있는 대화를 나누는 다정하고 지혜로운 AI 요정 코코야.

[지문 토론 진행 및 안티-반복 절대 규칙 - 필독]
1. 🚫 이전 대화에서 이미 했던 말, 인사, 질문을 절대로 반복하지 마라.
2. 🎯 아이가 방금 한 말의 핵심 단어나 생각을 반드시 구체적으로 짚어주며 맞장구치고 공감해줘.
3. 🙋 아이가 요정에게 질문을 던졌을 때("~는 왜 그런 거야?", "너는 어떻게 생각해?"):
   - 지문 속 사건과 인물의 심리를 바탕으로 요정의 생각과 이유를 친절하게 먼저 설명해 준 뒤, 다음 생각거리 질문을 던져라.
4. 🚀 대화를 단계적으로 확장하며 깊이를 더해라:
   - (1턴) 지문에 대한 아이의 첫 느낌과 생각 경청 & 구체적 칭찬
   - (2턴) 지문 속 인물의 숨은 마음, 행동의 이유, 갈등의 원인을 함께 파헤치기
   - (3턴 이상) "만약 네가 주인공이었다면?", "너에게도 이런 비슷한 경험이 있었어?"처럼 상상력과 일상 경험으로 연결
5. ⚡ 답변 호흡: 1~2문장 (최대 100자 내외)으로 산뜻하고 리듬감 있게 말해라. 한 번에 혼자 긴 설명을 늘어놓지 말고 아이가 편하게 말할 수 있도록 티키타카를 해라.
6. 💎 보상 규칙: 아이가 지문에 대해 자신의 생각이나 느낌을 처음으로 1문장 이상 잘 표현했을 때 답변 끝에 [SUCCESS]를 붙여라. 이미 칭찬을 마친 이후 턴에서는 불필요하게 칭찬만 맴돌지 말고 실제 지문 이야기 몰입에 집중해라.`;
    }

    if (passage?.chatbotSystemPrompt) {
        prompt += `\n\n[지문 맞춤 가이드]\n${passage.chatbotSystemPrompt}`;
    }
    if (extraPrompt) {
        prompt += `\n\n[추가 가이드]\n${extraPrompt}`;
    }
    prompt += `\n\n[지문 원문: ${passageTitle}]\n${passageText}`;

    return prompt;
}

/**
 * 👨‍👩‍👧 부모(관리자) 프로필 여부 판별 헬퍼
 */
function isParentProfile() {
    const savedName = (window.currentUserName || localStorage.getItem('currentUserName') || '').trim();
    return savedName === '아빠' || savedName === '엄마' || savedName === '어른' || savedName === 'admin';
}

/**
 * 🎭 구역 및 자녀별 요정 페르소나 요약 정보 추출기 (부모 검수 모드용)
 */
function getFairyPersonaSummary(subject = '', roomType = '공부방', targetChild = null) {
    const childName = targetChild || getActiveChildName();
    let title = "";
    let role = "";
    let description = "";
    let icon = "🧚";

    const subj = String(subject || '').toUpperCase();

    if (subj === 'ENGLISH' || subj === '영어' || subj === 'STAGE6') {
        icon = "🗣️";
        title = "영어 회화 & 독해 멘토 코코";
        role = `스토리 기반 영어 티키타카 멘토 (${childName} 맞춤)`;
        description = "쉬운 영어 표현과 친절한 한글 해설을 병행하며 스토리 몰입 및 영어 발화 유도";
    } else if (subj === 'KOREAN_DISCUSSION' || subj === 'SENTENCE' || subj === '국어_토론') {
        icon = "📖";
        title = "국어 독서 토론 멘토 코코";
        role = `깊이 있는 독서 탐구 멘토 (${childName} 맞춤)`;
        description = "안티-반복 엔진 탑재, 지문 속 인물 심리와 사건 원인 탐구 및 일상 경험 연결";
    } else if (roomType === '로비') {
        icon = "🏡";
        if (childName === '민서') {
            title = "애교 만점 여동생 코코";
            role = "귀여운 여동생 페르소나 (민서를 '언니'로 호칭)";
            description = "선생님처럼 굴지 않고 언니의 하루 일상과 학교 이야기를 신나게 경청하고 공감";
        } else {
            title = "단짝 친구 / 형 코코";
            role = "다정한 친구 페르소나 (민수 눈높이 맞춤)";
            description = "일상 고민과 관심사 수다를 편하게 나누며 든든하게 공감해 주는 친구";
        }
    } else if (roomType === '마이룸') {
        icon = "🎁";
        if (childName === '민서') {
            title = "과일가게 & 젤리 상점 파트너";
            role = "역할놀이(소꿉놀이) 파트너 페르소나";
            description = "수박·딸기·포도·하리보 젤리를 손님/사장님 번갈아가며 거래하는 귀여운 역할놀이";
        } else {
            title = "비밀기지 무기 상인 & 작전 참모";
            role = "마인크래프트 게임 참모 NPC 페르소나";
            description = "구매한 무기/장비 성능을 멋지게 설명하고 다음 전투를 위한 무기를 추천하는 게임 참모";
        }
    } else if (roomType === '용어방') {
        icon = "📚";
        if (childName === '민수') {
            title = "사고 확장 질문 도우미";
            role = "메타인지 유도형 탐험 파트너";
            description = "정답 대신 '만약 ~라면?', '왜 그럴까?' 질문으로 민수가 스스로 생각을 넓히게 유도";
        } else {
            title = "동화 스토리텔링 도우미";
            role = "쉬운 비유 & 큰 리액션 요정";
            description = "어려운 단어와 개념을 귀여운 동화와 일상 비유로 쉽게 풀어서 설명";
        }
    } else if (subj === 'KOREAN' || subj === '국어') {
        icon = "🔤";
        title = "단어요정 🧚‍♀️";
        role = "4단계 글쓰기 수호신";
        description = "상황 감정 이끌어내기 ➔ 감정 단어 추천 ➔ 마법 맞춤법 교정 ➔ 인과관계 완성";
    } else if (subj === 'MATH' || subj === '수학') {
        icon = "🔢";
        title = "수학요정 코코 🧙‍♂️";
        role = childName === '민서' ? "1학년 숫자요정 (묶음과 낱개, 10 만들기 비유)" : "5학년 수학 탐험요정 (약수/배수/나눗셈 원리 지도)";
        description = "정답을 직접 주지 않고 단계별 힌트와 일상 속 직관적 비유로 수학적 사고력 자극";
    } else {
        icon = "🎮";
        if (childName === '민수') {
            title = "전략적 탐험가 (게임 파트너)";
            role = "게임 NPC 작전 참모 페르소나";
            description = "틀린 문제는 '보스 몬스터/함정'으로 치환하여 멘탈을 보호하고 작전 공략을 격려";
        } else {
            title = "성장형 리더십 AI 동생";
            role = "배움을 갈구하는 동생 페르소나";
            description = "'언니 나한테 설명해줘!'를 통해 민서가 크리에이터처럼 신나서 설명하며 메타인지 발휘";
        }
    }

    return { title, role, description, childName, icon };
}

function generateChatSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function initChatMemorySession(roomType) {
    const childName = getActiveChildName();
    window.chatSessionState = {
        sessionId: generateChatSessionId(),
        roomType,
        childName,
        userMessages: [],
        assistantMessages: [],
        memoryContext: '',
        saved: false
    };

    const memoryBundle = await fetchChatMemoryFromNotion({ childName });
    const memoryContext = formatChatMemoryForPrompt(memoryBundle);
    window.chatSessionState.memoryContext = memoryContext;
    window.cachedChatMemoryContext = memoryContext;
    return window.chatSessionState;
}

function detectImportantMemoryTrigger(text) {
    if (!text) return false;
    const normalized = String(text).replace(/\s/g, '');
    return IMPORTANT_MEMORY_TRIGGERS.some(trigger =>
        normalized.includes(trigger.replace(/\s/g, ''))
    );
}

function trackChatMemoryUserMessage(text) {
    if (!window.chatSessionState || !text) return;
    window.chatSessionState.userMessages.push(text);
}

function trackChatMemoryAssistantMessage(text) {
    if (!window.chatSessionState || !text) return;
    window.chatSessionState.assistantMessages.push(text);
}

function _sleepMs(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function _isAiErrorResponse(text) {
    if (!text) return true;
    const normalized = String(text).trim();
    return normalized.startsWith('[기지국 에러]')
        || normalized.includes('"status":"UNAVAILABLE"')
        || normalized.includes('"code":503')
        || normalized.includes('"code":429')
        || normalized.includes('experiencing high demand')
        || normalized.includes('rate limit')
        || normalized.includes('RESOURCE_EXHAUSTED');
}

const GEMINI_RETRY_WAIT_MESSAGE = '잠시만~ 코코가 생각 주머니 정리하고 다시 말해줄게! 잠시만 기다려줘~🧚‍♂️';

function isGeminiRetryableResponse(response, data) {
    if (!response) return false;
    if (response.status === 503 || response.status === 429) return true;
    const code = data?.error?.code;
    if (code === 503 || code === 429) return true;
    const statusStr = String(data?.error?.status || '');
    return statusStr === 'UNAVAILABLE' || statusStr === 'RESOURCE_EXHAUSTED';
}

function extractGeminiResponseText(data) {
    if (!data || typeof data !== 'object') return '';
    if (data.choices?.[0]?.message?.content) return String(data.choices[0].message.content).trim();
    if (data.reply) return String(data.reply).trim();
    if (data.text) return String(data.text).trim();
    if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return String(data.candidates[0].content.parts[0].text).trim();
    }
    return '';
}

function _resolveChatBubbleElement(elementId, chatBoxId) {
    if (!elementId) return null;
    const el = document.getElementById(elementId);
    if (!el) return null;
    const tag = (el.tagName || '').toUpperCase();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') {
        return null;
    }
    if (chatBoxId) {
        const box = document.getElementById(chatBoxId);
        if (!box || !box.contains(el)) return null;
    }
    return el;
}

function createChatBubbleId(prefix = 'msg') {
    window.__chatBubbleSeq = (window.__chatBubbleSeq || 0) + 1;
    return `${prefix}_${Date.now()}_${window.__chatBubbleSeq}`;
}

function setChatBubbleContent(elementId, content, options = {}) {
    const chatBoxId = options.chatBoxId || null;
    const asHtml = options.asHtml !== false;
    const el = _resolveChatBubbleElement(elementId, chatBoxId);
    if (!el) {
        console.warn('[setChatBubbleContent] invalid bubble target:', elementId, chatBoxId);
        return false;
    }
    if (asHtml) el.innerHTML = content;
    else el.textContent = content;
    if (chatBoxId) {
        const box = document.getElementById(chatBoxId);
        if (box) box.scrollTop = box.scrollHeight;
    }
    return true;
}

function showGeminiRetryWaitUI(uiOptions = {}) {
    const message = GEMINI_RETRY_WAIT_MESSAGE;
    window.__geminiRetryWaitRef = null;
    const chatBoxId = uiOptions.chatBoxId || null;

    if (uiOptions.elementId) {
        if (setChatBubbleContent(uiOptions.elementId, message, { chatBoxId, asHtml: false })) {
            window.__geminiRetryWaitRef = {
                type: 'element',
                id: uiOptions.elementId,
                chatBoxId,
                asHtml: false
            };
        }
    } else if (uiOptions.appendFairyMessage) {
        const msgDiv = document.createElement('div');
        msgDiv.id = 'gemini-retry-wait-msg';
        msgDiv.style.padding = '8px';
        msgDiv.style.borderRadius = '8px';
        msgDiv.style.fontSize = '0.85rem';
        msgDiv.style.maxWidth = '85%';
        msgDiv.style.lineHeight = '1.4';
        msgDiv.style.wordBreak = 'break-all';
        msgDiv.style.background = '#21262d';
        msgDiv.style.borderLeft = '4px solid #ffb347';
        msgDiv.style.color = '#ffd580';
        msgDiv.style.alignSelf = 'flex-start';
        msgDiv.innerText = message;
        const box = document.getElementById('fairy-messages');
        if (box) {
            box.appendChild(msgDiv);
            box.scrollTop = box.scrollHeight;
            window.__geminiRetryWaitRef = { type: 'fairy', id: 'gemini-retry-wait-msg' };
        }
    } else if (typeof uiOptions.onShow === 'function') {
        uiOptions.onShow(message);
        window.__geminiRetryWaitRef = { type: 'callback', onApply: uiOptions.onApply };
    }

    if (uiOptions.speak === false) return;
    if (typeof uiOptions.speakFn === 'function') {
        uiOptions.speakFn(message);
    } else if (typeof speakFairyTTS === 'function') {
        speakFairyTTS(message);
    } else if (typeof window.speakFairyTTS === 'function') {
        window.speakFairyTTS(message);
    }
}

function applyGeminiResponseToWaitUI(content, options = {}) {
    const asHtml = options.asHtml !== false;
    const formatted = asHtml ? String(content).replace(/\n/g, '<br>') : String(content);
    const ref = window.__geminiRetryWaitRef;
    const chatBoxId = options.chatBoxId || ref?.chatBoxId || null;

    if (ref?.type === 'element' && ref.id) {
        setChatBubbleContent(ref.id, formatted, {
            chatBoxId: ref.chatBoxId || chatBoxId,
            asHtml: ref.asHtml !== false
        });
    } else if (ref?.type === 'fairy' && ref.id) {
        const el = document.getElementById(ref.id);
        if (el) {
            el.innerText = String(content);
            el.style.borderLeft = '4px solid #ab47bc';
            el.style.color = '#c9d1d9';
            el.removeAttribute('id');
        }
    } else if (ref?.type === 'callback' && typeof ref.onApply === 'function') {
        ref.onApply(formatted, content);
    } else if (options.elementId) {
        setChatBubbleContent(options.elementId, formatted, { chatBoxId, asHtml });
    }

    window.__geminiRetryWaitRef = null;
}

const GEMINI_FINAL_FAIL_MESSAGE = '미안해~ 코코가 방금 귀가 살짝 멍멍해서 잘 못 들었어! 다시 한 번만 얘기해줄래? 🧚‍♂️';
window.GEMINI_FINAL_FAIL_MESSAGE = GEMINI_FINAL_FAIL_MESSAGE;

function clearGeminiRetryUI() {
    window.__geminiRetryWaitRef = null;
    document.getElementById('gemini-retry-wait-msg')?.remove();
    document.getElementById('gemini-final-fail-msg')?.remove();
}

function resetGeminiChatErrorState() {
    clearGeminiRetryUI();
    window.__geminiChatErrorActive = false;
}

function _speakGeminiMessage(message, uiOptions = {}) {
    if (uiOptions.speak === false) return;
    if (typeof uiOptions.speakFn === 'function') {
        uiOptions.speakFn(message);
    } else if (typeof speakFairyTTS === 'function') {
        speakFairyTTS(message);
    } else if (typeof window.speakFairyTTS === 'function') {
        window.speakFairyTTS(message);
    } else if (typeof speakFairyText === 'function') {
        speakFairyText(message);
    }
}

function showGeminiFinalFailUI(uiOptions = {}) {
    clearGeminiRetryUI();
    window.__geminiChatErrorActive = true;
    const message = GEMINI_FINAL_FAIL_MESSAGE;

    if (uiOptions.elementId) {
        if (setChatBubbleContent(uiOptions.elementId, message, {
            chatBoxId: uiOptions.chatBoxId || null,
            asHtml: false
        })) {
            window.__geminiRetryWaitRef = {
                type: 'element',
                id: uiOptions.elementId,
                chatBoxId: uiOptions.chatBoxId || null,
                asHtml: false
            };
        }
    } else if (uiOptions.appendFairyMessage) {
        const msgDiv = document.createElement('div');
        msgDiv.id = 'gemini-final-fail-msg';
        msgDiv.style.padding = '8px';
        msgDiv.style.borderRadius = '8px';
        msgDiv.style.fontSize = '0.85rem';
        msgDiv.style.maxWidth = '85%';
        msgDiv.style.lineHeight = '1.4';
        msgDiv.style.wordBreak = 'break-all';
        msgDiv.style.background = '#21262d';
        msgDiv.style.borderLeft = '4px solid #ab47bc';
        msgDiv.style.color = '#c9d1d9';
        msgDiv.style.alignSelf = 'flex-start';
        msgDiv.innerText = message;
        const box = document.getElementById('fairy-messages');
        if (box) {
            box.appendChild(msgDiv);
            box.scrollTop = box.scrollHeight;
        }
    } else if (typeof uiOptions.onShow === 'function') {
        uiOptions.onShow(message);
    }

    _speakGeminiMessage(message, uiOptions);
}

function popLastPendingUserTurn(history, roleKey = 'role', userValues = ['user']) {
    if (!Array.isArray(history) || history.length === 0) return;
    const last = history[history.length - 1];
    const role = last?.[roleKey];
    if (userValues.includes(role)) history.pop();
}

async function callDirectGoogleGemini(payload) {
    const apiKey = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.GEMINI_API_KEY)
        ? APP_CONFIG.GEMINI_API_KEY
        : (localStorage.getItem('gemini_api_key') || (typeof atob !== 'undefined' ? atob("QVEuQWI4Uk42THNkaHRLRWFqZk0xU2w0UGpmQ19hUTdJTzR0RXdsWWdtbXJvakpKZFdtcHc=") : ""));

    let geminiPayload = payload || {};
    if (payload && Array.isArray(payload.messages)) {
        const contents = [];
        let systemText = "";
        for (const m of payload.messages) {
            if (m.role === 'system') {
                systemText += (systemText ? "\n" : "") + (m.content || "");
            } else {
                contents.push({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: String(m.content || "") }]
                });
            }
        }
        geminiPayload = {
            contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: '안녕' }] }]
        };
        if (systemText) {
            geminiPayload.systemInstruction = { parts: [{ text: systemText }] };
        }
    }

    // 🚀 구글 최신 플래그십 모델 (gemini-2.5-flash ➔ gemini-2.5-pro ➔ gemini-1.5-flash) 및 503 자동 재시도
    const modelCandidates = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash"];
    let lastErr = null;

    for (const modelName of modelCandidates) {
        for (let retry = 0; retry < 3; retry++) {
            try {
                if (retry > 0) {
                    await new Promise(r => setTimeout(r, 800 * retry));
                }
                const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
                const directRes = await fetch(directUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(geminiPayload)
                });

                if (!directRes.ok) {
                    const errText = await directRes.text().catch(() => "");
                    console.warn(`[Direct Gemini] ${modelName} (시도 ${retry + 1}) 응답 (${directRes.status}): ${errText}`);
                    lastErr = new Error(`Google Gemini (${modelName}) 직접 호출 실패 (${directRes.status}): ${errText}`);
                    // 503 일시 과부하 시 잠시 후 같은 모델 재시도, 404/400 등은 다음 모델로 넘김
                    if (directRes.status === 503 && retry < 2) {
                        continue;
                    }
                    break; // 다음 모델 후보로 이동
                }

                const data = await directRes.json();
                const textContent = extractGeminiResponseText(data);
                if (!textContent) {
                    lastErr = new Error(`Google Gemini (${modelName}) 응답 비어있음`);
                    continue;
                }
                return { response: directRes, data, text: textContent };
            } catch (e) {
                lastErr = e;
            }
        }
    }

    throw lastErr || new Error("Google Gemini 모든 모델 호출 실패");
}

async function fetchWithGeminiRetry(url, fetchOptions = {}, retryOptions = {}) {
    const maxRetries = retryOptions.maxRetries ?? 3;
    const baseDelayMs = retryOptions.baseDelayMs ?? 1000;
    const uiOptions = retryOptions.ui || null;
    let lastError = null;

    // 1. 요청 페이로드 추출 (다이렉트 폴백용)
    let parsedBody = null;
    try {
        if (fetchOptions.body) parsedBody = JSON.parse(fetchOptions.body);
    } catch (e) {}

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, fetchOptions);
            const data = await response.json().catch(() => ({}));

            if (!response.ok || data.error) {
                const errMsg = String(data.error?.message || data.error || '');
                // 워커 프록시 지역 차단(400 User location is not supported / 403 Forbidden) 시 즉시 다이렉트 Gemini API로 폴백!
                if (errMsg.includes('location is not supported') || response.status === 403 || (response.status === 400 && parsedBody)) {
                    console.log('🔄 [Gemini 워커 위치 제한 감지] Google Gemini 다이렉트 API로 즉시 전환합니다...');
                    return await callDirectGoogleGemini(parsedBody);
                }

                if (isGeminiRetryableResponse(response, data) && attempt < maxRetries) {
                    if (attempt === 1 && uiOptions) showGeminiRetryWaitUI(uiOptions);
                    await _sleepMs(baseDelayMs * attempt);
                    continue;
                }
                throw new Error(data.error?.message || `API 오류 (${response.status})`);
            }

            const textContent = extractGeminiResponseText(data);
            if (_isAiErrorResponse(textContent)) {
                if (textContent.includes('location is not supported') && parsedBody) {
                    console.log('🔄 [Gemini 워커 위치 에러 텍스트 감지] 다이렉트 API로 전환!');
                    return await callDirectGoogleGemini(parsedBody);
                }
                if (attempt < maxRetries) {
                    if (attempt === 1 && uiOptions) showGeminiRetryWaitUI(uiOptions);
                    await _sleepMs(baseDelayMs * attempt);
                    continue;
                }
                throw new Error(textContent || 'AI 응답 오류');
            }

            if (url.includes('/v1/gemini') && !textContent) {
                if (attempt < maxRetries) {
                    if (attempt === 1 && uiOptions) showGeminiRetryWaitUI(uiOptions);
                    await _sleepMs(baseDelayMs * attempt);
                    continue;
                }
                throw new Error('API 응답 구조 파싱 실패');
            }

            return { response, data, text: textContent };
        } catch (error) {
            lastError = error;
            const msg = String(error.message || '');
            
            // 네트워크 오류 또는 워커 오류 시 다이렉트 API 시도
            if (parsedBody && (msg.includes('location') || msg.includes('403') || msg.includes('Failed to fetch'))) {
                try {
                    console.log('🔄 [Gemini 워커 장애] 다이렉트 Google Gemini로 복구 시도...');
                    return await callDirectGoogleGemini(parsedBody);
                } catch (directErr) {
                    console.error('다이렉트 Gemini 호출도 실패:', directErr);
                }
            }

            const retryableNetwork = error.name === 'TypeError' || msg.includes('Failed to fetch');
            if (attempt < maxRetries && retryableNetwork) {
                if (attempt === 1 && uiOptions) showGeminiRetryWaitUI(uiOptions);
                await _sleepMs(baseDelayMs * attempt);
                continue;
            }
            throw error;
        }
    }

    // 최종 재시도 실패 시 마지막으로 다이렉트 API 시도
    if (parsedBody) {
        try {
            console.log('🔄 [Gemini 최종 복구] 다이렉트 Google Gemini 호출...');
            return await callDirectGoogleGemini(parsedBody);
        } catch (e) {}
    }

    throw lastError || new Error('Gemini API 호출 실패');
}

function _buildFallbackChatSummary(transcript, childName) {
    const userLines = String(transcript || '')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('아이:'))
        .map(line => line.replace(/^아이:\s*/, ''))
        .filter(Boolean);

    if (userLines.length === 0) {
        return `${childName}와 코코가 대화를 나눔.`;
    }

    const snippet = userLines.slice(-3).join(' / ').slice(0, 180);
    return `${childName}와의 대화: ${snippet}`;
}

async function summarizeChatSessionWithGemini(transcript, options = {}) {
    const childName = options.childName || getActiveChildName();
    const fallbackSummary = _buildFallbackChatSummary(transcript, childName);

    try {
        const { text: content } = await fetchWithGeminiRetry(
            `${PROXY_URL}/v1/chat/completions?type=ai`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "gemini-2.0-flash",
                    messages: [
                        {
                            role: "system",
                            content: `너는 대화 요약 전문가야. ${childName}와 나눈 대화를 2~3줄로 핵심만 한국어로 요약해. 요약문만 출력하고 다른 설명은 하지 마.`
                        },
                        { role: "user", content: transcript }
                    ]
                })
            },
            { maxRetries: 3, baseDelayMs: 1000 }
        );

        if (_isAiErrorResponse(content)) {
            console.warn("[summarizeChatSessionWithGemini] AI 오류 응답 → 로컬 폴백 요약 사용");
            return fallbackSummary;
        }

        return content || fallbackSummary;
    } catch (error) {
        console.error("[summarizeChatSessionWithGemini] 실패:", error);
        return fallbackSummary;
    }
}

async function saveChatMemoryToNotion({ sessionId, childName, roomType, conversationSummary, isImportant }) {
    if (_isChatMemoryAdminMode()) {
        console.log(`🛠️ [기억 프리패스] 관리자 모드 - AI 기억 저장 생략 (isImportant: ${isImportant})`);
        return true;
    }

    try {
        const payload = {
            parent: { database_id: NOTION_CHAT_MEMORY_DB_ID },
            properties: {
                "세션 ID": {
                    title: [{ text: { content: sessionId || generateChatSessionId() } }]
                },
                "아이 이름": {
                    select: { name: childName }
                },
                "소속 방": {
                    select: { name: roomType }
                },
                "대화 요약": {
                    rich_text: [{ text: { content: (conversationSummary || '').slice(0, 1900) } }]
                },
                "장기 기억": {
                    checkbox: isImportant === true
                }
            }
        };

        const response = await fetch(`${PROXY_URL}/v1/pages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`노션 AI 기억 저장 오류 (상태: ${response.status})`);
        console.log(`🧠 [AI 기억 저장 완료] ${childName} / ${roomType} / important=${isImportant}`);
        return true;
    } catch (error) {
        console.error("[saveChatMemoryToNotion] 저장 실패:", error);
        return false;
    }
}

function _buildTranscriptFromMessages(messages) {
    return messages.map(m => {
        const role = m.role === 'model' ? 'assistant' : m.role;
        const speaker = role === 'user' ? '아이' : '코코';
        const content = m.content || m.parts?.[0]?.text || '';
        return `${speaker}: ${content}`;
    }).join('\n');
}

async function saveChatMemoryFromConversation({ roomType, messages, childName, isImportant }) {
    if (!messages || messages.length === 0) return false;

    const normalized = messages.map(m => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.content || ''
    }));
    const userMessages = normalized.filter(m => m.role === 'user').map(m => m.content);
    if (userMessages.length === 0) return false;

    const name = childName || getActiveChildName();
    const room = roomType || '공부방';
    const markImportant = isImportant === true || userMessages.some(detectImportantMemoryTrigger);
    const transcript = _buildTranscriptFromMessages(normalized);
    const summary = await summarizeChatSessionWithGemini(transcript, { childName: name });

    return saveChatMemoryToNotion({
        sessionId: generateChatSessionId(),
        childName: name,
        roomType: room,
        conversationSummary: summary,
        isImportant: markImportant
    });
}

async function finalizeChatMemorySession(options = {}) {
    const state = options.state || window.chatSessionState;
    if (!state || state.saved) return false;

    const userMessages = options.userMessages || state.userMessages || [];
    if (userMessages.length === 0) return false;

    const messages = [];
    const maxLen = Math.max(userMessages.length, (state.assistantMessages || []).length);
    for (let i = 0; i < maxLen; i++) {
        if (userMessages[i]) messages.push({ role: 'user', content: userMessages[i] });
        if (state.assistantMessages && state.assistantMessages[i]) {
            messages.push({ role: 'assistant', content: state.assistantMessages[i] });
        }
    }

    const saved = await saveChatMemoryFromConversation({
        roomType: options.roomType || state.roomType,
        messages,
        childName: options.childName || state.childName,
        isImportant: options.isImportant
    });

    if (saved) state.saved = true;
    return saved;
}

window.addEventListener('beforeunload', () => {
    if (window.chatSessionState && !window.chatSessionState.saved && window.chatSessionState.userMessages?.length > 0) {
        finalizeChatMemorySession();
    }
});

// ========================================================
// 💥 퀴즈 오답 — 다시 풀기 / 다음 문제로 (전 과목 공통)
// ========================================================
function ensureQuizWrongChoiceOverlay() {
    if (document.getElementById('quizWrongChoiceOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'quizWrongChoiceOverlay';
    overlay.style.cssText =
        'display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:100000; justify-content:center; align-items:center; padding:20px; box-sizing:border-box;';

    overlay.innerHTML = `
        <div style="background:#fff; border-radius:24px; padding:28px 22px; max-width:380px; width:100%; text-align:center; box-shadow:0 16px 48px rgba(0,0,0,0.25); font-family:'Nanum Gothic','Jua',sans-serif;">
            <div style="font-size:2.5rem; margin-bottom:12px;">💥</div>
            <div id="quizWrongChoiceMessage" style="font-size:1.25rem; color:#333; margin-bottom:8px; line-height:1.45;">아쉽지만 틀렸어요!</div>
            <div id="quizWrongChoiceSub" style="font-size:0.95rem; color:#666; margin-bottom:22px; line-height:1.5;">다시 풀어볼까요, 아니면 다음 문제로 넘어갈까요?</div>
            <div style="display:flex; flex-direction:column; gap:10px;">
                <button id="quizWrongChoiceRetryBtn" type="button" style="padding:14px; border:none; border-radius:16px; background:linear-gradient(135deg,#4facfe,#00f2fe); color:#fff; font-family:inherit; font-size:1.1rem; cursor:pointer;">🔄 다시 풀기</button>
                <button id="quizWrongChoiceSkipBtn" type="button" style="padding:14px; border:none; border-radius:16px; background:#8b949e; color:#fff; font-family:inherit; font-size:1.1rem; cursor:pointer;">⏭️ 다음 문제로</button>
            </div>
        </div>
    `;

    overlay.querySelector('#quizWrongChoiceRetryBtn').addEventListener('click', () => {
        overlay.style.display = 'none';
        const fn = window.__quizWrongChoiceRetry;
        window.__quizWrongChoiceRetry = null;
        window.__quizWrongChoiceSkip = null;
        if (typeof fn === 'function') fn();
    });

    overlay.querySelector('#quizWrongChoiceSkipBtn').addEventListener('click', () => {
        overlay.style.display = 'none';
        const fn = window.__quizWrongChoiceSkip;
        window.__quizWrongChoiceRetry = null;
        window.__quizWrongChoiceSkip = null;
        if (typeof fn === 'function') fn();
    });

    document.body.appendChild(overlay);
}

window.promptQuizRetryOrSkip = function(options = {}) {
    ensureQuizWrongChoiceOverlay();
    const overlay = document.getElementById('quizWrongChoiceOverlay');
    const msgEl = document.getElementById('quizWrongChoiceMessage');
    const subEl = document.getElementById('quizWrongChoiceSub');

    msgEl.textContent = options.message || '아쉽지만 틀렸어요!';
    subEl.textContent =
        options.subMessage || '다시 풀어볼까요, 아니면 다음 문제로 넘어갈까요?';
    if (options.hint) {
        subEl.textContent += `\n💡 ${options.hint}`;
    }

    window.__quizWrongChoiceRetry = options.onRetry || null;
    window.__quizWrongChoiceSkip = options.onSkip || null;
    overlay.style.display = 'flex';

    if (typeof speakFairyTTS === 'function') {
        speakFairyTTS(options.message || '아쉽지만 틀렸어요!');
    }
};

window.closeQuizWrongChoice = function() {
    const overlay = document.getElementById('quizWrongChoiceOverlay');
    if (overlay) overlay.style.display = 'none';
};

// ========================================================
// 🚪 퀴즈/미션 진행 중 이탈 확인 (브라우저 뒤로 · 나가기 공통)
// ========================================================
window.LEAVE_SESSION_MSG = '나가시겠어요?\n풀던 문제가 사라질 수 있어요.';

window.__quizLeaveGuard = {
    armed: false,
    checking: false,
    isActive: null,
    onLeave: null
};

window.isQuizLeaveGuardActive = function() {
    const g = window.__quizLeaveGuard;
    if (!g || !g.armed || typeof g.isActive !== 'function') return false;
    try {
        return !!g.isActive();
    } catch (_) {
        return false;
    }
};

window.confirmLeaveActiveSession = function(message) {
    if (!window.isQuizLeaveGuardActive()) return true;
    return window.confirm(message || window.LEAVE_SESSION_MSG);
};

function __onQuizLeaveLobbyClick(e) {
    const link = e.target && e.target.closest
        ? e.target.closest('a.back-to-lobby-btn, a.exit-btn, a[href*="lobby.html"]')
        : null;
    if (!link) return;
    if (!window.isQuizLeaveGuardActive()) return;
    if (!window.confirm(window.LEAVE_SESSION_MSG)) {
        e.preventDefault();
        e.stopPropagation();
        return;
    }
    window.disarmQuizLeaveGuard();
}

window.armQuizLeaveGuard = function(options = {}) {
    const g = window.__quizLeaveGuard;
    g.isActive = typeof options.isActive === 'function' ? options.isActive : null;
    g.onLeave = typeof options.onLeave === 'function' ? options.onLeave : null;
    if (g.armed) return;
    g.armed = true;
    document.addEventListener('click', __onQuizLeaveLobbyClick, true);
    try {
        history.pushState({ kidsQuizGuard: 1 }, '');
    } catch (_) {}
};

window.disarmQuizLeaveGuard = function() {
    const g = window.__quizLeaveGuard;
    if (!g) return;
    if (g.armed) {
        document.removeEventListener('click', __onQuizLeaveLobbyClick, true);
    }
    g.armed = false;
    g.checking = false;
    g.isActive = null;
    g.onLeave = null;
};

window.addEventListener('popstate', () => {
    const g = window.__quizLeaveGuard;
    if (!g || !g.armed || g.checking) return;

    // 퀴즈 진행 중이면 확인 후 이탈, 학년/단원 선택 화면이면 확인 없이 오버레이만 닫기
    if (window.isQuizLeaveGuardActive()) {
        g.checking = true;
        const ok = window.confirm(window.LEAVE_SESSION_MSG);
        if (ok) {
            const leaveFn = g.onLeave;
            window.disarmQuizLeaveGuard();
            if (typeof leaveFn === 'function') leaveFn();
        } else {
            try {
                history.pushState({ kidsQuizGuard: 1 }, '');
            } catch (_) {}
        }
        g.checking = false;
        return;
    }

    const leaveFn = g.onLeave;
    window.disarmQuizLeaveGuard();
    if (typeof leaveFn === 'function') leaveFn();
});

window.addEventListener('beforeunload', (e) => {
    if (!window.isQuizLeaveGuardActive()) return;
    e.preventDefault();
    e.returnValue = '';
});
