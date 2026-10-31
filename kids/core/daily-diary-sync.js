// kids/core/daily-diary-sync.js - daily-diary.js 분리 3/4: 노션 조회·파서·캐시 병합·동기화 (순서대로 로드)
// 4-3. 노션 일기 페이지 -> 앱 일기 객체 역변환 파서 (신규 감성DB & 구 학습일지DB 100% 듀얼 호환)
function parseNotionDiaryPage(page, targetChild) {
    if (!page || !page.properties) return null;
    const props = page.properties;

    // 🛡️ [카테고리 런타임 게이트] 신규 감성DB의 '구분' 속성이 있는 경우 일기류('마음일기', '일기', '종이일기')만 통과
    const gubun = props["구분"]?.select?.name;
    if (gubun && gubun !== '마음일기' && gubun !== '일기' && gubun !== '종이일기') {
        // '특별한 날', '작품', '상장' 등 일기가 아닌 항목은 일기장 파서에서 원천 차단
        return null;
    }

    // 1) 학생/주인공 식별 (신규 '주인공' 우선, 구 '학생' 폴백)
    const student = props["주인공"]?.select?.name || props["학생"]?.select?.name || '';
    const title = props["식별ID"]?.title?.[0]?.text?.content || props["ID"]?.title?.[0]?.text?.content || '';

    // 🛡️ 식별ID나 제목에 '특별한 날', '작품', 'evt_', 'art_'가 포함되어 있다면 원천 차단
    if (title.includes('[특별한 날]') || title.includes('[작품]') || title.startsWith('evt_') || title.startsWith('art_')) {
        return null;
    }

    let matchedChild = student;
    if (student === '부모관리자' || student === '공동') {
        if (title.includes('아빠')) matchedChild = '아빠';
        else if (title.includes('엄마')) matchedChild = '엄마';
        else if (title.includes('민서')) matchedChild = '민서';
        else if (title.includes('민수')) matchedChild = '민수';
        else matchedChild = targetChild;
    }

    if (matchedChild !== targetChild && student !== targetChild) {
        return null;
    }

    // 2) 날짜 및 시간 파싱 (신규 '날짜' 우선, 구 '입장' 폴백)
    let dateStr = "";
    let timeStr = "";
    const entryDate = props["날짜"]?.date?.start || props["입장"]?.date?.start;
    if (entryDate) {
        const d = new Date(entryDate);
        dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        // 시간 텍스트 추출 (title의 괄호 시간 우선, 없으면 Date 객체)
        const timeMatch = title.match(/\(([^)]+)\)/);
        if (timeMatch && (timeMatch[1].includes('오전') || timeMatch[1].includes('오후') || timeMatch[1].includes(':'))) {
            timeStr = timeMatch[1];
        } else {
            timeStr = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        }
    } else {
        const match = title.match(/(\d{4}[-.\s]+\d{1,2}[-.\s]+\d{1,2})/);
        dateStr = match ? match[1].replace(/\s+/g, '').replace(/\./g, '-') : getKstTodayYMD();
        timeStr = '기록';
    }

    // 3) 신규 DB 속성 vs 구 DB 속성 듀얼 파싱
    const bodyProp = props["작가의 한마디/일기본문"]?.rich_text?.[0]?.text?.content || "";
    const titleProp = props["제목"]?.rich_text?.[0]?.text?.content || "";
    const moodProp = props["감정날씨"]?.rich_text?.[0]?.text?.content || "";
    const reportProp = props["오답리포트"]?.rich_text?.[0]?.text?.content || "";
    const iMessageProp = props["나-전달법"]?.rich_text?.[0]?.text?.content || "";

    let weatherOrEnergy = "";
    let moods = [];
    let content = "";
    let accomplish = "";
    let iMessage = "";
    let goal = "";

    if (bodyProp) {
        // [신규 DB 파싱] '작가의 한마디/일기본문' 및 '제목'에서 추출
        let rawBody = bodyProp;

        // 감정/날씨 추출 (중첩 대괄호 완벽 대응)
        if (rawBody.startsWith('[날씨/감정:')) {
            const firstLineEnd = rawBody.indexOf('\n');
            const firstLine = firstLineEnd !== -1 ? rawBody.substring(0, firstLineEnd) : rawBody;
            weatherOrEnergy = firstLine.replace(/^\[날씨\/감정:\s*/, '').replace(/\]\s*$/, '').trim();
            rawBody = firstLineEnd !== -1 ? rawBody.substring(firstLineEnd + 1).trim() : '';
        } else if (rawBody.startsWith('[오늘의 기분:')) {
            const firstLineEnd = rawBody.indexOf('\n');
            const firstLine = firstLineEnd !== -1 ? rawBody.substring(0, firstLineEnd) : rawBody;
            weatherOrEnergy = firstLine.replace(/^\[오늘의 기분:\s*/, '').replace(/\]\s*$/, '').trim();
            rawBody = firstLineEnd !== -1 ? rawBody.substring(firstLineEnd + 1).trim() : '';
        } else if (titleProp && !titleProp.includes('오늘의') && !titleProp.includes('마음일기')) {
            weatherOrEnergy = titleProp.trim();
        }

        // 대괄호 감정 태그 분리 (예: [🎈 신나요, 🎈 설레어요])
        if (weatherOrEnergy.includes('[') && weatherOrEnergy.includes(']')) {
            const bMatch = weatherOrEnergy.match(/\[([^\]]+)\]/);
            if (bMatch) {
                moods = bMatch[1].split(',').map(m => m.trim());
                weatherOrEnergy = weatherOrEnergy.replace(/\[[^\]]+\]/, '').trim();
            }
        }

        // 나-전달법 / 다짐 추출
        if (rawBody.includes('[나-전달법]:')) {
            const parts = rawBody.split('[나-전달법]:');
            iMessage = parts[1]?.trim() || '';
            rawBody = parts[0]?.trim() || '';
        } else if (rawBody.includes('[나에게 한마디]:')) {
            const parts = rawBody.split('[나에게 한마디]:');
            goal = parts[1]?.trim() || '';
            iMessage = goal;
            rawBody = parts[0]?.trim() || '';
        } else if (rawBody.includes('[다짐/한마디]:')) {
            const parts = rawBody.split('[다짐/한마디]:');
            goal = parts[1]?.trim() || '';
            iMessage = goal;
            rawBody = parts[0]?.trim() || '';
        }

        if (matchedChild === '민서' || matchedChild === '아빠' || matchedChild === '엄마') {
            content = rawBody.trim();
        } else {
            accomplish = rawBody.trim();
            goal = goal || iMessage;
        }
    } else if (moodProp || reportProp) {
        // [구 DB 파싱 - 레거시 호환]
        weatherOrEnergy = moodProp;
        if (moodProp.includes('[') && moodProp.includes(']')) {
            const bMatch = moodProp.match(/\[([^\]]+)\]/);
            if (bMatch) {
                moods = bMatch[1].split(',').map(m => m.trim());
                weatherOrEnergy = moodProp.replace(/\[[^\]]+\]/, '').trim();
            }
        }

        if (reportProp.includes('[감정:')) {
            const moodMatch = reportProp.match(/\[감정:\s*([^\]]+)\]/);
            if (moodMatch) {
                moods = moodMatch[1].split(',').map(s => s.trim());
            }
        }

        if (reportProp.includes('/ 나-전달법:')) {
            const parts = reportProp.split('/ 나-전달법:');
            iMessage = parts[1]?.trim() || '';
            content = parts[0]?.replace(/\[감정:[^\]]+\]/, '').trim();
        } else if (reportProp.includes('[이야기:') && reportProp.includes('[나에게 한마디:')) {
            const m1 = reportProp.match(/\[이야기:\s*([^\]]+)\]/);
            const m2 = reportProp.match(/\[나에게 한마디:\s*([^\]]+)\]/);
            accomplish = m1 ? m1[1] : '';
            goal = m2 ? m2[1] : '';
        } else {
            if (matchedChild === '민서' || matchedChild === '아빠' || matchedChild === '엄마') {
                content = reportProp.replace(/\[감정:[^\]]+\]/, '').trim();
            } else {
                accomplish = reportProp.replace(/\[감정:[^\]]+\]/, '').trim();
            }
        }

        iMessage = iMessage || iMessageProp;
        goal = goal || (matchedChild === '민수' ? iMessageProp : "");

        const subj = props["과목"]?.rich_text?.[0]?.text?.content || '';
        const weatherMatch = subj.match(/\(([^)]+)\)/);
        if (weatherMatch && !weatherOrEnergy) {
            weatherOrEnergy = weatherMatch[1];
        }
    }

    return {
        id: page.id,
        notionPageId: page.id,
        category: gubun || (matchedChild === '민서' ? '마음일기' : '일기'),
        childName: matchedChild,
        isParentEntry: (student === '부모관리자'),
        date: dateStr,
        timeStr: timeStr,
        weather: (matchedChild === '민서') ? (weatherOrEnergy || '☀️ 맑음') : undefined,
        energy: (matchedChild === '민수') ? (weatherOrEnergy || '😎 꿀잼·대만족') : undefined,
        moods: moods,
        content: content,
        accomplish: accomplish,
        iMessage: iMessage,
        goal: goal,
        createdAt: entryDate || new Date().toISOString(),
        isNotionSynced: true
    };
}

