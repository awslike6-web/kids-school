/**
 * ==============================================================================
 * 🏛️ [Gallery Data & Sync Engine] 갤러리 데이터 및 노션 실시간 동기화 모듈 (gallery-data-sync.js)
 * ==============================================================================
 * 역할 및 구성:
 * 1. 로컬 스토리지 데이터 관리 (성장 작품 & 특별한 날 추억)
 * 2. 카테고리 정의 및 아이콘 자동 매핑 유틸
 * 3. 커스텀 메타 / 작가의 한마디 영구 보존
 * 4. Cloudflare Worker 프록시 기반 노션 데이터베이스 실시간 양방향 동기화
 * 5. 영구 수정 이력(Audit Trail) 콜아웃 블록 생성
 * ==============================================================================
 */

// ========================================================
// 🏛️ 스토리지 키 및 전역 상수 정의
// ========================================================
const STORAGE_KEY = 'MY_STUDY_ROOM_GALLERY_DATA';
const STORAGE_VERSION_KEY = 'MY_STUDY_ROOM_GALLERY_VER';
const CURRENT_STORAGE_VER = 'v20260907_clean';
const SPECIAL_STORAGE_KEY = 'MY_STUDY_ROOM_SPECIAL_DAYS_DATA';
const SPECIAL_META_KEY = 'SPECIAL_DAYS_CUSTOM_META';
const CUSTOM_NOTES_KEY = 'GALLERY_CUSTOM_ARTIST_NOTES';
const CUSTOM_META_KEY = 'GALLERY_CUSTOM_META';

// 🏷️ 표준 카테고리 정의
const ART_CATEGORIES = [
    { key: 'all', label: '전체 카테고리', icon: '🎨' },
    { key: '그림/미술', label: '그림/미술', icon: '🎨' },
    { key: '만들기/공예', label: '만들기/공예', icon: '✂️' },
    { key: '종이접기/디자인', label: '종이접기/디자인', icon: '📐' },
    { key: '상장/기념', label: '상장/기념', icon: '🏆' },
    { key: '탐구/프로젝트', label: '탐구/프로젝트', icon: '🔬' }
];

const SPECIAL_CATEGORIES = [
    { key: 'all', label: '전체 추억', icon: '🌟' },
    { key: '가족/생일파티', label: '가족/생일파티', icon: '🎂' },
    { key: '생태/텃밭/체험', label: '생태/텃밭/체험', icon: '🌱' },
    { key: '소풍/현장학습', label: '소풍/현장학습', icon: '🍁' },
    { key: '학교행사/운동회', label: '학교행사/운동회', icon: '🎒' },
    { key: '사계절 자연관찰', label: '사계절 자연관찰', icon: '🌿' },
    { key: '소중한 하루', label: '소중한 하루', icon: '⭐' }
];

// 전역 공유 데이터 홀더
window.galleryData = window.galleryData || [];
window.specialDaysData = window.specialDaysData || [];

function getCategoryIcon(catName) {
    if (!catName) return "🎨";
    // 작품 분류 아이콘
    if (catName.includes("만들기") || catName.includes("공예")) return "✂️";
    if (catName.includes("종이접기") || catName.includes("디자인")) return "📐";
    if (catName.includes("상장") || catName.includes("기념") || catName.includes("수상")) return "🏆";
    if (catName.includes("탐구") || catName.includes("프로젝트") || catName.includes("연구")) return "🔬";
    if (catName.includes("그림") || catName.includes("미술")) return "🎨";
    // 특별한 날 분류 아이콘
    if (catName.includes("생일") || catName.includes("파티")) return "🎂";
    if (catName.includes("텃밭") || catName.includes("생태") || catName.includes("체험")) return "🌱";
    if (catName.includes("소풍") || catName.includes("현장학습")) return "🍁";
    if (catName.includes("학교") || catName.includes("운동회")) return "🎒";
    if (catName.includes("자연") || catName.includes("사계절")) return "🌿";
    if (catName.includes("소중한") || catName.includes("하루")) return "⭐";
    return "🌟";
}

