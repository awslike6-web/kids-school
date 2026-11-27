// ==========================================
// 🏛️ 김s 공부방 주간·고정 시간표 및 오버레이 연동 모듈 (notion-timetable.js)
// ==========================================
// 시간표 파서·조회·캐시 한 벌 (2026-11-27 리팩토링 묶음 D: notion-api-client.js 안의 사본을 없애고 이 파일로 합침).
// 화면은 notion-helper.js 자동 로더로 싣고, timetable.html은 notion-api-client.js 다음에 태그로 싣는다.
(function () {
    'use strict';

    var PROXY_URL = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
    var STATIC_TIMETABLE_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.STATIC_TIMETABLE_DB_ID ? APP_CONFIG.STATIC_TIMETABLE_DB_ID : "32ba27115b68828bbda201a1bdce12fc";
    var EVENT_OVERLAY_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.EVENT_OVERLAY_DB_ID ? APP_CONFIG.EVENT_OVERLAY_DB_ID : "e3f9b3917c2b48bfa3d47db4bd0545fd";
    var TIMETABLE_DB_ID = typeof APP_CONFIG !== 'undefined' && APP_CONFIG.TIMETABLE_DB_ID ? APP_CONFIG.TIMETABLE_DB_ID : EVENT_OVERLAY_DB_ID;
    // 여러 쪽(page_size 100 넘음) 조회 때 쪽마다 순서가 바뀌어 행이 빠지거나 겹치지 않게 만든 시각으로 고정 정렬
    // (notion-api-client.js 2026-11-17 수정과 같음 — 두 벌이던 시간표 파서를 합치며 이쪽에도 반영, 2026-11-27)
    var TIMETABLE_STABLE_SORTS = [{ timestamp: "created_time", direction: "ascending" }];

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





    function isTimetableNoticeCandidate(row) {
        const hasPeriod = !!(row.periodNum || row.periodSlot?.num);
        if (hasPeriod) return false;
        return !!(row.title || row.memo || row.alertAt || row.subject);
    }

    async function enrichTimetableRowsWithPageContent(rows) {
        const targets = rows.filter(isTimetableNoticeCandidate);
        if (!targets.length) return rows;
        // 페이지 본문 읽기는 notion-api-client.js 한 벌을 쓴다 (timetable.html도 그 파일을 먼저 싣는다).
        // 없으면 본문 보강만 건너뛰고, 이미 받은 시간표 행은 그대로 돌려준다 (카본 검토 2026-11-27)
        const readPage = window.NotionApiClient && window.NotionApiClient.fetchNotionPageBlocksPlainText;
        if (typeof readPage !== 'function') {
            console.warn('[시간표] notion-api-client.js가 안 실려 알림 본문 보강을 건너뜀');
            return rows;
        }

        await Promise.all(targets.map(async (row) => {
            const body = await readPage(row.id);
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
                const bodyData = { page_size: 100, sorts: TIMETABLE_STABLE_SORTS };
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

    // 공개 이름 (나머지 상수·보조 함수는 이 안에만 — 모든 화면이 notion-helper로 싣게 되어 전역을 더럽히지 않게, 카본 검토 2026-11-27)
    const api = {
        parseTimetablePeriodSlot,
        inferPeriodNumFromDate,
        parseTimetablePage,
        fetchTimetableFromNotion,
        fetchDualTimetableFromNotion,
        updateTimetableItemComplete,
        loadTimetableFromCache,
        saveTimetableToCache,
        clearTimetableCache
    };
    // notion-helper.js의 같은 이름 안전 감싸개(실리기 전 호출용)를 진짜 함수로 덮는다
    Object.keys(api).forEach(name => { window[name] = api[name]; });
    // 시간표 모듈 이름표 — notion-helper.js의 안전 감싸개가 이것이 실릴 때까지 기다린다 (2026-11-27 리팩토링 묶음 D)
    window.NotionTimetable = api;
})();
