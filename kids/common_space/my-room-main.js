        // ⚙️ 초기 기동
        function initRoom() {
            const body = document.body;
            const badge = document.getElementById('user-badge');
            const adminMode = isAdminUser();
            const childLabel = currentProfile === 'son' ? '민수' : '민서';

            const room = document.getElementById('my-room');
            applyRoomBackground();

            if (currentProfile === 'son') {
                body.className = 'theme--minecraft';
                badge.innerHTML = adminMode
                    ? `🛠️ [${localStorage.getItem('currentUserName')}] ${childLabel} 상점 검수`
                    : '👦 민수의 기지';
            } else {
                body.className = 'theme--pink-pink';
                badge.innerHTML = adminMode
                    ? `🛠️ [${localStorage.getItem('currentUserName')}] ${childLabel} 상점 검수`
                    : '👧 민서의 핑꾸 하우스';
            }

            setupDragEvents();
            const exitBtn = document.getElementById('exit-btn');
            if (exitBtn) exitBtn.href = `../../lobby.html?user=${currentProfile === 'daughter' ? 'minseo' : 'minsu'}`;

            if (adminMode) {
                loadAdminRoomStateFromLocal();
                showAdminWealth();
                applyRoomBackground();
                renderRoomFurniture();
            } else {
                fetchInventoryFromNotion(currentProfile === 'son' ? '민수' : '민서');
            }

            if (!fairyChatReady && typeof initFairyChat === 'function') {
                initFairyChat('MY_ROOM', '마이룸');
                fairyChatReady = true;
            }
        }

        // 🛠️ 관리자 검수 모드: 노션 조회/차감 없이 UI만 테스트
        function showAdminWealth() {
            currentWealth = 9999;
            document.getElementById('wealth-display').innerHTML = `${getWealthIconHtml()} 🛠️ 검수 모드 (실제 결제 차단)`;
            renderDock();
        }

        async function fetchInventoryFromNotion(userName) {
            const wealthEl = document.getElementById('wealth-display');
            wealthEl.innerHTML = `${getWealthIconHtml()} ⏳ 동기화 중...`;

            try {
                const page = await queryInventoryPage(userName);
                inventoryPageId = page.id;
                applyInventoryFromProps(page.properties);

                try {
                    await migrateLegacyLocalRoomDataIfNeeded();
                    await finalizeRoomStateAfterLoad(page.properties);
                } catch (syncErr) {
                    console.warn('[my-room] 노션 저장 단계 실패 (화면 데이터는 불러옴):', syncErr);
                    applyRoomBackground();
                    saveMapStateToLocalFallback();
                }

                wealthEl.innerHTML = `${getWealthIconHtml()} 보유량: ${currentWealth}개`;
                renderRoomFurniture();
                renderDock();
            } catch (err) {
                console.error('🚨 마이룸 노션 동기화 에러:', err);
                wealthEl.innerHTML = '❌ 지갑/가구 동기화 실패 (콘솔 확인)';
            }
        }

        // 🔄 탭 전환
        function switchTab(tabName) {
            currentTab = tabName;
            document.getElementById('tab-shop-btn').classList.toggle('active', tabName === 'shop');
            document.getElementById('tab-inv-btn').classList.toggle('active', tabName === 'inventory');
            document.getElementById('tab-map-btn').classList.toggle('active', tabName === 'maps');
            renderDock();
        }

        function renderMapsDock(dock) {
            const maps = ROOM_MAPS[currentProfile] || [];
            const adminMode = isAdminUser();

            if (maps.length === 0) {
                dock.innerHTML = "<p style='color:#666; font-size:0.9rem; margin:auto;'>등록된 맵이 없어요.</p>";
                return;
            }

            maps.forEach(map => {
                const unlocked = isMapUnlocked(map.id);
                const isActive = selectedMapId === map.id;
                const previewClass = `map-preview${isActive ? ' is-active' : ''}${unlocked ? '' : ' is-locked'}`;
                let actionHtml = '';

                if (unlocked) {
                    actionHtml = `<button class="map-btn" ${isActive ? 'disabled style="background:#81C784;"' : ''} onclick="selectRoomMap('${map.id}')">${isActive ? '✓ 적용 중' : '이 맵 적용'}</button>`;
                } else {
                    actionHtml = `<button class="map-btn" disabled style="background:#bbb;">🔒 잠김</button>`;
                    if (adminMode) {
                        actionHtml += `<button class="unlock-btn" onclick="adminUnlockMap('${map.id}')">🔓 검수 해금</button>`;
                    }
                }

                dock.innerHTML += `
                    <div class="item-card map-card">
                        <div class="${previewClass}" style="background-image:url('${map.image}')">
                            ${unlocked ? '' : '<span class="map-lock">🔒</span>'}
                        </div>
                        <div class="item-name">${map.name}</div>
                        <div class="map-hint">${unlocked ? (isActive ? '현재 방 배경' : '터치해서 배경 변경') : (map.unlockHint || '나중에 해금됩니다')}</div>
                        ${actionHtml}
                    </div>
                `;
            });
        }

        // 🛒 도크 렌더링
        function renderDock() {
            const dock = document.getElementById('dock-content');
            const items = getCatalogItems(currentProfile);
            const icon = getWealthIconHtml();

            dock.innerHTML = "";

            if (currentTab === 'maps') {
                renderMapsDock(dock);
                return;
            }

            if (currentTab === 'shop') {
                const sections = [
                    { key: 'character', title: '⭐ 캐릭터' },
                    { key: 'normal', title: '🛋️ 가구 · 소품' },
                    { key: 'effect', title: '✨ 이펙트 (GIF)' }
                ];

                sections.forEach(section => {
                    const sectionItems = items.filter(item => (item.type || 'normal') === section.key);
                    if (sectionItems.length === 0) return;
                    dock.innerHTML += `<div class="shop-section-title">${section.title}</div>`;
                    sectionItems.forEach(item => {
                        const isBought = ownedItems.includes(item.id);
                        const isFree = item.free || item.price === 0;
                        let btnLabel = isBought ? '보유함' : `${icon} ${item.price}`;
                        if (isFree && !isBought) btnLabel = '🎁 무료';
                        dock.innerHTML += `
                            <div class="${getItemCardClass(item)}">
                                ${getItemTypeBadge(item)}
                                ${getItemImageHtml(item)}
                                <div class="item-name">${item.name}</div>
                                <button class="${isFree ? 'free-btn' : 'buy-btn'}" ${isBought ? 'disabled style="background:#bbb;"' : ''} onclick="buyItem('${item.id}', ${item.price})">
                                    ${isBought ? '보유함' : btnLabel}
                                </button>
                            </div>
                        `;
                    });
                });
                refreshAnimatedGifs(dock);
            } else {
                const myOwnedList = items.filter(item => ownedItems.includes(item.id));
                if (myOwnedList.length === 0) {
                    dock.innerHTML = "<p style='color:#666; font-size:0.9rem; margin:auto;'>아직 산 가구가 없어요. 상점에서 가구를 쇼핑해 보세요!</p>";
                    return;
                }
                myOwnedList.forEach(item => {
                    const isPlaced = placedFurniture.some(f => f.id === item.id);
                    dock.innerHTML += `
                        <div class="${getItemCardClass(item)}">
                            ${getItemTypeBadge(item)}
                            ${getItemImageHtml(item)}
                            <div class="item-name">${item.name}</div>
                            <button class="place-btn" ${isPlaced ? 'disabled style="background:#aaa;"' : ''} onclick="spawnToRoom('${item.id}')">
                                ${isPlaced ? '방에 있음' : '방에 꺼내기'}
                            </button>
                        </div>
                    `;
                });
                refreshAnimatedGifs(dock);
            }
        }

        // 💰 결제 로직
        async function buyItem(itemId, price) {
            const item = getItemById(itemId);
            const isFree = item?.free || price === 0;

            if (!isFree && currentWealth < price) {
                const lackMsg = currentProfile === 'son'
                    ? '다이아몬드가 부족합니다! 문제를 더 풀고 오세요! 💪'
                    : '하리보 젤리가 부족해요! 문제를 더 풀고 오세요! 💪';
                return alert(lackMsg);
            }

            // 🛠️ 관리자 검수 모드: 노션 차감 없이 로컬 테스트만
            if (isAdminUser()) {
                if (!confirm(`[검수 모드] 이 가구를 테스트 구매하시겠습니까?\n\n⚠️ 실제 다이아/하리보 젤리는 차감되지 않습니다.`)) return;
                if (ownedItems.includes(itemId)) return alert('이미 보유한 아이템입니다.');
                ownedItems.push(itemId);
                saveAdminRoomStateToLocal();
                alert("🛠️ 검수 모드 구매 완료! (노션 차감 없음)\n'보관함' 탭에서 배치를 테스트해 보세요.");
                renderDock();
                return;
            }

            if (!isFree && !confirm(`이 가구를 정말 구매하시겠습니까?\n내 지갑에서 ${price}개가 차감됩니다.`)) return;

            const userName = (currentProfile === 'son') ? '민수' : '민서';

            try {
                if (isFree) {
                    if (ownedItems.includes(itemId)) return alert('이미 보유한 아이템입니다.');
                    ownedItems.push(itemId);
                    await syncRoomDataToNotion();
                    alert("🎁 무료 아이템을 받았어요! '보관함' 탭에서 방에 꺼내보세요.");
                    renderDock();
                    return;
                }

                document.getElementById('wealth-display').innerText = "⚡ 금고 결제 중...";

                const page = await queryInventoryPage(userName);
                inventoryPageId = page.id;
                const props = page.properties;

                const propertyName = currentProfile === 'son'
                    ? '다이아몬드 개수'
                    : getDaughterWealthPropertyName(props);
                currentWealth -= price;
                ownedItems.push(itemId);

                await syncRoomDataToNotion({
                    [propertyName]: { number: currentWealth }
                });

                alert("🎉 구매 완료! '보관함' 탭에서 방에 꺼내보세요.");
                document.getElementById('wealth-display').innerHTML = `${getWealthIconHtml()} 보유량: ${currentWealth}개`;
                renderDock();
            } catch (err) {
                console.error('[buyItem]', err);
                alert('❌ 결제 실패. 아빠에게 삐삐를 쳐주세요!');
                fetchInventoryFromNotion(userName);
            }
        }

        async function selectRoomMap(mapId) {
            if (!isMapUnlocked(mapId)) {
                return alert('🔒 아직 잠긴 맵이에요! 조건을 충족하거나 아빠/엄마가 해금해 주세요.');
            }
            selectedMapId = mapId;
            applyRoomBackground();
            try {
                await syncRoomDataToNotion();
                renderDock();
            } catch (err) {
                console.error('[selectRoomMap]', err);
                alert('❌ 맵 저장에 실패했어요. 다시 시도해 주세요!');
            }
        }

        async function adminUnlockMap(mapId) {
            if (!isAdminUser()) return;
            const map = getMapById(mapId);
            if (!map) return;
            if (isMapUnlocked(mapId)) return alert('이미 해금된 맵입니다.');
            unlockedMaps.push(mapId);
            saveAdminRoomStateToLocal();
            alert(`🛠️ [검수] "${map.name}" 맵을 해금했습니다.`);
            renderDock();
        }

        async function spawnToRoom(itemId) {
            if (placedFurniture.some(f => f.id === itemId)) return;

            placedFurniture.push({ id: itemId, x: 300, y: 150, rotation: 0, flipX: false });

            try {
                await syncRoomDataToNotion();
                renderRoomFurniture();
                renderDock();
            } catch (err) {
                console.error('[spawnToRoom]', err);
                placedFurniture = placedFurniture.filter(f => f.id !== itemId);
                alert('❌ 가구 배치 저장에 실패했어요. 다시 시도해 주세요!');
            }
        }

        // 🛋️ 방에 있는 가구들 화면에 그리기
        function renderRoomFurniture() {
            const room = document.getElementById('my-room');
            const emptyMsg = document.getElementById('empty-msg');
            const placed = placedFurniture;
            const itemsData = getCatalogItems(currentProfile);
            const keepSelection = selectedFurnitureId;

            document.querySelectorAll('.furniture-item').forEach(el => el.remove());

            if (placed.length > 0) {
                emptyMsg.style.display = 'none';
            } else {
                emptyMsg.style.display = 'block';
                selectedFurnitureId = null;
            }

            placed.forEach(f => {
                const itemInfo = itemsData.find(i => i.id === f.id);
                if(!itemInfo) return;

                const div = document.createElement('div');
                const typeClass = itemInfo.type === 'character'
                    ? 'character-item'
                    : (itemInfo.type === 'effect' ? 'effect-item' : '');
                div.className = typeClass ? `furniture-item ${typeClass}` : 'furniture-item';
                div.id = `furn_${f.id}`;
                const assetUrl = getItemAssetUrl(itemInfo);
                const gifAttrs = isGifItem(itemInfo)
                    ? ' loading="eager" decoding="sync" data-gif-src="' + assetUrl + '"'
                    : ' loading="eager"';

                div.innerHTML = `
                    <div class="furniture-controls">
                        <button type="button" class="furn-ctrl-btn rotate-btn" title="45° 회전" aria-label="회전">↻</button>
                        <button type="button" class="furn-ctrl-btn flip-btn" title="좌우 반전" aria-label="좌우 반전">↔</button>
                    </div>
                    <div class="furniture-visual">
                        <img src="${assetUrl}" alt="${itemInfo.name}"${gifAttrs}>
                    </div>
                `;
                div.style.left = `${f.x}px`;
                div.style.top = `${f.y}px`;

                applyFurnitureVisualTransform(div.querySelector('.furniture-visual'), f, false);

                div.querySelector('.rotate-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    rotatePlacedItem(f.id);
                });
                div.querySelector('.flip-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    flipPlacedItem(f.id);
                });
                div.querySelectorAll('.furn-ctrl-btn').forEach(btn => {
                    ['mousedown', 'touchstart', 'click'].forEach(evt => {
                        btn.addEventListener(evt, (e) => e.stopPropagation());
                    });
                });

                div.addEventListener('mousedown', dragStart);
                div.addEventListener('touchstart', dragStart, {passive: false});

                room.appendChild(div);
            });
            refreshAnimatedGifs(room);
            if (keepSelection && placed.some(f => f.id === keepSelection)) {
                setSelectedFurniture(keepSelection);
            }
        }

        // 🖐️ 드래그 앤 드롭 엔진
        function setupDragEvents() {
            const room = document.getElementById('my-room');
            room.addEventListener('mousedown', (e) => {
                if (e.target === room || e.target.id === 'empty-msg') setSelectedFurniture(null);
            });
            room.addEventListener('touchstart', (e) => {
                if (e.target === room || e.target.id === 'empty-msg') setSelectedFurniture(null);
            }, { passive: true });

            document.addEventListener('mousemove', dragMove);
            document.addEventListener('touchmove', dragMove, {passive: false});
            document.addEventListener('mouseup', dragEnd);
            document.addEventListener('touchend', dragEnd);
        }

        function dragStart(e) {
            if (e.target.closest('.furniture-controls')) return;
            if (e.type === "touchstart") e.preventDefault();
            activeDragElement = e.currentTarget.closest('.furniture-item');
            if (!activeDragElement) return;

            isDragging = true;
            dragDidMove = false;
            activeDragElement.classList.add('is-dragging');
            const itemId = activeDragElement.id.replace('furn_', '');
            updateFurnitureVisual(itemId, true);

            const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
            
            const rect = activeDragElement.getBoundingClientRect();
            dragOffsetX = clientX - rect.left;
            dragOffsetY = clientY - rect.top;
        }

        function dragMove(e) {
            if (!isDragging || !activeDragElement) return;
            if (e.type === "touchmove") e.preventDefault();
            dragDidMove = true;

            const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
            const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
            
            const roomRect = document.getElementById('my-room').getBoundingClientRect();
            
            let newX = clientX - roomRect.left - dragOffsetX;
            let newY = clientY - roomRect.top - dragOffsetY;

            newX = Math.max(0, Math.min(newX, roomRect.width - 88)); 
            newY = Math.max(0, Math.min(newY, roomRect.height - 88));

            activeDragElement.style.left = `${newX}px`;
            activeDragElement.style.top = `${newY}px`;
        }

        async function dragEnd() {
            if (!isDragging || !activeDragElement) return;
            isDragging = false;

            const itemId = activeDragElement.id.replace('furn_', '');
            activeDragElement.classList.remove('is-dragging');
            updateFurnitureVisual(itemId, false);

            const finalX = parseInt(activeDragElement.style.left, 10);
            const finalY = parseInt(activeDragElement.style.top, 10);

            const target = placedFurniture.find(f => f.id === itemId);
            if (target) {
                if (!dragDidMove) {
                    setSelectedFurniture(itemId);
                } else {
                    target.x = finalX;
                    target.y = finalY;
                    setSelectedFurniture(itemId);
                    try {
                        if (isAdminUser()) saveAdminRoomStateToLocal();
                        else await syncRoomDataToNotion();
                    } catch (err) {
                        console.error('[dragEnd]', err);
                        alert('⚠️ 가구 위치 저장에 실패했어요. 새로고침 후 다시 배치해 주세요.');
                    }
                }
            }

            activeDragElement = null;
            dragDidMove = false;
        }

        async function clearRoom() {
            if (!confirm('방에 있는 모든 가구를 다시 보관함으로 집어넣을까요? (구매한 가구는 사라지지 않아요!)')) return;

            selectedFurnitureId = null;
            placedFurniture = [];

            try {
                await syncRoomDataToNotion();
                renderRoomFurniture();
                renderDock();
            } catch (err) {
                console.error('[clearRoom]', err);
                alert('❌ 방 청소 저장에 실패했어요. 다시 시도해 주세요!');
            }
        }
        window.addEventListener('DOMContentLoaded', () => {
            const requiredCores = [
                'notion-helper.js',
                'fairy-config.js',
                'fairy-tts.js',
                'fairy-settings-catalog.js',
                'fairy-engine.js',
                'fairy-chatbot.js',
                'screentime-tracker.js'
            ];

            if (typeof loadCoreScripts === 'function') {
                loadCoreScripts('../core/', requiredCores, () => {
                    console.log('🧚 마이룸 하이브리드 엔진 결합 완료!');
                    initRoom();
                });
            } else {
                console.warn('loadCoreScripts 미로드 — initRoom만 실행');
                initRoom();
            }
        });
    