function getCustomArtistNotes() {
    try {
        const raw = localStorage.getItem(CUSTOM_NOTES_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function setCustomArtistNote(artId, note) {
    try {
        const notes = getCustomArtistNotes();
        notes[artId] = note;
        localStorage.setItem(CUSTOM_NOTES_KEY, JSON.stringify(notes));
    } catch (e) {
        console.error("작가의 한마디 로컬 저장 오류:", e);
    }
}

function getCustomMetaMap() {
    try {
        const raw = localStorage.getItem(CUSTOM_META_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function setCustomMeta(artId, metaObj) {
    try {
        const map = getCustomMetaMap();
        map[artId] = { ...(map[artId] || {}), ...metaObj };
        localStorage.setItem(CUSTOM_META_KEY, JSON.stringify(map));
    } catch (e) {
        console.error("작품 커스텀 메타 로컬 저장 오류:", e);
    }
}

function getCustomSpecialMetaMap() {
    try {
        const raw = localStorage.getItem(SPECIAL_META_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function setCustomSpecialMeta(id, metaObj) {
    try {
        const map = getCustomSpecialMetaMap();
        map[id] = { ...(map[id] || {}), ...metaObj };
        localStorage.setItem(SPECIAL_META_KEY, JSON.stringify(map));
    } catch (e) {
        console.error("특별한 날 커스텀 메타 로컬 저장 오류:", e);
    }
}

// 📦 갤러리 작품 데이터 로드
function loadGalleryData() {
    const savedVer = localStorage.getItem(STORAGE_VERSION_KEY);
    if (savedVer !== CURRENT_STORAGE_VER) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VER);
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    let customItems = [];
    let savedLikesMap = {};
    let savedStickersMap = {};
    let savedCommentsMap = {};
    const customNotes = getCustomArtistNotes();
    const customMeta = getCustomMetaMap();

    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            parsed.forEach(it => {
                if (it.id && it.id.startsWith('art_custom_')) {
                    if (customMeta[it.id]) {
                        Object.assign(it, customMeta[it.id]);
                    }
                    customItems.push(it);
                } else if (it.id) {
                    if (it.likes) savedLikesMap[it.id] = it.likes;
                    if (it.stickers) savedStickersMap[it.id] = it.stickers;
                    if (it.comments) savedCommentsMap[it.id] = it.comments;
                }
            });
        } catch (e) {
            console.error("갤러리 데이터 파싱 오류:", e);
        }
    }

    const masterList = (typeof DEFAULT_GALLERY_DATA !== 'undefined' ? DEFAULT_GALLERY_DATA : []).map(item => {
        const copy = { ...item };
        if (savedLikesMap[item.id]) copy.likes = savedLikesMap[item.id];
        if (savedStickersMap[item.id]) copy.stickers = savedStickersMap[item.id];
        if (savedCommentsMap[item.id]) copy.comments = savedCommentsMap[item.id];
        if (customNotes[item.id]) copy.artistNote = customNotes[item.id];

        if (customMeta[item.id]) {
            if (customMeta[item.id].title) copy.title = customMeta[item.id].title;
            if (customMeta[item.id].category) {
                copy.category = customMeta[item.id].category;
                copy.categoryIcon = customMeta[item.id].categoryIcon || getCategoryIcon(copy.category);
            }
            if (customMeta[item.id].date) copy.date = customMeta[item.id].date;
            if (customMeta[item.id].artistNote) copy.artistNote = customMeta[item.id].artistNote;
        }
        return copy;
    });

    window.galleryData = [...masterList, ...customItems];
    saveGalleryData();
}

function saveGalleryData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.galleryData));
}

// 🌟 특별한 날 추억 데이터 로드
function loadSpecialDaysData() {
    const customSpecialMeta = getCustomSpecialMetaMap();
    const saved = localStorage.getItem(SPECIAL_STORAGE_KEY);
    let customEvents = [];
    let savedLikesMap = {};
    let savedStickersMap = {};
    let savedCommentsMap = {};

    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            parsed.forEach(it => {
                if (it.id && it.id.startsWith('evt_custom_')) {
                    if (customSpecialMeta[it.id]) {
                        Object.assign(it, customSpecialMeta[it.id]);
                    }
                    customEvents.push(it);
                } else if (it.id) {
                    if (it.likes) savedLikesMap[it.id] = it.likes;
                    if (it.stickers) savedStickersMap[it.id] = it.stickers;
                    if (it.comments) savedCommentsMap[it.id] = it.comments;
                }
            });
        } catch (e) {
            console.error("특별한 날 데이터 파싱 오류:", e);
        }
    }

    const masterList = (typeof DEFAULT_SPECIAL_DAYS_DATA !== 'undefined' ? DEFAULT_SPECIAL_DAYS_DATA : []).map(item => {
        const copy = { ...item };
        if (savedLikesMap[item.id]) copy.likes = savedLikesMap[item.id];
        if (savedStickersMap[item.id]) copy.stickers = savedStickersMap[item.id];
        if (savedCommentsMap[item.id]) copy.comments = savedCommentsMap[item.id];

        if (customSpecialMeta[item.id]) {
            if (customSpecialMeta[item.id].title) copy.title = customSpecialMeta[item.id].title;
            if (customSpecialMeta[item.id].category) {
                copy.category = customSpecialMeta[item.id].category;
                copy.categoryIcon = customSpecialMeta[item.id].categoryIcon || getCategoryIcon(copy.category);
            }
            if (customSpecialMeta[item.id].date) copy.date = customSpecialMeta[item.id].date;
            if (customSpecialMeta[item.id].desc) copy.desc = customSpecialMeta[item.id].desc;
            if (customSpecialMeta[item.id].videoUrl !== undefined) copy.videoUrl = customSpecialMeta[item.id].videoUrl;
        }
        return copy;
    });

    window.specialDaysData = [...masterList, ...customEvents];
    saveSpecialDaysData();
}

function saveSpecialDaysData() {
    localStorage.setItem(SPECIAL_STORAGE_KEY, JSON.stringify(window.specialDaysData));
}

// ========================================================
// 📡 노션 데이터베이스 실시간 양방향 동기화 & 수정 이력 모듈
// ========================================================
const NOTION_PROXY = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) || "https://minmin-notion.awslike6.workers.dev";
const NOTION_HEADERS = { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" };
let notionPageIdMap = {}; // item.id -> notionPageId 캐시

// 🕒 노션 페이지 내 영구 수정 이력(Audit Trail) 콜아웃 블록 적재
async function appendRevisionHistoryToNotion(pageId, typeName, oldState, newState) {
    if (!pageId || !oldState || !newState) return;
    try {
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        
        let diffLines = [];
        if (oldState.title && oldState.title !== newState.title) {
            diffLines.push(`• 제목 변경: "${oldState.title}" ➔ "${newState.title}"`);
        }
        if (oldState.date && oldState.date !== newState.date) {
            diffLines.push(`• 날짜 변경: "${oldState.date}" ➔ "${newState.date}"`);
        }
        if (oldState.category && oldState.category !== newState.category) {
            diffLines.push(`• 분야 변경: "${oldState.category}" ➔ "${newState.category}"`);
        }
        if (oldState.desc !== undefined && oldState.desc !== newState.desc) {
            const previewOld = oldState.desc.length > 120 ? oldState.desc.substring(0, 120) + '...' : oldState.desc;
            diffLines.push(`• 이전 내용 백업: "${previewOld}"`);
        }
        if (oldState.videoUrl !== undefined && oldState.videoUrl !== newState.videoUrl) {
            diffLines.push(`• 동영상 링크: "${oldState.videoUrl || '(없음)'}" ➔ "${newState.videoUrl || '(없음)'}"`);
        }

        if (diffLines.length === 0) return;

        const auditContent = `[🕒 웹 ${typeName} 수정 이력: ${timestamp}]\n` + diffLines.join('\n');

        await fetch(`${NOTION_PROXY}/v1/blocks/${pageId}/children`, {
            method: 'PATCH',
            headers: NOTION_HEADERS,
            body: JSON.stringify({
                children: [
                    {
                        object: "block",
                        type: "callout",
                        callout: {
                            icon: { type: "emoji", emoji: "🕒" },
                            color: "gray_background",
                            rich_text: [{
                                type: "text",
                                text: { content: auditContent }
                            }]
                        }
                    }
                ]
            })
        });
    } catch (e) {
        console.warn("[노션 수정 이력 기록 실패]", e);
    }
}

// 1. 노션에서 전체 갤러리/특별한 날 데이터 백그라운드 동기화
async function syncFromNotionGallery() {
    const dbId = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.GALLERY_DB_ID);
    if (!dbId) return;

    try {
        const res = await fetch(`${NOTION_PROXY}/v1/databases/${dbId}/query`, {
            method: 'POST',
            headers: NOTION_HEADERS,
            body: JSON.stringify({ page_size: 100 })
        });
        if (!res.ok) return;
        const data = await res.json();
        const pages = data.results || [];
        let hasArtChanges = false;
        let hasSpecialChanges = false;

        pages.forEach(p => {
            const props = p.properties;
            const titleProp = props["식별ID"] || props["작품ID"] || props["ID"] || props["title"];
            const itemId = titleProp?.title?.[0]?.plain_text;
            if (!itemId) return;

            notionPageIdMap[itemId] = p.id;
            const typeProp = props["구분"]?.select?.name;
            const isSpecialItem = typeProp === "특별한 날" || itemId.startsWith("evt_");

            if (isSpecialItem) {
                const item = window.specialDaysData.find(s => s.id === itemId);
                if (item) {
                    const remoteTitle = props["제목"]?.rich_text?.[0]?.plain_text;
                    if (remoteTitle && remoteTitle !== item.title) {
                        item.title = remoteTitle;
                        setCustomSpecialMeta(itemId, { title: remoteTitle });
                        hasSpecialChanges = true;
                    }
                    const remoteDate = props["날짜"]?.date?.start;
                    if (remoteDate && remoteDate !== item.date) {
                        item.date = remoteDate;
                        setCustomSpecialMeta(itemId, { date: remoteDate });
                        hasSpecialChanges = true;
                    }
                    const remoteCat = props["분야"]?.select?.name;
                    if (remoteCat && remoteCat !== item.category) {
                        item.category = remoteCat;
                        item.categoryIcon = getCategoryIcon(remoteCat);
                        setCustomSpecialMeta(itemId, { category: remoteCat, categoryIcon: item.categoryIcon });
                        hasSpecialChanges = true;
                    }
                    const noteProp = props["작가의 한마디/일기본문"] || props["작가의 한마디"];
                    const remoteNote = noteProp?.rich_text?.[0]?.plain_text;
                    if (remoteNote && remoteNote !== item.desc) {
                        item.desc = remoteNote;
                        setCustomSpecialMeta(itemId, { desc: remoteNote });
                        hasSpecialChanges = true;
                    }
                }
            } else {
                const art = window.galleryData.find(a => a.id === itemId);
                if (!art) return;

                const remoteTitle = props["제목"]?.rich_text?.[0]?.plain_text;
                if (remoteTitle && remoteTitle !== art.title) {
                    art.title = remoteTitle;
                    setCustomMeta(itemId, { title: remoteTitle });
                    hasArtChanges = true;
                }

                const remoteDate = props["날짜"]?.date?.start;
                if (remoteDate && remoteDate !== art.date) {
                    art.date = remoteDate;
                    setCustomMeta(itemId, { date: remoteDate });
                    hasArtChanges = true;
                }

                const remoteCat = props["분야"]?.select?.name;
                if (remoteCat && remoteCat !== art.category) {
                    art.category = remoteCat;
                    art.categoryIcon = getCategoryIcon(remoteCat);
                    setCustomMeta(itemId, { category: remoteCat, categoryIcon: art.categoryIcon });
                    hasArtChanges = true;
                }

                const noteProp = props["작가의 한마디/일기본문"] || props["작가의 한마디"];
                const remoteNote = noteProp?.rich_text?.[0]?.plain_text;
                if (remoteNote && remoteNote !== art.artistNote) {
                    art.artistNote = remoteNote;
                    setCustomArtistNote(itemId, remoteNote);
                    setCustomMeta(itemId, { artistNote: remoteNote });
                    hasArtChanges = true;
                }
            }
        });

        if (hasArtChanges) {
            saveGalleryData();
            if (typeof renderGallery === 'function') renderGallery();
            if (typeof updateStats === 'function') updateStats();
        }
        if (hasSpecialChanges) {
            saveSpecialDaysData();
            if (typeof renderGallery === 'function') renderGallery();
            if (typeof updateStats === 'function') updateStats();
        }
    } catch (e) {
        console.warn("[노션 갤러리 동기화 실패]", e);
    }
}

