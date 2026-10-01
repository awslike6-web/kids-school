// ==============================================================================
// 🌐 [Notion API Client] 노션 클라우드 통신 & 파서 엔진 (notion-api-client.js)
// - 단일 책임: Cloudflare Worker 프록시 통신, VOCA/독해/도서관/시간표 쿼리 및 파싱,
//             Rate Limit(초당 3회) 방어, 블록 텍스트 추출
// - 골디락스 응집도: ~480줄 컴팩트 독립 모듈
// ==============================================================================

(function(window) {
    'use strict';

    // ----------------------------------------------------
    // 0. 환경 변수 및 DB ID 설정 (SSOT)
    // ----------------------------------------------------
    const PROXY_URL = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
    const VOCA_DB_ID = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.VOCA_DB_ID) ? APP_CONFIG.VOCA_DB_ID : "375a27115b688038b686d3994ee12919";
    const TIMETABLE_DB_ID = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.TIMETABLE_DB_ID) ? APP_CONFIG.TIMETABLE_DB_ID : "e3f9b3917c2b48bfa3d47db4bd0545fd";
    const LIBRARY_DB_ID = "37ca27115b688023a7d2cc5b3ff51fee";

    // ----------------------------------------------------
    // 1. VOCA DB 파서 및 쿼리 엔진
    // ----------------------------------------------------
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
            isMastered: p["달성"]?.checkbox || false,
            areaZone: p["영역 분류"]?.select?.name || "",
            hint: p["초성힌트"]?.rich_text?.[0]?.plain_text || "",
            quiz: p["퀴즈제시"]?.rich_text?.[0]?.plain_text || ""
        };
    }

    function _matchesVocaRecord(record, options) {
        if (!record.word) return false;

        if (options.filterByStudent !== false) {
            let loginName = (options.studentName ?? window.currentUserName ?? "민수").trim();
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

    function _buildVocaQueryBody(options) {
        const body = { page_size: 100 };
        const filters = [];

        if (options.filterByStudent && options.studentName) {
            filters.push({
                property: "학생",
                multi_select: { contains: options.studentName }
            });
        }

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

        // 1. 캐시 확인 (강제 새로고침이 아닐 때)
        if (!forceRefresh && typeof window._loadVocaFromCache === 'function') {
            const cachedRecords = window._loadVocaFromCache(cacheTarget, dbId);
            if (cachedRecords && cachedRecords.length > 0) {
                return cachedRecords.filter(record => _matchesVocaRecord(record, queryOptions));
            }
        }

        // 2. 노션 API 통신
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
                if (hasMore) {
                    await new Promise(r => setTimeout(r, 60)); // Rate limit 방어
                }
            }

            const parsedRecords = allResults.map(parseVocaPage);

            // 캐시 저장
            if (typeof window._saveVocaToCache === 'function') {
                window._saveVocaToCache(cacheTarget, dbId, parsedRecords);
            }

            return parsedRecords.filter(record => _matchesVocaRecord(record, queryOptions));
        } catch (error) {
            console.error(`[fetchVocaFromNotion] ${options.subject || "전체"} 데이터 로딩 실패:`, error);
            if (typeof window._loadVocaFromCache === 'function') {
                const fallback = window._loadVocaFromCache(cacheTarget, dbId);
                if (fallback && fallback.length > 0) {
                    return fallback.filter(record => _matchesVocaRecord(record, queryOptions));
                }
            }
            return [];
        }
    }

    async function updateVocaMasteryStatus(pageId, isMastered) {
        if (!pageId) return false;
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

    // ----------------------------------------------------
    // 2. 도서관 & 독해 DB 쿼리 및 파서
    // ----------------------------------------------------
    const MAX_READING_PASSAGES = 10;

    async function fetchLibraryBooksFromNotion(options = {}) {
        const forceRefresh = options.forceRefresh === true;
        const todayStr = new Date().toISOString().slice(0, 10);
        const libCacheKey = `MINMIN_LIBRARY_CACHE_V1_${todayStr}`;

        if (!forceRefresh) {
            try {
                const cached = localStorage.getItem(libCacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
                }
            } catch(e) {}
        }

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
            const results = data.results || [];
            try {
                localStorage.setItem(libCacheKey, JSON.stringify(results));
            } catch(e) {}
            return results;
        } catch (error) {
            console.error("[fetchLibraryBooksFromNotion] 로딩 실패:", error);
            throw error;
        }
    }

    async function fetchReadingPassagesFromNotion(options = {}) {
        const subject = options.subject || "국어";
        const track = options.track || "";
        const targetStudent = options.student || (window.currentUserName === '민서' ? '민서' : '민수');
        const forceRefresh = options.forceRefresh === true;

        if (!forceRefresh && typeof window._loadReadingFromCache === 'function') {
            const cached = window._loadReadingFromCache(subject, track, targetStudent);
            if (cached && cached.length > 0) {
                console.log(`⚡ [Reading Cache] ${subject} (${track || '전체'}) 독해 캐시 즉시 반환 (${cached.length}건)`);
                return cached;
            }
        }

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

                let questions = [];
                if (rawQuestions) {
                    try {
                        questions = JSON.parse(rawQuestions);
                    } catch(e) {
                        console.warn(`[Reading] 문제데이터 JSON 파싱 실패 (${title}):`, e);
                    }
                }

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
                    fullText: (fullText || "").trim(),
                    summary: summaryVal,
                    date: dateVal,
                    questions: Array.isArray(questions) ? questions : [],
                    grade: (p["학년"]?.multi_select || []).map(m => m.name).join(", "),
                    student: (p["학생"]?.multi_select || []).map(m => m.name)
                };
            }));

            const finalPassages = parsedPassages.filter(item => {
                if (!item.student || item.student.length === 0) return true;
                return item.student.includes(targetStudent);
            });

            if (typeof window._saveReadingToCache === 'function') {
                window._saveReadingToCache(subject, track, targetStudent, finalPassages);
            }

            console.log(`✅ [Reading] 독해 DB에서 ${finalPassages.length}개 지문 로드 및 캐시 저장 (트랙: ${track || '전체'})`);
            return finalPassages;
        } catch(err) {
            console.error("[fetchReadingPassagesFromNotion] 로딩 에러:", err);
            return [];
        }
    }

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

    // ----------------------------------------------------
    // 3. 시간표 DB 및 노션 블록 파서
    // ----------------------------------------------------
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

            if (typeof window.saveTimetableToCache === 'function') {
                window.saveTimetableToCache(result);
            }
            return result;
        } catch (e) {
            console.error("[fetchDualTimetableFromNotion] 로딩 실패:", e);
            if (typeof window.loadTimetableFromCache === 'function') {
                const cached = window.loadTimetableFromCache();
                if (cached) {
                    console.log("⚡ [Timetable Cache] 네트워크 실패로 캐시 데이터 사용");
                    return cached;
                }
            }
            const fallback = await fetchTimetableFromNotion();
            return { staticRows: [], overlayRows: fallback, allRows: fallback };
        }
    }

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

    // ----------------------------------------------------
    // 4. 전역 노출 및 네임스페이스 바인딩 (하위 호환 100%)
    // ----------------------------------------------------
    window.NotionApiClient = {
        PROXY_URL,
        VOCA_DB_ID,
        TIMETABLE_DB_ID,
        LIBRARY_DB_ID,
        MAX_READING_PASSAGES,
        parseVocaPage,
        _matchesVocaRecord,
        _buildVocaQueryBody,
        fetchVocaFromNotion,
        updateVocaMasteryStatus,
        fetchLibraryBooksFromNotion,
        fetchReadingPassagesFromNotion,
        mapNotionRecordsToReadingBooks,
        resolveReadingPassageList,
        parseTimetablePeriodSlot,
        inferPeriodNumFromDate,
        parseTimetablePage,
        extractPlainTextFromNotionBlock,
        fetchNotionBlockChildrenPlainText,
        collectPlainTextFromNotionBlock,
        fetchNotionPageBlocksPlainText,
        fetchTimetableFromNotion,
        fetchDualTimetableFromNotion,
        updateTimetableItemComplete
    };

    // 기존 단독 전역 바인딩 보존
    window.parseVocaPage = parseVocaPage;
    window._matchesVocaRecord = _matchesVocaRecord;
    window._buildVocaQueryBody = _buildVocaQueryBody;
    window.fetchVocaFromNotion = fetchVocaFromNotion;
    window.updateVocaMasteryStatus = updateVocaMasteryStatus;
    window.fetchLibraryBooksFromNotion = fetchLibraryBooksFromNotion;
    window.fetchReadingPassagesFromNotion = fetchReadingPassagesFromNotion;
    window.mapNotionRecordsToReadingBooks = mapNotionRecordsToReadingBooks;
    window.resolveReadingPassageList = resolveReadingPassageList;
    window.MAX_READING_PASSAGES = MAX_READING_PASSAGES;
    window.parseTimetablePeriodSlot = parseTimetablePeriodSlot;
    window.inferPeriodNumFromDate = inferPeriodNumFromDate;
    window.parseTimetablePage = parseTimetablePage;
    window.fetchTimetableFromNotion = fetchTimetableFromNotion;
    window.fetchDualTimetableFromNotion = fetchDualTimetableFromNotion;
    window.updateTimetableItemComplete = updateTimetableItemComplete;

})(typeof window !== 'undefined' ? window : this);
