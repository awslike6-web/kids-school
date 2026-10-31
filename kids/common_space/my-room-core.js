
        // ⚠️ INVENTORY_DB_ID / PROXY_URL 은 notion-helper.js 전역과 이름이 같아
        // 여기서 const 로 선언하면 notion-helper 로드가 SyntaxError 로 깨지고 요정 AI가 멈춥니다.
        function getRoomProxyUrl() {
            if (typeof PROXY_URL !== 'undefined') return PROXY_URL;
            if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) return APP_CONFIG.WORKER_PROXY_URL;
            return "https://minmin-notion.awslike6.workers.dev";
        }
        function getRoomInventoryDbId() {
            if (typeof INVENTORY_DB_ID !== 'undefined') return INVENTORY_DB_ID;
            if (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.INVENTORY_DB_ID) return APP_CONFIG.INVENTORY_DB_ID;
            return "374a27115b688042bb61e6a102242e12";
        }
        const IMG_BASE = '../../assets/images/';
        let currentProfile = localStorage.getItem('currentUser') || 'son';
        let currentWealth = 0;
        let currentTicketCount = 0;
        let currentTab = 'shop'; 
        let isDragging = false;
        let activeDragElement = null;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        let dragDidMove = false;
        let selectedFurnitureId = null;
        let fairyChatReady = false;
        let inventoryPageId = null;
        let inventoryPageProps = null;
        let ownedItems = [];
        let placedFurniture = [];
        let unlockedMaps = [];
        let selectedMapId = '';

        // 🗺️ 맵 카탈로그 (defaultUnlocked=true 는 기본 무료)
        // unlockCondition: 조건 충족 시 자동 해금 | 노션 '해금 맵 (텍스트)'에 id 수동 추가도 가능
        const ROOM_MAPS = {
            son: [
                { id: 'map_mchouse', name: '비밀 기지', image: `${IMG_BASE}minsu-bg-mchouse.jpeg`, defaultUnlocked: true },
                { id: 'map_mcforest', name: '숲속 야영지', image: `${IMG_BASE}minsu-bg-mcforest.jpeg`, defaultUnlocked: false, unlockHint: '💎 300개 모으면 자동 해금 (또는 노션에서 수동 해금)', unlockCondition: { type: 'wealth', value: 300 } },
                { id: 'map_mcnight', name: '밤하늘 기지', image: `${IMG_BASE}minsu-bg-mcnight.jpeg`, defaultUnlocked: false, unlockHint: '🎫 소원권 1장 이상이면 자동 해금 (또는 노션에서 수동 해금)', unlockCondition: { type: 'tickets', value: 1 } }
            ],
            daughter: [
                { id: 'map_fruitshop', name: '과일 가게', image: `${IMG_BASE}minseo-bg-fruitshop.jpeg`, defaultUnlocked: true },
                { id: 'map_playground', name: '놀이터', image: `${IMG_BASE}minseo-bg-playground.jpeg`, defaultUnlocked: false, unlockHint: '🎫 소원권 5장 모으면 해금', unlockCondition: { type: 'tickets', value: 5 } },
                { id: 'map_themepark', name: '놀이동산', image: `${IMG_BASE}minseo-bg-themepark.jpeg`, defaultUnlocked: false, unlockHint: '📖 용어사전방 Lv.3 달성 시 해금', unlockCondition: { type: 'vocaLevel', value: 3 } },
                { id: 'map_clawmachine', name: '인형뽑기', image: `${IMG_BASE}minseo-bg-clawmachine.jpeg`, defaultUnlocked: false, unlockHint: '🔒 특별 미션 · 노션에서 수동 해금 가능', unlockCondition: null }
            ]
        };

        const NOTION_ROOM_PROPS = {
            OWNED_ITEMS: '보유 아이템 (텍스트)',
            PLACEMENT: '배치 정보 (텍스트)',
            UNLOCKED_MAPS: '해금 맵 (텍스트)',
            SELECTED_MAP: '현재 맵 (텍스트)'
        };

        // 🛠️ 관리자(아빠/엄마) 검수 모드 판별
        function isAdminUser() {
            const savedName = localStorage.getItem('currentUserName');
            return savedName === '아빠' || savedName === '엄마' || savedName === '어른';
        }

        // 관리자 모드일 때는 아이 데이터와 분리된 테스트용 저장소 사용
        function getStorageKey(suffix) {
            if (isAdminUser()) {
                const adminName = localStorage.getItem('currentUserName') || 'admin';
                return `admin_${adminName}_${currentProfile}_${suffix}`;
            }
            return `${currentProfile}_${suffix}`;
        }

        // 📋 상점 아이템 (type: normal | character | effect, icon: 이모지 또는 assets/images 파일명)
        const MARKET_ITEMS = {
            son: [
                { id: "char_minsu", name: "탐험가 민수", icon: "minsu-char1.png", type: "character", price: 0, free: true },
                { id: "mc_redbed", name: "네모 빨간 침대", icon: "mc-redbed.png", type: "normal", price: 50 },
                { id: "mc_tree1", name: "블록 나무", icon: "mc-tree1.png", type: "normal", price: 30 },
                { id: "mc_chest", name: "보물 상자", icon: "mc-chest.png", type: "normal", price: 35 },
                { id: "mc_chicken", name: "닭", icon: "mc-chicken.png", type: "normal", price: 20 },
                { id: "mc_sheep", name: "양", icon: "mc-sheep.png", type: "normal", price: 25 },
                { id: "weapon_diamond_sword", name: "다이아몬드 검", icon: "weapon-mc-diamond-sword.png", type: "normal", price: 120 },
                { id: "weapon_bow", name: "활", icon: "weapon-bow.jpeg", type: "normal", price: 80 },
                { id: "weapon_gun1", name: "레이저 건", icon: "weapon-gun1.png", type: "normal", price: 100 },
                { id: "weapon_gun3", name: "플라즈마 소총", icon: "weapon-gun3.png", type: "normal", price: 110 },
                { id: "weapon_roblox_sword1", name: "로블록스 검", icon: "weapon-roblox-sword1.png", type: "normal", price: 90 },
                { id: "item_radio", name: "휴대 라디오", icon: "item-radio.png", type: "normal", price: 40 },
                { id: "item_hoverboard", name: "호버보드", icon: "item-hoverboard.png", type: "normal", price: 150 },
                { id: "effect_torch", name: "이글이글 횃불", icon: "Effect-Items5.gif", type: "effect", price: 45 },
                { id: "effect_spark1", name: "반짝 파티클", icon: "Effect-Items1.gif", type: "effect", price: 40 },
                { id: "effect_spark2", name: "마법 반짝임", icon: "Effect-Items2.gif", type: "effect", price: 42 },
                { id: "trophy_golden_piggy", name: "🏆 황금 돼지 저금통", icon: "🐷", type: "normal", price: 9999, specialTag: "착한 습관 20칸 완주 트로피" }
            ],
            daughter: [
                { id: "char_minseo", name: "핑꾸 민서", icon: "minseo-char1.png", type: "character", price: 0, free: true },
                { id: "fruit_strawberry", name: "딸기 바구니", icon: "fruit-strawberry-basket.png", type: "normal", price: 30 },
                { id: "fruit_watermelon", name: "수박", icon: "fruit-watermelon.png", type: "normal", price: 25 },
                { id: "fruit_grape", name: "포도", icon: "fruit-grape.png", type: "normal", price: 20 },
                { id: "fruit_orange", name: "오렌지", icon: "fruit-orange.png", type: "normal", price: 18 },
                { id: "fruit_apple", name: "사과", icon: "fruit-apple.png", type: "normal", price: 15 },
                { id: "toy_sheep", name: "인형 양", icon: "toy-sheep.png", type: "normal", price: 40 },
                { id: "toy_rabbit", name: "토끼 인형", icon: "toy-rabbit2.png", type: "normal", price: 35 },
                { id: "toy_mymelody", name: "마이멜로디", icon: "toy-mymelody1.png", type: "normal", price: 45 },
                { id: "toy_cinamoroll", name: "시나모롤", icon: "toy-cinamoroll2.png", type: "normal", price: 45 },
                { id: "toy_pompom", name: "폼폼푸린", icon: "toy-pompompurin1.png", type: "normal", price: 50 },
                { id: "toy_bear", name: "곰돌이", icon: "toy-bear1.png", type: "normal", price: 38 },
                { id: "item_haribo", name: "하리보 젤리", icon: "haribo-pink.png", type: "normal", price: 15 },
                { id: "item_slime", name: "슬라임", icon: "item-slime.png", type: "normal", price: 25 },
                { id: "effect_sparkle1", name: "핑크 반짝이", icon: "Effect-Items1.gif", type: "effect", price: 35 },
                { id: "effect_sparkle2", name: "무지개 스파클", icon: "Effect-Items2.gif", type: "effect", price: 38 },
                { id: "effect_sparkle3", name: "별똥별 효과", icon: "Effect-Items3.gif", type: "effect", price: 40 },
                { id: "trophy_golden_piggy", name: "🏆 황금 돼지 저금통", icon: "🐷", type: "normal", price: 9999, specialTag: "착한 습관 20칸 완주 트로피" }
            ]
        };

        function getWealthIconHtml() {
            if (currentProfile === 'son') return '💎';
            return `<img src="${IMG_BASE}haribo-pink.png" alt="하리보 젤리" class="reward-currency-img">`;
        }

        function getDaughterWealthPropertyName(props) {
            if (typeof getDaughterRewardPropertyName === 'function') {
                return getDaughterRewardPropertyName(props);
            }
            return '슬라임 파츠 개수';
        }

        function readWealthFromProps(props) {
            if (currentProfile === 'son') {
                return props['다이아몬드 개수']?.number || 0;
            }
            return typeof getDaughterRewardCount === 'function'
                ? getDaughterRewardCount(props)
                : (props['슬라임 파츠 개수']?.number || 0);
        }

        function resolveItemIcon(item) {
            const raw = item?.icon || item?.image || '';
            if (!raw) return { kind: 'emoji', value: '📦' };
            if (/\.(gif|jpe?g|png|webp)$/i.test(raw) || raw.includes('/')) {
                const url = raw.includes('/') ? raw : `${IMG_BASE}${raw}`;
                return { kind: 'image', url, isGif: /\.gif$/i.test(raw) };
            }
            return { kind: 'emoji', value: raw };
        }

        function getItemAssetUrl(item) {
            const resolved = resolveItemIcon(item);
            return resolved.kind === 'image' ? resolved.url : '';
        }

        function isGifItem(item) {
            const resolved = resolveItemIcon(item);
            return resolved.kind === 'image' && resolved.isGif;
        }

        function getItemImageHtml(item, options = {}) {
            const resolved = resolveItemIcon(item);
            const alt = item.name.replace(/"/g, '');
            if (resolved.kind === 'emoji') {
                return `<div class="item-img item-emoji" aria-label="${alt}">${resolved.value}</div>`;
            }
            const gifClass = resolved.isGif ? ' is-gif' : '';
            const loading = resolved.isGif ? 'eager' : 'lazy';
            const decode = resolved.isGif ? 'sync' : 'async';
            return `<img class="item-img${gifClass}" src="${resolved.url}" data-gif-src="${resolved.url}" alt="${alt}" loading="${loading}" decoding="${decode}">`;
        }

        function getItemCardClass(item) {
            if (item.type === 'effect') return 'item-card is-effect';
            if (item.type === 'character') return 'item-card is-character';
            return 'item-card';
        }

        function getItemTypeBadge(item) {
            if (item.type === 'effect') return '<span class="item-type-badge type-effect">✨ GIF</span>';
            if (item.type === 'character') return '<span class="item-type-badge type-character">⭐ 캐릭터</span>';
            return '';
        }

        function refreshAnimatedGifs(root = document) {
            root.querySelectorAll('img[data-gif-src]').forEach(img => {
                const src = img.getAttribute('data-gif-src');
                if (!src) return;
                if (img.src === src) {
                    img.src = '';
                }
                img.src = src;
            });
        }

        function readNotionRichText(prop) {
            if (!prop?.rich_text) return '';
            return prop.rich_text.map(t => t.plain_text || '').join('');
        }

        function buildNotionRichTextPayload(text) {
            const content = String(text);
            if (content.length <= 2000) {
                return { rich_text: [{ text: { content } }] };
            }
            const rich_text = [];
            for (let i = 0; i < content.length; i += 2000) {
                rich_text.push({ text: { content: content.slice(i, i + 2000) } });
            }
            return { rich_text };
        }

        function parseJsonArray(text, fallback = []) {
            if (!text || !String(text).trim()) return fallback;
            try {
                const parsed = JSON.parse(text);
                return Array.isArray(parsed) ? parsed : fallback;
            } catch (err) {
                console.warn('[my-room] JSON 파싱 실패:', err);
                return fallback;
            }
        }

        function normalizePlacedEntry(entry) {
            if (!entry || !entry.id) return null;
            let rotation = Number(entry.rotation);
            if (!Number.isFinite(rotation)) rotation = 0;
            rotation = ((rotation % 360) + 360) % 360;
            return {
                id: entry.id,
                x: Number.isFinite(Number(entry.x)) ? Number(entry.x) : 0,
                y: Number.isFinite(Number(entry.y)) ? Number(entry.y) : 0,
                rotation,
                flipX: Boolean(entry.flipX)
            };
        }

        function normalizePlacedFurnitureList(list) {
            return (Array.isArray(list) ? list : []).map(normalizePlacedEntry).filter(Boolean);
        }

        function applyFurnitureVisualTransform(visualEl, entry, dragging = false) {
            if (!visualEl || !entry) return;
            const rot = Number(entry.rotation) || 0;
            const flip = entry.flipX ? -1 : 1;
            const scale = dragging ? 1.08 : 1;
            visualEl.style.transform = `rotate(${rot}deg) scaleX(${flip}) scale(${scale})`;
        }

        function setSelectedFurniture(itemId) {
            selectedFurnitureId = itemId || null;
            document.querySelectorAll('.furniture-item').forEach(el => {
                el.classList.toggle('is-selected', itemId && el.id === `furn_${itemId}`);
            });
        }

        function updateFurnitureVisual(itemId, dragging = false) {
            const entry = placedFurniture.find(f => f.id === itemId);
            const el = document.getElementById(`furn_${itemId}`);
            if (!entry || !el) return;
            const visual = el.querySelector('.furniture-visual');
            applyFurnitureVisualTransform(visual, entry, dragging || el.classList.contains('is-dragging'));
        }

        async function rotatePlacedItem(itemId, deltaDeg = 45) {
            const target = placedFurniture.find(f => f.id === itemId);
            if (!target) return;
            target.rotation = ((Number(target.rotation) || 0) + deltaDeg) % 360;
            updateFurnitureVisual(itemId);
            try {
                if (isAdminUser()) saveAdminRoomStateToLocal();
                else await syncRoomDataToNotion();
            } catch (err) {
                console.error('[rotatePlacedItem]', err);
                alert('⚠️ 회전 저장에 실패했어요. 다시 시도해 주세요!');
            }
        }

        async function flipPlacedItem(itemId) {
            const target = placedFurniture.find(f => f.id === itemId);
            if (!target) return;
            target.flipX = !target.flipX;
            updateFurnitureVisual(itemId);
            try {
                if (isAdminUser()) saveAdminRoomStateToLocal();
                else await syncRoomDataToNotion();
            } catch (err) {
                console.error('[flipPlacedItem]', err);
                alert('⚠️ 반전 저장에 실패했어요. 다시 시도해 주세요!');
            }
        }

        function getDefaultUnlockedMapIds(profile) {
            return (ROOM_MAPS[profile] || []).filter(m => m.defaultUnlocked).map(m => m.id);
        }

        function getMapById(mapId) {
            return (ROOM_MAPS[currentProfile] || []).find(m => m.id === mapId);
        }

        function getCatalogItems(profile) {
            return MARKET_ITEMS[profile] || [];
        }

        function getItemById(itemId) {
            return getCatalogItems(currentProfile).find(i => i.id === itemId);
        }

        function mergeDefaultUnlockedMaps() {
            getDefaultUnlockedMapIds(currentProfile).forEach(id => {
                if (!unlockedMaps.includes(id)) unlockedMaps.push(id);
            });
        }

        function isMapUnlocked(mapId) {
            const map = getMapById(mapId);
            if (!map) return false;
            if (map.defaultUnlocked) return true;
            return unlockedMaps.includes(mapId);
        }

        function evaluateMapUnlockCondition(map, props) {
            if (!map?.unlockCondition) return false;
            const cond = map.unlockCondition;
            if (cond.type === 'wealth') {
                return readWealthFromProps(props) >= cond.value;
            }
            if (cond.type === 'tickets') {
                return (props['소원권 개수']?.number || 0) >= cond.value;
            }
            if (cond.type === 'vocaLevel') {
                return (props['용어 레벨']?.number || 0) >= cond.value;
            }
            return false;
        }

        function processAutoMapUnlocks(props) {
            let changed = false;
            (ROOM_MAPS[currentProfile] || []).forEach(map => {
                if (map.defaultUnlocked || unlockedMaps.includes(map.id)) return;
                if (evaluateMapUnlockCondition(map, props)) {
                    unlockedMaps.push(map.id);
                    changed = true;
                }
            });
            return changed;
        }

        function ensureFreeStarterItems() {
            let changed = false;
            getCatalogItems(currentProfile).filter(item => item.free).forEach(item => {
                if (!ownedItems.includes(item.id)) {
                    ownedItems.push(item.id);
                    changed = true;
                }
            });
            return changed;
        }

        function resolveSelectedMapId() {
            const fallback = getDefaultUnlockedMapIds(currentProfile)[0] || '';
            if (selectedMapId && isMapUnlocked(selectedMapId)) return selectedMapId;
            return fallback;
        }

        function applyRoomBackground() {
            selectedMapId = resolveSelectedMapId();
            const map = getMapById(selectedMapId);
            const room = document.getElementById('my-room');
            if (!map || !room) return;
            room.style.backgroundImage = `url('${map.image}')`;
            room.style.backgroundSize = 'cover';
            room.style.backgroundPosition = 'center';
        }

        function loadAdminRoomStateFromLocal() {
            ownedItems = parseJsonArray(localStorage.getItem(getStorageKey('owned_items')));
            placedFurniture = normalizePlacedFurnitureList(parseJsonArray(localStorage.getItem(getStorageKey('placed_furniture'))));
            unlockedMaps = parseJsonArray(localStorage.getItem(getStorageKey('unlocked_maps')));
            selectedMapId = localStorage.getItem(getStorageKey('selected_map')) || '';
            mergeDefaultUnlockedMaps();
            ensureFreeStarterItems();
            selectedMapId = resolveSelectedMapId();
        }

        function saveAdminRoomStateToLocal() {
            localStorage.setItem(getStorageKey('owned_items'), JSON.stringify(ownedItems));
            localStorage.setItem(getStorageKey('placed_furniture'), JSON.stringify(placedFurniture));
            localStorage.setItem(getStorageKey('unlocked_maps'), JSON.stringify(unlockedMaps));
            localStorage.setItem(getStorageKey('selected_map'), selectedMapId);
        }

        function notionPropExists(propName) {
            return !!(inventoryPageProps && Object.prototype.hasOwnProperty.call(inventoryPageProps, propName));
        }

        function saveMapStateToLocalFallback() {
            if (isAdminUser()) return;
            if (!notionPropExists(NOTION_ROOM_PROPS.UNLOCKED_MAPS)) {
                localStorage.setItem(`${currentProfile}_unlocked_maps`, JSON.stringify(unlockedMaps));
            }
            if (!notionPropExists(NOTION_ROOM_PROPS.SELECTED_MAP)) {
                localStorage.setItem(`${currentProfile}_selected_map`, selectedMapId || resolveSelectedMapId());
            }
        }

        function loadMapStateFromLocalFallback() {
            if (isAdminUser()) return;
            if (!notionPropExists(NOTION_ROOM_PROPS.UNLOCKED_MAPS)) {
                parseJsonArray(localStorage.getItem(`${currentProfile}_unlocked_maps`)).forEach(id => {
                    if (id && !unlockedMaps.includes(id)) unlockedMaps.push(id);
                });
            }
            if (!notionPropExists(NOTION_ROOM_PROPS.SELECTED_MAP)) {
                const savedMap = localStorage.getItem(`${currentProfile}_selected_map`);
                if (savedMap) selectedMapId = savedMap;
            }
            mergeDefaultUnlockedMaps();
        }

        function buildRoomSyncProperties(extraProps = {}) {
            const updateProps = { ...extraProps };

            if (notionPropExists(NOTION_ROOM_PROPS.OWNED_ITEMS)) {
                updateProps[NOTION_ROOM_PROPS.OWNED_ITEMS] = buildNotionRichTextPayload(JSON.stringify(ownedItems));
            }
            if (notionPropExists(NOTION_ROOM_PROPS.PLACEMENT)) {
                updateProps[NOTION_ROOM_PROPS.PLACEMENT] = buildNotionRichTextPayload(JSON.stringify(placedFurniture));
            }
            if (notionPropExists(NOTION_ROOM_PROPS.UNLOCKED_MAPS)) {
                updateProps[NOTION_ROOM_PROPS.UNLOCKED_MAPS] = buildNotionRichTextPayload(JSON.stringify(unlockedMaps));
            }
            if (notionPropExists(NOTION_ROOM_PROPS.SELECTED_MAP)) {
                updateProps[NOTION_ROOM_PROPS.SELECTED_MAP] = buildNotionRichTextPayload(selectedMapId || resolveSelectedMapId());
            }

            return updateProps;
        }

        function applyInventoryFromProps(props) {
            inventoryPageProps = props;
            currentWealth = readWealthFromProps(props);
            currentTicketCount = props['소원권 개수']?.number || 0;
            ownedItems = parseJsonArray(readNotionRichText(props[NOTION_ROOM_PROPS.OWNED_ITEMS]));
            placedFurniture = normalizePlacedFurnitureList(parseJsonArray(readNotionRichText(props[NOTION_ROOM_PROPS.PLACEMENT])));
            unlockedMaps = parseJsonArray(readNotionRichText(props[NOTION_ROOM_PROPS.UNLOCKED_MAPS]));
            selectedMapId = readNotionRichText(props[NOTION_ROOM_PROPS.SELECTED_MAP]) || '';
            loadMapStateFromLocalFallback();
        }

        async function finalizeRoomStateAfterLoad(props) {
            reconcileOwnedWithPlaced();
            const freeChanged = ensureFreeStarterItems();
            const mapChanged = processAutoMapUnlocks(props);
            selectedMapId = resolveSelectedMapId();
            applyRoomBackground();
            if ((freeChanged || mapChanged) && !isAdminUser()) {
                await syncRoomDataToNotion();
            }
        }

        async function queryInventoryPage(userName) {
            const response = await fetch(`${getRoomProxyUrl()}/v1/databases/${getRoomInventoryDbId()}/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filter: { property: '이름', title: { equals: userName } } })
            });
            if (!response.ok) throw new Error(`서버 응답 오류 (상태코드: ${response.status})`);
            const data = await response.json();
            if (!data.results || !data.results.length) {
                throw new Error('데이터베이스에서 이름(민수/민서)을 찾을 수 없습니다.');
            }
            return data.results[0];
        }

        async function syncRoomDataToNotion(extraProps = {}) {
            if (isAdminUser()) {
                saveAdminRoomStateToLocal();
                return;
            }
            if (!inventoryPageId) return;

            const updateProps = buildRoomSyncProperties(extraProps);
            if (Object.keys(updateProps).length === 0) {
                saveMapStateToLocalFallback();
                return;
            }

            const response = await fetch(`${getRoomProxyUrl()}/v1/pages/${inventoryPageId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ properties: updateProps })
            });
            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                console.error('[my-room] 노션 PATCH 실패:', response.status, errText);
                throw new Error(`노션 동기화 실패 (상태: ${response.status})`);
            }
            saveMapStateToLocalFallback();
        }

        function reconcileOwnedWithPlaced() {
            let changed = false;
            placedFurniture.forEach(f => {
                if (f?.id && !ownedItems.includes(f.id)) {
                    ownedItems.push(f.id);
                    changed = true;
                }
            });
            return changed;
        }

        async function migrateLegacyLocalRoomDataIfNeeded() {
            if (isAdminUser()) return false;
            let changed = false;

            const legacyOwned = localStorage.getItem(`${currentProfile}_owned_items`);
            const legacyPlaced = localStorage.getItem(`${currentProfile}_placed_furniture`);

            if (legacyOwned) {
                parseJsonArray(legacyOwned).forEach(id => {
                    if (id && !ownedItems.includes(id)) {
                        ownedItems.push(id);
                        changed = true;
                    }
                });
            }
            if (legacyPlaced) {
                parseJsonArray(legacyPlaced).forEach(p => {
                    const normalized = normalizePlacedEntry(p);
                    if (normalized?.id && !placedFurniture.some(f => f.id === normalized.id)) {
                        placedFurniture.push(normalized);
                        changed = true;
                    }
                });
            }

            if (reconcileOwnedWithPlaced()) changed = true;

            if (changed) {
                await syncRoomDataToNotion();
                if (legacyOwned) localStorage.removeItem(`${currentProfile}_owned_items`);
                if (legacyPlaced) localStorage.removeItem(`${currentProfile}_placed_furniture`);
            }
            return changed;
        }

