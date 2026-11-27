// ==============================================================================
// 🌐 [Notion API Client] 노션 클라우드 통신 & 파서 엔진 (notion-api-client.js)
// - 단일 책임: Cloudflare Worker 프록시 통신, VOCA/독해/도서관/시간표 쿼리 및 파싱,
//             Rate Limit(초당 3회) 방어, 블록 텍스트 추출
// - 골디락스 응집도: ~480줄 컴팩트 독립 모듈
// ==============================================================================
// 🕒 한국 시간(KST) 기준 YYYY-MM-DD (toISOString 슬라이싱은 오전 9시 전에 전날 날짜가 됨)
function getKstTodayYMD(date = new Date()) {
    const kst = new Date(date.getTime() + 9 * 3600000);
    return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`;
}


(function(window) {
    'use strict';

    // ----------------------------------------------------
    // 0. 환경 변수 및 DB ID 설정 (SSOT)
    // ----------------------------------------------------
    const PROXY_URL = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
    const VOCA_DB_ID = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.VOCA_DB_ID) ? APP_CONFIG.VOCA_DB_ID : "375a27115b688038b686d3994ee12919";
    const TIMETABLE_DB_ID = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.TIMETABLE_DB_ID) ? APP_CONFIG.TIMETABLE_DB_ID : "e3f9b3917c2b48bfa3d47db4bd0545fd";
    const LIBRARY_DB_ID = "37ca27115b688023a7d2cc5b3ff51fee";

    // 1. VOCA DB 파서 및 쿼리 엔진
    const _vocaTargetMap = new Map();
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
            examScope: p["시험범위"]?.checkbox || false,
            mastery: p["숙련도"]?.rich_text?.map(t => t.plain_text).join("") || "", // "count|silverDate|lastReviewed"
            areaZone: p["영역 분류"]?.select?.name || "",
            hint: p["초성힌트"]?.rich_text?.[0]?.plain_text || "",
            quiz: p["퀴즈제시"]?.rich_text?.[0]?.plain_text || ""
        };
    }

    function _matchesVocaRecord(record, options) {
        if (!record.word) return false;
        const pid = record.pageId || record.id;
        if (pid && Array.isArray(record.target)) _vocaTargetMap.set(pid, record.target);
        if (options.filterByStudent !== false) {
            let loginName = (options.studentName ?? window.currentUserName ?? "민수").trim();
            if (loginName === '아빠' || loginName === '엄마' || loginName === '어른') {
                const profile = window.currentProfile || localStorage.getItem('currentUser') || 'son';
                loginName = profile === 'daughter' ? '민서' : '민수';
            }
            if (record.target.length > 0 && !record.target.some(t => t.trim() === loginName)) return false;
        }
        if (options.subject) {
            const allowed = [options.subject, ...(options.altSubjects || [])];
            if (!record.subject.some(s => allowed.includes(s))) return false;
        }
        if (options.areaZone && record.areaZone !== options.areaZone) return false;
        return true;
    }

    // 여러 쪽 조회는 정렬을 꼭 건다. 정렬 없이 넘기면 노션이 쪽 경계에서 행을 빠뜨린다
    // (2026-11-17 확인: VOCA_DB 2,106행 중 1행 누락 → 만든 시각 정렬로 전부 수신).
    const STABLE_SORTS = [{ timestamp: "created_time", direction: "ascending" }];

    function _buildVocaQueryBody(options) {
        const body = { page_size: 100, sorts: STABLE_SORTS };
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

        // 1. 캐시 확인. 아이 캐시가 없으면 로비가 받아 둔 오늘의 전체(ALL) 캐시를 그 아이 행만(서버 학생 필터와 같게, 학생 칸 빈 행 제외) 걸러 쓴다 (2026-11-19)
        if (!forceRefresh && typeof window._loadVocaFromCache === 'function') {
            let cachedRecords = window._loadVocaFromCache(cacheTarget, dbId);
            if (!(cachedRecords && cachedRecords.length) && cacheTarget !== 'ALL') {
                cachedRecords = (window._loadVocaFromCache('ALL', dbId) || []).filter(r => Array.isArray(r.target) && r.target.some(t => String(t).trim() === cacheTarget));
            }
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

            // 캐시 저장 — 서버 필터(과목+영역만 받은 결과)는 아이 전체 캐시 자리에 넣지 않는다.
            // 넣으면 같은 날 다른 과목방(영어 등)이 그 일부만 보고 0개가 된다 (2026-11-06 발견).
            if (!queryOptions.useServerFilter && typeof window._saveVocaToCache === 'function') {
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

    // VOCA 행 속성 PATCH 공통: 관리자(아빠·엄마·어른) 시험 및 민서 상급 학년 미리보기(민수 전용)는 노션 쓰기 생략
    async function patchVocaPage(pageId, properties, failLabel) {
        if (!pageId) return false;
        const savedName = localStorage.getItem('currentUserName');
        if (savedName === '아빠' || savedName === '엄마' || savedName === '어른') return true;
        const targets = _vocaTargetMap.get(pageId);
        if (savedName === '민서' && Array.isArray(targets) && targets.length > 0 && !targets.includes('민서') && !targets.includes('공통')) return true;
        try {
            const res = await fetch(`${PROXY_URL}/v1/pages/${pageId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ properties })
            });
            if (!res.ok) throw new Error(await res.text());
            return true;
        } catch (e) {
            console.error(`❌ ${failLabel}:`, e);
            return false;
        }
    }

    function updateVocaMasteryStatus(pageId, isMastered) {
        return patchVocaPage(pageId, { "달성": { checkbox: isMastered } }, "VOCA 달성 상태 업데이트 실패");
    }

    // 숙련도 Pull/Push (퀘스트 러너 전용 notion-voca.js와 같은 계약, 받아쓰기 사다리가 쓴다)
    async function fetchVocaUnitFresh(options = {}) {
        const filters = [];
        if (options.studentName) filters.push({ property: "학생", multi_select: { contains: options.studentName } });
        if (options.subject) filters.push({ property: "과목", multi_select: { contains: options.subject } });
        if (options.unit) filters.push({ property: "단원", rich_text: { contains: String(options.unit) } });
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), options.timeoutMs || 4000);
        let results = [];
        let cursor;
        try {
            do {
                const body = { page_size: 100, sorts: STABLE_SORTS };
                if (filters.length > 0) body.filter = { and: filters };
                if (cursor) body.start_cursor = cursor;
                const res = await fetch(`${PROXY_URL}/v1/databases/${VOCA_DB_ID}/query`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                    signal: controller.signal
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
            clearTimeout(timer);
        }
    }

    function updateVocaMasteryProgress(pageId, masteryText, isAchieved = null) {
        const properties = { "숙련도": { rich_text: [{ text: { content: String(masteryText) } }] } };
        if (isAchieved === true || isAchieved === false) properties["달성"] = { checkbox: isAchieved };
        return patchVocaPage(pageId, properties, "VOCA 숙련도 업데이트 실패");
    }

    // ----------------------------------------------------
    // 2. 도서관 & 독해 DB 쿼리 및 파서
    // ----------------------------------------------------
    const MAX_READING_PASSAGES = 10;

    async function fetchLibraryBooksFromNotion(options = {}) {
        const forceRefresh = options.forceRefresh === true;
        const todayStr = getKstTodayYMD();
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
        const includeAllStudents = options.includeAllStudents === true;
        const cacheStudentKey = includeAllStudents ? 'ALL' : targetStudent;
        const forceRefresh = options.forceRefresh === true;

        if (!forceRefresh && typeof window._loadReadingFromCache === 'function') {
            const cached = window._loadReadingFromCache(subject, track, cacheStudentKey);
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
                page_size: options.pageSize || 100
            };

            // 한 쪽을 넘어도 빠지지 않게 끝까지 이어 읽는다 (50편에서 잘려 뒤 순번 지문이 안 보이던 문제, 2026-11-15)
            const results = [];
            for (let cursor = null, pageNo = 0; pageNo < 20; pageNo++) {
                const response = await fetch(`${PROXY_URL}/v1/databases/${LIBRARY_DB_ID}/query`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cursor ? { ...queryBody, start_cursor: cursor } : queryBody)
                });
                if (!response.ok) throw new Error(`독해 DB 조회 실패 (HTTP ${response.status})`);
                const data = await response.json();
                results.push(...(data.results || []));
                cursor = data.has_more ? data.next_cursor : null;
                if (!cursor) break;
            }

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
                    // 지문 대표 그림(민서 미니 독해: 스토리북 장면) · 없으면 null → 화면은 글만 표시
                    imageUrl: p["이미지 URL"]?.url || null,
                    // (예정) 줄마다 바뀌는 그림: '줄별 이미지' rich_text에 지문 줄 순서대로 URL JSON 배열
                    lineImages: (() => {
                        const raw = (p["줄별 이미지"]?.rich_text || []).map(t => t.plain_text).join("");
                        try { const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch (e) { return []; }
                    })(),
                    questions: Array.isArray(questions) ? questions : [],
                    grade: (p["학년"]?.multi_select || []).map(m => m.name).join(", "),
                    student: (p["학생"]?.multi_select || []).map(m => m.name)
                };
            }));

            const finalPassages = parsedPassages.filter(item => {
                if (includeAllStudents || !item.student || item.student.length === 0) return true;
                return item.student.includes(targetStudent);
            });

            if (typeof window._saveReadingToCache === 'function') {
                window._saveReadingToCache(subject, track, cacheStudentKey, finalPassages);
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
        fetchVocaUnitFresh,
        updateVocaMasteryProgress,
        fetchLibraryBooksFromNotion,
        fetchReadingPassagesFromNotion,
        mapNotionRecordsToReadingBooks,
        resolveReadingPassageList,
        extractPlainTextFromNotionBlock,
        fetchNotionBlockChildrenPlainText,
        collectPlainTextFromNotionBlock,
        fetchNotionPageBlocksPlainText
    };

    // 기존 단독 전역 바인딩 보존
    window.parseVocaPage = parseVocaPage;
    window._matchesVocaRecord = _matchesVocaRecord;
    window._buildVocaQueryBody = _buildVocaQueryBody;
    window.fetchVocaFromNotion = fetchVocaFromNotion;
    window.updateVocaMasteryStatus = updateVocaMasteryStatus;
    window.fetchVocaUnitFresh = fetchVocaUnitFresh;
    window.updateVocaMasteryProgress = updateVocaMasteryProgress;
    window.fetchLibraryBooksFromNotion = fetchLibraryBooksFromNotion;
    window.fetchReadingPassagesFromNotion = fetchReadingPassagesFromNotion;
    window.mapNotionRecordsToReadingBooks = mapNotionRecordsToReadingBooks;
    window.resolveReadingPassageList = resolveReadingPassageList;
    window.MAX_READING_PASSAGES = MAX_READING_PASSAGES;

})(typeof window !== 'undefined' ? window : this);