// 2. 작품 메타 노션 실시간 저장
async function syncArtworkToNotion(art, oldState) {
    const dbId = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.GALLERY_DB_ID);
    if (!dbId || !art) return;

    try {
        let pageId = notionPageIdMap[art.id];
        if (!pageId) {
            const queryRes = await fetch(`${NOTION_PROXY}/v1/databases/${dbId}/query`, {
                method: 'POST',
                headers: NOTION_HEADERS,
                body: JSON.stringify({
                    filter: { property: "식별ID", title: { equals: art.id } }
                })
            });
            if (queryRes.ok) {
                const qData = await queryRes.json();
                if (qData.results && qData.results.length > 0) {
                    pageId = qData.results[0].id;
                    notionPageIdMap[art.id] = pageId;
                }
            }
        }

        const updateProps = {
            "제목": { rich_text: [{ type: "text", text: { content: art.title } }] },
            "날짜": { date: { start: art.date } },
            "분야": { select: { name: art.category } },
            "작가의 한마디/일기본문": { rich_text: [{ type: "text", text: { content: art.artistNote || '' } }] }
        };

        if (pageId) {
            await fetch(`${NOTION_PROXY}/v1/pages/${pageId}`, {
                method: 'PATCH',
                headers: NOTION_HEADERS,
                body: JSON.stringify({ properties: updateProps })
            });
            if (oldState) {
                await appendRevisionHistoryToNotion(pageId, "작품", oldState, {
                    title: art.title,
                    date: art.date,
                    category: art.category,
                    desc: art.artistNote
                });
            }
        }
    } catch (e) {
        console.warn("[노션 작품 저장 실패]", e);
    }
}