// 4-4. 노션 성장 갤러리 & 마음일기 DB에서 해당 학생 일기 원격 조회 (구 DB 안전 자동 폴백 탑재)
async function fetchNotionDiaries(childName) {
    const proxyUrl = typeof PROXY_URL !== 'undefined' ? PROXY_URL : (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev");
    const diaryDbId = typeof DIARY_DB_ID !== 'undefined' ? DIARY_DB_ID : (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DIARY_DB_ID ? APP_CONFIG.DIARY_DB_ID : "3dfa27115b688010a85be385f91d64ee");
    const oldStudyDbId = typeof STUDY_LOG_DB_ID !== 'undefined' ? STUDY_LOG_DB_ID : "37aa27115b688001b2ffe5e6c8f82ab2";
    // 부모 일기는 '부모관리자'로 저장되고 제목으로 아빠·엄마를 구분한다.
    // 노션은 없는 선택지('아빠' 등)가 조건에 하나라도 있으면 조회 전체를 400으로 거부하므로 아이 이름일 때만 넣는다.
    const isParentAuthor = childName === '아빠' || childName === '엄마';
    // 🛡️ 특별한 날·작품은 아래 '구분' 조건이 막는다. 아이 일기장에도 '부모관리자'는 남겨 두는데,
    // 부모 모드에서 아이 일기를 대신 쓰면 주인공이 '부모관리자'(제목에 아이 이름)로 저장되기 때문이다.
    // 빠지면 그 일기가 조회되지 않고, 동기화 정리(prune) 때 캐시에서까지 지워진다.
    const heroOptions = isParentAuthor ? ["부모관리자", "공동"] : [childName, "부모관리자"];
    const legacyStudentOptions = isParentAuthor ? ["부모관리자"] : [childName, "부모관리자"];

    // 1차: 신규 감성/일기 전용 DB(3dfa...) 쿼리 (🚨 '특별한 날', '작품' 등 비일기 카테고리 완전 배제)
    const queryBody = {
        filter: {
            and: [
                {
                    or: [
                        { property: "구분", select: { equals: "마음일기" } },
                        { property: "구분", select: { equals: "일기" } },
                        { property: "구분", select: { equals: "종이일기" } }
                    ]
                },
                {
                    or: heroOptions.map(name => ({ property: "주인공", select: { equals: name } }))
                }
            ]
        },
        sorts: [
            { property: "날짜", direction: "descending" }
        ],
        page_size: 100
    };

    try {
        const resp = await fetch(`${proxyUrl}/v1/databases/${diaryDbId}/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
            body: JSON.stringify(queryBody)
        });
        if (resp.ok) {
            const data = await resp.json();
            const pages = data.results || [];
            const parsed = pages.map(p => parseNotionDiaryPage(p, childName)).filter(Boolean);
            if (parsed.length > 0) {
                // 신규 DB를 끝까지 다 받았을 때만 캐시 정리(prune) 기준으로 쓴다 (레거시 폴백·다음 페이지가 남은 결과는 제외)
                parsed.isCompleteDiaryDbResult = !data.has_more;
                console.log(`📖 [신규 감성DB] ${childName} 일기 ${parsed.length}건 원격 조회 성공!`);
                return parsed;
            }
        }
    } catch (e) {
        console.warn("신규 노션 일기 DB 조회 중 통신 오류:", e);
    }

    // 2차: 안전 폴백 - 구 학습일지 DB(37aa...) 레거시 쿼리
    console.log(`ℹ️ [레거시 폴백] 신규 DB에 일기가 없어 구 학습일지 DB에서 ${childName} 일기를 조회합니다.`);
    const fallbackQuery = {
        filter: {
            and: [
                {
                    or: [
                        { property: "과목", rich_text: { contains: "일기" } },
                        { property: "과목", rich_text: { contains: "마음일기" } }
                    ]
                },
                {
                    or: legacyStudentOptions.map(name => ({ property: "학생", select: { equals: name } }))
                }
            ]
        },
        sorts: [
            { property: "입장", direction: "descending" }
        ],
        page_size: 50
    };

    try {
        const resp = await fetch(`${proxyUrl}/v1/databases/${oldStudyDbId}/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
            body: JSON.stringify(fallbackQuery)
        });
        if (resp.ok) {
            const data = await resp.json();
            const pages = data.results || [];
            return pages.map(p => parseNotionDiaryPage(p, childName)).filter(Boolean);
        }
    } catch (e) {
        console.warn("구 학습일지 DB 일기 폴백 조회 오류:", e);
    }
    return [];
}

