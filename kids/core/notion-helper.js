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

/**
 * 📖 노션 독해 마스터 DB (LIBRARY_DB_ID)에서 지문 및 1:N 문제 세트 실시간 조회
 * @param {Object} options { subject: '국어', track: '🏥 센터 독해'|'🏫 교과서 독해', student: '민수'|'민서', forceRefresh: false }
 */
async function fetchReadingPassagesFromNotion(options = {}) {
    const LIBRARY_DB_ID = "37ca27115b688023a7d2cc5b3ff51fee";
    const subject = options.subject || "국어";
    const track = options.track || "";
    const targetStudent = options.student || (window.currentUserName === '민서' ? '민서' : '민수');

    try {
        const andFilters = [
            { property: "과목", select: { equals: subject } }
        ];

        if (track) {
            andFilters.push({ property: "트랙", select: { equals: track } });
        }

        const queryBody = {
            filter: andFilters.length > 1 ? { and: andFilters } : andFilters[0],
            sorts: [
                { property: "순번", direction: "ascending" }
            ],
            page_size: options.pageSize || 50
        };

        const response = await fetch(`${PROXY_URL}/v1/databases/${LIBRARY_DB_ID}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(queryBody)
        });

        if (!response.ok) throw new Error(`독해 DB 조회 실패 (HTTP ${response.status})`);
        const data = await response.json();
        const results = data.results || [];

        const parsedPassages = await Promise.all(results.map(async (page) => {
            const p = page.properties;
            const titleArr = p["책 제목"]?.title || p["제목"]?.title || [];
            const title = titleArr.map(t => t.plain_text).join("") || "제목 없음";
            
            const trackVal = p["트랙"]?.select?.name || "🏥 센터 독해";
            const unitVal = (p["회차/단원"]?.rich_text || []).map(t => t.plain_text).join("") || "";
            const orderVal = typeof p["순번"]?.number === 'number' ? p["순번"].number : 999;
            const fullTextProp = (p["지문전문"]?.rich_text || []).map(t => t.plain_text).join("");
            const summaryVal = (p["지문구성내용"]?.rich_text || []).map(t => t.plain_text).join("");
            const rawQuestions = (p["문제데이터"]?.rich_text || []).map(t => t.plain_text).join("");
            const dateVal = p["날짜"]?.date?.start || "";
            const barcode = (p["도서 키(ID)"]?.rich_text || []).map(t => t.plain_text).join("") || page.id;

            // 문제 데이터 JSON 파싱
            let questions = [];
            if (rawQuestions) {
                try {
                    questions = JSON.parse(rawQuestions);
                } catch(e) {
                    console.warn(`[Reading] 문제데이터 JSON 파싱 실패 (${title}):`, e);
                }
            }

            // 지문 전문이 속성에 없으면 본문 블록에서 읽기 (하위 호환)
            let fullText = fullTextProp;
            if (!fullText && page.id) {
                try {
                    fullText = await fetchNotionPageBlocksPlainText(page.id);
                } catch(e) {}
            }

            return {
                id: barcode,
                pageId: page.id,
                title,
                track: trackVal,
                unit: unitVal,
                order: orderVal,
                fullText: fullText.trim(),
                summary: summaryVal,
                date: dateVal,
                questions: Array.isArray(questions) ? questions : [],
                grade: (p["학년"]?.multi_select || []).map(m => m.name).join(", "),
                student: (p["학생"]?.multi_select || []).map(m => m.name)
            };
        }));

        // 학생 타겟팅 필터 (민수/민서 지정된 경우)
        const finalPassages = parsedPassages.filter(item => {
            if (!item.student || item.student.length === 0) return true;
            return item.student.includes(targetStudent);
        });

        console.log(`✅ [Reading] 독해 DB에서 ${finalPassages.length}개 지문 로드 완료 (트랙: ${track || '전체'})`);
        return finalPassages;
    } catch(err) {
        console.error("[fetchReadingPassagesFromNotion] 로딩 에러:", err);
        return [];
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
window.fetchReadingPassagesFromNotion = fetchReadingPassagesFromNotion;
window.resolveReadingPassageList = resolveReadingPassageList;
window.MAX_READING_PASSAGES = MAX_READING_PASSAGES;

/**
 * "1교시(09:00~09:40)", "0교시", "방과후", "하교 후" 형태의 교시 문자열 파싱
 */
function parseTimetablePeriodSlot(raw) {
    if (!raw) return { num: null, label: "", timeRange: "", display: "" };
    const text = String(raw).trim();
    if (text.includes("0교시") || text.includes("아침") || text === "0") {
        return { num: 0, label: "0교시", timeRange: "08:20~08:50", display: "0교시(아침)" };
    }
    if (text.includes("방과후")) {
        return { num: 7, label: "방과후", timeRange: "14:40~15:30", display: "방과후" };
    }
    if (text.includes("하교") || text.includes("학원") || text.includes("센터") || text.includes("수영") || text.includes("외부")) {
        return { num: 8, label: "하교 후", timeRange: "15:30~", display: "하교 후" };
    }
    const match = text.match(/(\d)\s*교시(?:\s*\(([^)]+)\))?/);
    if (match) {
        const num = parseInt(match[1], 10);
        const timeRange = (match[2] || "").trim();
        const label = `${num}교시`;
        const display = timeRange ? `${label}(${timeRange})` : label;
        return { num, label, timeRange, display };
    }
    return { num: null, label: text, timeRange: "", display: text };
}

function inferPeriodNumFromDate(periodDate) {
    if (!periodDate?.start) return null;
    const d = new Date(periodDate.start);
    if (isNaN(d.getTime())) return null;
    const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const map = { "08:20": 0, "09:00": 1, "10:00": 2, "11:00": 3, "13:00": 4, "14:00": 5, "15:00": 6, "15:30": 8 };
    return map[time] !== undefined ? map[time] : null;
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
    let periodNum = typeof periodSlot.num === 'number' ? periodSlot.num : null;
    if (periodNum === null && periodDate?.start) {
        periodNum = inferPeriodNumFromDate(periodDate);
    }
    const pageTitle = p["제목"]?.title?.[0]?.plain_text || p["수업"]?.title?.[0]?.plain_text || "";
    if (periodNum === null && pageTitle) {
        if (pageTitle.includes("0교시") || pageTitle.includes("아침")) periodNum = 0;
        else if (pageTitle.includes("방과후")) periodNum = 7;
        else if (pageTitle.includes("하교") || pageTitle.includes("학원") || pageTitle.includes("센터") || pageTitle.includes("수영")) periodNum = 8;
        else {
            const titleMatch = pageTitle.match(/(\d)\s*교시/);
            if (titleMatch) periodNum = parseInt(titleMatch[1], 10);
        }
    }

    const defaultLabel = periodNum === 0 ? "0교시" : (periodNum === 7 ? "방과후" : (periodNum === 8 ? "하교 후" : `${periodNum}교시`));

    return {
        id: page.id,
        title: pageTitle,
        child: p["아이"]?.select?.name || "",
        subject: p["과목"]?.select?.name || "",
        dayOfWeek: p["요일"]?.select?.name || "",
        periodNum,
        periodSlot: periodSlot.num !== null
            ? periodSlot
            : (periodNum !== null ? { num: periodNum, label: defaultLabel, timeRange: "", display: defaultLabel } : { num: null, label: "", timeRange: "", display: "" }),
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

/**
 * 💾 시간표 캐싱 (SWR: Stale-While-Revalidate 초고속 로딩 지원)
 */
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

/**
 * 🏛️ 고정 시간표 DB + 📢 학사일정 및 알림장 DB를 동시에 듀얼 수집하는 통합 함수
 */
async function fetchDualTimetableFromNotion() {
    const staticDbId = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STATIC_TIMETABLE_DB_ID) || "32ba27115b68828bbda201a1bdce12fc";
    const overlayDbId = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.EVENT_OVERLAY_DB_ID) || (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.TIMETABLE_DB_ID) || "e3f9b3917c2b48bfa3d47db4bd0545fd";

    try {
        const [staticRows, overlayRows] = await Promise.all([
            fetchTimetableFromNotion({ dbId: staticDbId, fetchPageContent: false }),
            fetchTimetableFromNotion({ dbId: overlayDbId, fetchPageContent: true })
        ]);

        const result = {
            staticRows: staticRows || [],
            overlayRows: overlayRows || [],
            allRows: [...(staticRows || []), ...(overlayRows || [])]
        };

        saveTimetableToCache(result);
        return result;
    } catch (e) {
        console.error("[fetchDualTimetableFromNotion] 로딩 실패:", e);
        // 네트워크 실패 시 캐시 반환
        const cached = loadTimetableFromCache();
        if (cached) {
            console.log("⚡ [Timetable Cache] 네트워크 실패로 캐시 데이터 사용");
            return cached;
        }
        const fallback = await fetchTimetableFromNotion();
        return { staticRows: [], overlayRows: fallback, allRows: fallback };
    }
}

window.fetchTimetableFromNotion = fetchTimetableFromNotion;
window.fetchDualTimetableFromNotion = fetchDualTimetableFromNotion;
window.loadTimetableFromCache = loadTimetableFromCache;
window.saveTimetableToCache = saveTimetableToCache;
window.clearTimetableCache = clearTimetableCache;
window.parseTimetablePage = parseTimetablePage;

// 🕒 전역 학습 시작 시간 자동 기록
window.roomStartTime = window.roomStartTime || new Date();

/**
 * 아버님의 새로운 노션 DB 구조에 맞춰 학습 일지를 생성하는 통합 함수
 * 매개변수를 생략해도 현재 환경(window 객체)을 바탕으로 자동으로 채웁니다.
 */
async function sendStudyLogToNotion(options = {}) {
    let childName = options.childName;
    if (!childName) {
        const curUser = localStorage.getItem('currentUser');
        const curChild = localStorage.getItem('currentChild');
        const curUserName = localStorage.getItem('currentUserName');
        if (curUser === 'daughter' || curChild === 'minseo' || curUserName === '민서' || (typeof currentProfile !== 'undefined' && currentProfile === 'daughter') || (window.currentProfile === 'daughter')) {
            childName = '민서';
        } else {
            childName = '민수';
        }
    }
    let subject = options.subject || window.currentSubject;
    if (!subject && typeof detectSubjectFromContext === 'function') {
        subject = detectSubjectFromContext();
    }

    // 🚨 [원천 방어막] 유효한 과목명이 없거나 "미상 과목"인 경우 노션 DB 오염 방지를 위해 전송 차단
    if (!subject || subject === "미상 과목") {
        console.warn(`⚠️ [학습일지 방어막] 유효한 교과목명이 없어 노션 전송을 안전하게 차단합니다. (감지된 과목: ${subject})`);
        return false;
    }

    // 🛑 [원천 중복 전송 방어막] 동일 세션 25초 이내 동일/유사 과목 재전송 원천 차단 (버튼 연타 및 화면 이탈 중복 방지)
    const nowTs = Date.now();
    window.__lastStudyLogHistory = window.__lastStudyLogHistory || [];
    const recentDuplicate = window.__lastStudyLogHistory.find(h => {
        const timeDiff = (nowTs - h.time) / 1000;
        const isSameStudent = h.childName === childName;
        const isRelatedSubj = h.subject === subject || h.subject.startsWith(subject) || subject.startsWith(h.subject);
        return isSameStudent && isRelatedSubj && timeDiff < 25;
    });

    if (recentDuplicate) {
        console.warn(`🛑 [학습일지 중복 방어막] 최근 ${Math.round((nowTs - recentDuplicate.time)/1000)}초 전에 이미 [${recentDuplicate.subject}] 일지가 기록되었습니다. 중복 전송을 안전하게 차단합니다! (시도: ${childName} - ${subject})`);
        return true;
    }

    const startTime = options.startTime || (window.roomStartTime ? window.roomStartTime.toISOString() : new Date().toISOString());
    const endTime = options.endTime || new Date().toISOString();
    
    // 소요시간 자동 연산
    let durationMinutes = options.durationMinutes;
    if (durationMinutes === undefined) {
        const timeDiff = new Date(endTime) - new Date(startTime);
        durationMinutes = Math.floor(timeDiff / 60000);
        if (durationMinutes < 1) durationMinutes = 1;
    }

    // ⏰ [스크린타임 트래커 연동] 오늘 순수 공부 시간 누적 기록
    if (typeof window.ScreenTimeTracker !== 'undefined' && typeof window.ScreenTimeTracker.trackStudySession === 'function') {
        window.ScreenTimeTracker.trackStudySession(durationMinutes, subject);
    } else if (typeof window.trackStudySession === 'function') {
        window.trackStudySession(durationMinutes, subject);
    } else {
        try {
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
            const k1 = `MINMIN_DAILY_STUDY_TIME_${childName}_${todayStr}`;
            const k2 = `MINMIN_DAILY_STUDY_TIME_${childName}_${now.toLocaleDateString()}`;
            const cur = Math.max(parseInt(localStorage.getItem(k1) || '0', 10), parseInt(localStorage.getItem(k2) || '0', 10)) + durationMinutes;
            localStorage.setItem(k1, String(cur));
            localStorage.setItem(k2, String(cur));
        } catch(e) {}
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

    // 💡 [핵심 방어막] 현재 로그인한 사람이 아빠나 엄마인지 실시간 체크 (부모 계정 시뮬레이터 가동 시 데이터 오염 방지)
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

        window.__isStudyLogSentInSession = true;
        window.__lastStudyLogHistory.push({ childName, subject, time: nowTs });

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

  // 🚀 [시간표 부스트 연동] 오늘 복습 과목: 한도 150개 & EXP 1.2배!
  const boostInfo = typeof window.TimetableBoost !== 'undefined'
      ? window.TimetableBoost.getSubjectBoostInfo(subjectName, userName)
      : { limit: 100, expMultiplier: 1.0, completionBonus: 5 };

  const DAILY_LIMIT = boostInfo.limit || 100; // 하루 보상 획득 상한선 (복습 과목 150개 확장)

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

    // ⚡ [SWR 클라우드 동기화] 인벤토리 페이지 ID 캐싱 및 노션 '학습설정' 동기화
    localStorage.setItem(`MINMIN_INVENTORY_PAGE_ID_${userName}`, page.id);
    if (typeof window.ScreenTimeTracker !== 'undefined' && typeof window.ScreenTimeTracker.syncFromInventoryProps === 'function') {
        window.ScreenTimeTracker.syncFromInventoryProps(props, userName);
    }
    if (props["학습설정"]) {
        if (typeof syncQuizFlowFromCloud === 'function') {
            syncQuizFlowFromCloud(props["학습설정"]);
        }
        if (typeof SettingsManager !== 'undefined' && typeof SettingsManager.syncFromCloud === 'function') {
            SettingsManager.syncFromCloud(props["학습설정"]);
        }
    }

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
            let msg = `⏳ 오늘 [${subjectName}] 과목에서 얻을 수 있는 보상을 모두 모았어요!\n(일일 상한선 ${DAILY_LIMIT}개 도달${boostInfo.type === 'review' ? ' · 오늘 복습 부스트 150개 적용됨' : ''})\n내일 다시 즐겁게 탐험해 봐요!`;
            if (typeof showRewardModal === 'function' && typeof updateRewardModal === 'function') {
                showRewardModal(`<div style="color: #ff073a; font-weight: bold;">⚠️ 오늘 ${subjectName} 보상을 모두 캤습니다!<br><span style="font-size:0.9rem; color:#666;">(일일 상한선 ${DAILY_LIMIT}개 도달)</span><br><br><button onclick="location.href=window.location.pathname.includes('/kids-school/') ? '/kids-school/lobby.html' : '/lobby.html'">로비로 나가기</button></div>`);
            } else {
                alert(msg);
            }
        }
        return false; 
    }

    // 💡 4. 자산 및 경험치 계산 (시간표 부스트 가산)
    let diamond = props["다이아몬드 개수"]?.number || 0; 
    let slime = typeof getDaughterRewardCount === 'function'
        ? getDaughterRewardCount(props)
        : (props["슬라임 파츠 개수"]?.number || 0);
    let tickets = props["소원권 개수"]?.number || 0;
    let currentExp = props[expPropName]?.number || 0; 
    
    let previousWealth = currentTheme === '마인크래프트' ? diamond : slime;
    let currentWealth = previousWealth + allowedCurrency;
    
    // 🔥 복습 과목이면 경험치 1.2배 부스트 적용
    let finalEarnedExp = Math.round(earned * (boostInfo.expMultiplier || 1.0));
    let newExp = currentExp + finalEarnedExp; // 메인 경험치는 깎이지 않고 순수하게 모두 오르게 처리
    
    const prevLevelInfo = calculateLevelInfo(currentExp);
    const currLevelInfo = calculateLevelInfo(newExp);

    // 🎫 [소원권 누적 발급 안정화] 마이룸 가구 구매로 지갑이 줄어도 누적 150개 기준 안전 보존!
    const cumKey = `MINMIN_CUMULATIVE_WEALTH_${userName}`;
    let cumulativeWealth = parseInt(localStorage.getItem(cumKey), 10);
    if (isNaN(cumulativeWealth) || cumulativeWealth < currentWealth) {
        cumulativeWealth = currentWealth;
    }
    const prevCumulative = cumulativeWealth;
    cumulativeWealth += allowedCurrency;
    localStorage.setItem(cumKey, String(cumulativeWealth));

    // ⏰ [스크린타임 트래커 연동] 오늘 획득 보상 누적 기록 (50개 퀘스트용)
    if (allowedCurrency > 0) {
        if (typeof window.ScreenTimeTracker !== 'undefined' && typeof window.ScreenTimeTracker.recordDailyRewardEarned === 'function') {
            window.ScreenTimeTracker.recordDailyRewardEarned(allowedCurrency, userName);
        } else if (typeof window.recordDailyRewardEarned === 'function') {
            window.recordDailyRewardEarned(allowedCurrency, userName);
        } else {
            try {
                const now = new Date();
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const dk1 = `MINMIN_DAILY_REWARD_SUM_${userName}_${todayStr}`;
                const dk2 = `MINMIN_DAILY_REWARD_SUM_${userName}_${now.toLocaleDateString()}`;
                const curR = Math.max(parseInt(localStorage.getItem(dk1) || '0', 10), parseInt(localStorage.getItem(dk2) || '0', 10)) + allowedCurrency;
                localStorage.setItem(dk1, String(curR));
                localStorage.setItem(dk2, String(curR));
            } catch(e) {}
        }
    }

    let earnedTickets = Math.floor(cumulativeWealth / 150) - Math.floor(prevCumulative / 150);
    earnedTickets = Math.max(0, earnedTickets);
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
    
    // ⚡ [SWR 캐시 동기화] 로비 인벤토리 로컬 캐시 즉각 최신화 (페이지 복귀 시 0.01초 반영)
    try {
      const invCacheKey = `MINMIN_INVENTORY_CACHE_${userName}`;
      const diamondVal = currentTheme === '마인크래프트' ? currentWealth : (props["다이아몬드 개수"]?.number || 0);
      const slimeVal = currentTheme !== '마인크래프트' ? currentWealth : (typeof getDaughterRewardCount === 'function' ? getDaughterRewardCount(props) : (props["슬라임 파츠 개수"]?.number || 0));
      localStorage.setItem(invCacheKey, JSON.stringify({
        diamond: diamondVal,
        slime: slimeVal,
        level: currLevelInfo.level,
        theme: currentTheme,
        updatedAt: Date.now()
      }));
    } catch (e) {
      console.warn("[Inventory Cache] 로컬 캐시 갱신 실패:", e);
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
// 🧩 [클린 아키텍처] 하위 호환성 보장 파사드 & 자동 서브모듈 로더
// ========================================================
// notion-helper.js의 책임을 '순수 노션 통신 & 캐시'로 단일화하였으며,
// 기존 화면들과의 100% 하위 호환성을 위해 분리된 3대 서브모듈을 투명하게 자동 로드합니다.
(function _initNotionFacade() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // 분리된 서브모듈 정의
    const submodules = [
        'stt-debouncer.js',
        'mission-reward-engine.js',
        'quiz-feedback-overlay.js'
    ];

    // 현재 스크립트 기준 베이스 경로 산출
    let basePath = '';
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
        const src = scripts[i].src || '';
        if (src.includes('notion-helper.js')) {
            basePath = src.substring(0, src.lastIndexOf('/') + 1);
            break;
        }
    }

    if (basePath) {
        submodules.forEach(mod => {
            const alreadyLoaded = Array.from(document.scripts).some(s => (s.src || '').includes(mod));
            if (!alreadyLoaded) {
                const s = document.createElement('script');
                s.src = basePath + mod;
                s.async = false; // 순서 보장
                document.head.appendChild(s);
            }
        });
    }
})();