// 3. 특별한 날 메타 노션 실시간 저장
async function syncSpecialDayToNotion(specialItem, oldState) {
    const dbId = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.GALLERY_DB_ID);
    if (!dbId || !specialItem) return;

    try {
        let pageId = notionPageIdMap[specialItem.id];
        if (!pageId) {
            const queryRes = await fetch(`${NOTION_PROXY}/v1/databases/${dbId}/query`, {
                method: 'POST',
                headers: NOTION_HEADERS,
                body: JSON.stringify({
                    filter: { property: "식별ID", title: { equals: specialItem.id } }
                })
            });
            if (queryRes.ok) {
                const qData = await queryRes.json();
                if (qData.results && qData.results.length > 0) {
                    pageId = qData.results[0].id;
                    notionPageIdMap[specialItem.id] = pageId;
                }
            }
        }

        const updateProps = {
            "제목": { rich_text: [{ type: "text", text: { content: specialItem.title } }] },
            "날짜": { date: { start: specialItem.date } },
            "분야": { select: { name: specialItem.category } },
            "작가의 한마디/일기본문": { rich_text: [{ type: "text", text: { content: specialItem.desc || '' } }] }
        };

        if (specialItem.videoUrl) {
            updateProps["동영상링크"] = { url: specialItem.videoUrl };
        }

        if (pageId) {
            await fetch(`${NOTION_PROXY}/v1/pages/${pageId}`, {
                method: 'PATCH',
                headers: NOTION_HEADERS,
                body: JSON.stringify({ properties: updateProps })
            });
            if (oldState) {
                await appendRevisionHistoryToNotion(pageId, "특별한 날", oldState, {
                    title: specialItem.title,
                    date: specialItem.date,
                    category: specialItem.category,
                    desc: specialItem.desc,
                    videoUrl: specialItem.videoUrl
                });
            }
        }
    } catch (e) {
        console.warn("[노션 특별한 날 저장 실패]", e);
    }
}