// 4-5. 노션 원격 데이터와 로컬 스토리지 지능형 병합 (Merge)
// 4-5-1. 노션이 단일 원천: 이 아이의 노션 연동 항목 중 이번 전체 조회에 없는 것은 캐시에서 뺀다.
// 예전 코드가 캐시에 넣은 '특별한 날' 같은 비일기 항목과 노션에서 지운 일기가 여기서 정리된다.
// 노션에 아직 안 올라간 로컬 일기와, 방금 저장해 조회에 늦게 잡힐 수 있는 10분 이내 항목은 남긴다.
const DIARY_PRUNE_GRACE_MS = 10 * 60 * 1000;
function pruneStaleNotionEntries(localList, remoteEntries, childName) {
    const remoteIds = new Set(remoteEntries.map(r => r.id));
    const graceCutoff = Date.now() - DIARY_PRUNE_GRACE_MS;
    const kept = localList.filter(item => {
        if (!item || item.childName !== childName) return true;
        const pageId = item.notionPageId || (item.isNotionSynced ? item.id : null);
        if (!pageId || remoteIds.has(pageId)) return true;
        const createdMs = new Date(item.createdAt || item.date).getTime();
        return createdMs > graceCutoff;
    });
    if (kept.length !== localList.length) {
        console.log(`🧹 [일기장 동기화 정리] 노션에 없는 ${childName} 항목 ${localList.length - kept.length}건을 캐시에서 제거했습니다.`);
    }
    return kept;
}

