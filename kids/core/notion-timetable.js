// ==========================================
// 🏛️ 민민이네 공부방 주간·고정 시간표 및 오버레이 연동 모듈 (notion-timetable.js)
// ==========================================

var PROXY_URL = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
var STATIC_TIMETABLE_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STATIC_TIMETABLE_DB_ID ? APP_CONFIG.STATIC_TIMETABLE_DB_ID : "32ba27115b68828bbda201a1bdce12fc";
var EVENT_OVERLAY_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.EVENT_OVERLAY_DB_ID ? APP_CONFIG.EVENT_OVERLAY_DB_ID : "e3f9b3917c2b48bfa3d47db4bd0545fd";
var TIMETABLE_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.TIMETABLE_DB_ID ? APP_CONFIG.TIMETABLE_DB_ID : EVENT_OVERLAY_DB_ID;

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