// 4. 작가의 한마디 단독 수정 동기화
async function syncNoteToNotion(art) {
    await syncArtworkToNotion(art);
}

// 5. 스티커 반응 동기화
async function syncStickerToNotion(item, type) {
    const dbId = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.GALLERY_DB_ID);
    if (!dbId || !item) return;
    try {
        const pageId = notionPageIdMap[item.id];
        if (pageId) {
            await fetch(`${NOTION_PROXY}/v1/pages/${pageId}`, {
                method: 'PATCH',
                headers: NOTION_HEADERS,
                body: JSON.stringify({
                    properties: {
                        "좋아요수": { number: item.likes || 0 }
                    }
                })
            });
        }
    } catch(e) {}
}

// 6. 칭찬 댓글 동기화
async function syncCommentToNotion(item, newComment) {
    const dbId = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.GALLERY_DB_ID);
    if (!dbId || !item || !newComment) return;
    try {
        const pageId = notionPageIdMap[item.id];
        if (pageId) {
            await fetch(`${NOTION_PROXY}/v1/blocks/${pageId}/children`, {
                method: 'PATCH',
                headers: NOTION_HEADERS,
                body: JSON.stringify({
                    children: [
                        {
                            object: "block",
                            type: "paragraph",
                            paragraph: {
                                rich_text: [
                                    { type: "text", text: { content: `💬 [${newComment.author}] ${newComment.text} (${newComment.date})` } }
                                ]
                            }
                        }
                    ]
                })
            });
        }
    } catch(e) {}
}