function mergeNotionDiariesIntoLocal(remoteEntries, childName) {
    if (!remoteEntries || remoteEntries.length === 0) return getStoredDiaries();

    // 🛡️ 비일기 항목 필터링 방어선
    const validRemotes = remoteEntries.filter(r => {
        if (!r) return false;
        if (r.category === '특별한 날' || r.category === '작품' || r.category === '상장') return false;
        if (r.id && (String(r.id).startsWith('evt_') || String(r.id).startsWith('art_'))) return false;
        return true;
    });

    const localList = getStoredDiaries();
    const deletedIds = getDeletedDiaryIds();
    const merged = (remoteEntries.isCompleteDiaryDbResult && childName)
        ? pruneStaleNotionEntries(localList, validRemotes, childName)
        : [...localList];

    for (const remote of validRemotes) {
        if (deletedIds.includes(remote.id) || deletedIds.includes(remote.notionPageId)) {
            continue;
        }

        const existingIdx = merged.findIndex(loc => 
            loc.id === remote.id || 
            loc.notionPageId === remote.id ||
            (loc.childName === remote.childName && loc.date === remote.date && loc.content === remote.content) ||
            (loc.childName === remote.childName && loc.date === remote.date && loc.accomplish === remote.accomplish)
        );

        if (existingIdx >= 0) {
            merged[existingIdx] = { 
                ...merged[existingIdx], 
                ...remote, 
                notionPageId: remote.id, 
                isNotionSynced: true 
            };
        } else {
            merged.push(remote);
        }
    }

    // 최신순 정렬
    merged.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());

    localStorage.setItem('mimi_daily_diaries', JSON.stringify(merged));
    return merged;
}

// 4-6. 노션 실시간 동기화 트리거
let isDiarySyncing = false;
async function syncDiariesFromNotion(childName) {
    if (isDiarySyncing) return;
    isDiarySyncing = true;

    const indicator = document.getElementById('diarySyncStatusIndicator');
    if (indicator) {
        indicator.innerHTML = `🔄 노션 동기화 중...`;
        indicator.style.display = 'inline';
    }

    try {
        const remotes = await fetchNotionDiaries(childName);
        if (remotes && remotes.length > 0) {
            mergeNotionDiariesIntoLocal(remotes, childName);
            // 화면 갱신
            const histSec = document.getElementById('diaryHistorySection');
            const { childName: activeChild, isMinsu } = getCurrentDiaryTarget();
            if (histSec && histSec.style.display !== 'none') {
                histSec.innerHTML = renderDiaryHistoryList(activeChild, isMinsu);
            }
            updateLobbyDiaryButton(activeChild);
        }
        if (indicator) {
            indicator.innerHTML = `☁️ 동기화 완료`;
            setTimeout(() => { if (indicator) indicator.style.display = 'none'; }, 3000);
        }
    } catch (e) {
        console.warn("노션 실시간 동기화 오류:", e);
        if (indicator) indicator.style.display = 'none';
    } finally {
        isDiarySyncing = false;
    }
}
