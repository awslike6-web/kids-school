// ==========================================
// 🎨 민민이네 공부방 갤러리 컨트롤러 (gallery_controller.js)
// ==========================================

        // ========================================================
        // 🏛️ 갤러리 및 특별한 날 상태 / 데이터 관리
        // ========================================================
        const STORAGE_KEY = 'MY_STUDY_ROOM_GALLERY_DATA';
        const STORAGE_VERSION_KEY = 'MY_STUDY_ROOM_GALLERY_VER';
        const CURRENT_STORAGE_VER = 'v20260907_clean';
        const SPECIAL_STORAGE_KEY = 'MY_STUDY_ROOM_SPECIAL_DAYS_DATA';
        const SPECIAL_META_KEY = 'SPECIAL_DAYS_CUSTOM_META';
        const CUSTOM_NOTES_KEY = 'GALLERY_CUSTOM_ARTIST_NOTES';
        const CUSTOM_META_KEY = 'GALLERY_CUSTOM_META';

        let currentViewMode = 'art'; // 'art' (성장 작품) | 'special' (특별한 날 추억)
        let galleryData = [];
        let specialDaysData = [];
        let currentAuthorFilter = 'all';
        let currentCategoryFilter = 'all';
        let activeArtId = null;
        let selectedUploadedImageBase64 = '';

        // 유저 프로필 및 테마 초기화
        let currentUser = localStorage.getItem('currentUser') || 'son';
        let currentUserName = localStorage.getItem('currentUserName') || '민수';

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

        function applyUserTheme() {
            const isDaughter = currentUser === 'daughter' || localStorage.getItem('currentChild') === 'minseo';
            const childKey = isDaughter ? 'minseo' : 'minsu';
            if (!isDaughter && (currentUser === 'son' || currentUserName === '민수')) {
                document.body.className = 'theme--arcade';
                document.getElementById('userNameTag').textContent = '민수';
                document.getElementById('userAvatar').textContent = '👦';
            } else {
                document.body.className = 'theme--hideout';
                document.getElementById('userNameTag').textContent = '민서';
                document.getElementById('userAvatar').textContent = '👧';
            }
            document.querySelectorAll('a[href*="lobby.html"]').forEach(a => {
                a.href = `../../lobby.html?user=${childKey}`;
            });
        }

        function toggleProfileManually() {
            if (currentUser === 'son') {
                currentUser = 'daughter';
                currentUserName = '민서';
                localStorage.setItem('currentChild', 'minseo');
            } else {
                currentUser = 'son';
                currentUserName = '민수';
                localStorage.setItem('currentChild', 'minsu');
            }
            localStorage.setItem('currentUser', currentUser);
            localStorage.setItem('currentUserName', currentUserName);
            applyUserTheme();
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

            galleryData = [...masterList, ...customItems];
            saveGalleryData();
        }

        function saveGalleryData() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(galleryData));
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

            specialDaysData = [...masterList, ...customEvents];
            saveSpecialDaysData();
        }

        function saveSpecialDaysData() {
            localStorage.setItem(SPECIAL_STORAGE_KEY, JSON.stringify(specialDaysData));
        }

        // 🔄 2대 뷰 모드 전환 (성장 작품 ↔ 특별한 날 추억)
        function switchViewMode(mode) {
            if (currentViewMode === mode) return;
            currentViewMode = mode;
            currentAuthorFilter = 'all';
            currentCategoryFilter = 'all';

            const btnArt = document.getElementById('btnModeArt');
            const btnSpecial = document.getElementById('btnModeSpecial');
            if (btnArt && btnSpecial) {
                btnArt.classList.toggle('active', mode === 'art');
                btnSpecial.classList.toggle('active', mode === 'special');
            }

            const heroTitle = document.getElementById('heroTitle');
            const heroSubtitle = document.getElementById('heroSubtitle');
            const heroUploadBtnText = document.getElementById('heroUploadBtnText');
            if (mode === 'special') {
                if (heroTitle) heroTitle.innerHTML = '🌟 민민이네 특별한 날 추억관';
                if (heroSubtitle) heroSubtitle.textContent = '가족 소풍, 텃밭 수확, 생일 파티, 축제 등 반짝이는 특별한 날의 이야기와 동영상!';
                if (heroUploadBtnText) heroUploadBtnText.textContent = '특별한 날 추억 찰칵!';
            } else {
                if (heroTitle) heroTitle.innerHTML = '🎨 민민이네 꿈나무 갤러리';
                if (heroSubtitle) heroSubtitle.textContent = '학교와 집에서 정성껏 만든 소중한 작품들을 감상하고 칭찬해 주세요!';
                if (heroUploadBtnText) heroUploadBtnText.textContent = '새 작품 찰칵 올리기';
            }

            renderFilterBar();
            renderGallery();
            updateStats();
        }

        // 🎛️ 필터 탭 & 툴바 동적 렌더링
        function renderFilterBar() {
            const authorTabs = document.getElementById('authorTabs');
            const categoryPills = document.getElementById('categoryPills');
            if (!authorTabs || !categoryPills) return;

            if (currentViewMode === 'special') {
                authorTabs.innerHTML = `
                    <button class="author-tab-btn ${currentAuthorFilter === 'all' ? 'active' : ''}" onclick="setAuthorFilter('all', this)">🌟 전체 추억</button>
                    <button class="author-tab-btn ${currentAuthorFilter === '민수' ? 'active' : ''}" onclick="setAuthorFilter('민수', this)">👦 민수의 추억</button>
                    <button class="author-tab-btn ${currentAuthorFilter === '민서' ? 'active' : ''}" onclick="setAuthorFilter('민서', this)">👧 민서의 추억</button>
                    <button class="author-tab-btn ${currentAuthorFilter === '공동' ? 'active' : ''}" onclick="setAuthorFilter('공동', this)">👨‍👩‍👧‍👦 온 가족 추억</button>
                `;
                let catHtml = `<button class="category-pill ${currentCategoryFilter === 'all' ? 'active' : ''}" onclick="setCategoryFilter('all', this)">전체 추억</button>`;
                SPECIAL_CATEGORIES.filter(c => c.key !== 'all').forEach(c => {
                    catHtml += `<button class="category-pill ${currentCategoryFilter === c.key ? 'active' : ''}" onclick="setCategoryFilter('${c.key}', this)">${c.icon} ${c.label}</button>`;
                });
                categoryPills.innerHTML = catHtml;
            } else {
                authorTabs.innerHTML = `
                    <button class="author-tab-btn ${currentAuthorFilter === 'all' ? 'active' : ''}" onclick="setAuthorFilter('all', this)">🌟 전체 작품</button>
                    <button class="author-tab-btn ${currentAuthorFilter === '민수' ? 'active' : ''}" onclick="setAuthorFilter('민수', this)">👦 민수의 갤러리</button>
                    <button class="author-tab-btn ${currentAuthorFilter === '민서' ? 'active' : ''}" onclick="setAuthorFilter('민서', this)">👧 민서의 아틀리에</button>
                    <button class="author-tab-btn ${currentAuthorFilter === '공동' ? 'active' : ''}" onclick="setAuthorFilter('공동', this)">🤝 함께 만든 작품</button>
                `;
                let catHtml = `<button class="category-pill ${currentCategoryFilter === 'all' ? 'active' : ''}" onclick="setCategoryFilter('all', this)">전체 카테고리</button>`;
                ART_CATEGORIES.filter(c => c.key !== 'all').forEach(c => {
                    catHtml += `<button class="category-pill ${currentCategoryFilter === c.key ? 'active' : ''}" onclick="setCategoryFilter('${c.key}', this)">${c.icon} ${c.label}</button>`;
                });
                categoryPills.innerHTML = catHtml;
            }
        }

        // 📊 통계 업데이트
        function updateStats() {
            const countArtEl = document.getElementById('countArtworks');
            const countSpecEl = document.getElementById('countSpecials');
            if (countArtEl) countArtEl.textContent = galleryData.length;
            if (countSpecEl) countSpecEl.textContent = specialDaysData.length;

            const isSpecial = currentViewMode === 'special';
            const currentList = isSpecial ? specialDaysData : galleryData;

            const labelEl = document.getElementById('statCountLabel');
            if (labelEl) labelEl.textContent = isSpecial ? '🌟 총 특별한 날 추억' : '🖼️ 총 전시 작품';

            const totalCountEl = document.getElementById('statTotalCount');
            if (totalCountEl) totalCountEl.textContent = currentList.length;

            const totalLikes = currentList.reduce((sum, item) => sum + (item.likes || 0), 0);
            const totalLikesEl = document.getElementById('statTotalLikes');
            if (totalLikesEl) totalLikesEl.textContent = totalLikes;

            const totalComments = currentList.reduce((sum, item) => sum + ((item.comments && item.comments.length) || 0), 0);
            const totalCommentsEl = document.getElementById('statTotalComments');
            if (totalCommentsEl) totalCommentsEl.textContent = totalComments;
        }

        // 🔍 필터 핸들러
        function setAuthorFilter(author, btnEl) {
            currentAuthorFilter = author;
            document.querySelectorAll('#authorTabs .author-tab-btn').forEach(b => b.classList.remove('active'));
            if (btnEl) btnEl.classList.add('active');
            renderGallery();
        }

        function setCategoryFilter(category, btnEl) {
            currentCategoryFilter = category;
            document.querySelectorAll('#categoryPills .category-pill').forEach(b => b.classList.remove('active'));
            if (btnEl) btnEl.classList.add('active');
            renderGallery();
        }

        // 🖼️ 갤러리 카드 렌더링 (모드별 분기)
        function renderGallery() {
            const grid = document.getElementById('galleryGrid');
            if (!grid) return;
            grid.innerHTML = '';

            const isSpecial = currentViewMode === 'special';
            const list = isSpecial ? specialDaysData : galleryData;

            let filtered = list.filter(item => {
                let matchAuthor = false;
                if (currentAuthorFilter === 'all') matchAuthor = true;
                else if (currentAuthorFilter === '공동') matchAuthor = (item.author === '공동' || item.author === '가족' || item.author === '함께');
                else matchAuthor = (item.author === currentAuthorFilter);

                const matchCategory = (currentCategoryFilter === 'all') || (item.category === currentCategoryFilter);
                return matchAuthor && matchCategory;
            });

            if (filtered.length === 0) {
                if (isSpecial) {
                    grid.innerHTML = `
                        <div class="empty-gallery">
                            <h3>🌟 아직 등록된 특별한 날 추억이 없어요!</h3>
                            <p>상단의 '+ 특별한 날 추억 찰칵!' 버튼을 눌러 행복했던 가족 이야기를 남겨보세요.</p>
                        </div>
                    `;
                } else {
                    grid.innerHTML = `
                        <div class="empty-gallery">
                            <h3>🎨 아직 등록된 작품이 없어요!</h3>
                            <p>상단의 '+ 새 작품 찰칵 올리기' 버튼을 눌러 첫 번째 멋진 작품을 자랑해 보세요.</p>
                        </div>
                    `;
                }
                return;
            }

            filtered.forEach(item => {
                const card = document.createElement('div');
                card.className = 'gallery-card';
                card.onclick = () => openDetailModal(item.id);

                const isMinsu = item.author === '민수';
                const isMinseo = item.author === '민서';
                const authorBadgeClass = isMinsu ? 'badge--minsu' : (isMinseo ? 'badge--minseo' : 'badge--together');
                const authorDisplay = (item.author === '공동' || item.author === '가족') ? '👨‍👩‍👧‍👦 온 가족' : item.author;
                const isCutoutClass = (item.hasCutout || (item.imageUrl && item.imageUrl.endsWith('.png'))) ? 'is-cutout' : '';
                const commentsCount = (item.comments && item.comments.length) || 0;
                const imgUrl = item.imageUrl || (item.galleryImages && item.galleryImages[0]) || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800';
                const notePreview = isSpecial ? (item.desc || '가족과 함께한 행복하고 특별한 추억입니다.') : (item.artistNote || '소중하게 완성한 멋진 작품입니다.');

                const videoBadgeHtml = item.videoUrl ? `
                    <span style="position:absolute; bottom:12px; left:12px; z-index:2; background:rgba(0,0,0,0.7); backdrop-filter:blur(4px); color:#ff416c; font-size:0.78rem; font-family:'Jua', sans-serif; padding:4px 8px; border-radius:8px; border:1px solid rgba(255,255,255,0.2); display:flex; align-items:center; gap:4px;">
                        <span>🎬</span> 동영상 포함
                    </span>
                ` : '';

                const multiPhotoBadgeHtml = (item.galleryImages && item.galleryImages.length > 1) ? `
                    <span style="position:absolute; bottom:12px; right:12px; z-index:2; background:rgba(0,0,0,0.7); backdrop-filter:blur(4px); color:#fff; font-size:0.78rem; font-family:'Jua', sans-serif; padding:4px 8px; border-radius:8px; border:1px solid rgba(255,255,255,0.2); display:flex; align-items:center; gap:4px;">
                        <span>📷</span> ${item.galleryImages.length}장
                    </span>
                ` : '';

                card.innerHTML = `
                    <div class="card-img-wrap" style="position:relative;">
                        <span class="card-tag-badge">${item.categoryIcon || (isSpecial ? '🌟' : '🎨')} ${item.category}</span>
                        <span class="card-author-badge ${authorBadgeClass}">${authorDisplay}</span>
                        ${videoBadgeHtml}
                        ${multiPhotoBadgeHtml}
                        <img src="${imgUrl}" alt="${item.title}" class="card-img ${isCutoutClass}" onerror="this.src='https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80'">
                    </div>
                    <div class="card-body">
                        <h3 class="card-title">${item.title}</h3>
                        <p class="card-note-preview">"${notePreview}"</p>
                        <div class="card-footer">
                            <span class="card-date">📅 ${item.date}</span>
                            <div style="display:flex; gap:10px; align-items:center;">
                                <button class="card-like-btn" onclick="event.stopPropagation(); quickLike('${item.id}')">
                                    ❤️ <span>${item.likes || 0}</span>
                                </button>
                                <span style="font-size:0.85rem;">💬 ${commentsCount}</span>
                            </div>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        // ❤️ 빠른 좋아요
        function quickLike(id) {
            let item = galleryData.find(a => a.id === id);
            let isSpecial = false;
            if (!item) {
                item = specialDaysData.find(s => s.id === id);
                isSpecial = true;
            }
            if (!item) return;

            item.likes = (item.likes || 0) + 1;
            if (isSpecial) saveSpecialDaysData();
            else saveGalleryData();

            renderGallery();
            updateStats();
        }

        // ========================================================
        // 🪟 상세 모달 제어
        // ========================================================
        function openDetailModal(id) {
            let item = galleryData.find(a => a.id === id);
            let isSpecial = false;
            if (!item || currentViewMode === 'special') {
                const sp = specialDaysData.find(s => s.id === id);
                if (sp) { item = sp; isSpecial = true; }
            }
            if (!item) return;
            activeArtId = id;

            toggleEditArtFull(false);
            cancelEditArtistNote();

            const imgUrl = item.imageUrl || (item.galleryImages && item.galleryImages[0]) || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800';
            document.getElementById('modalImg').src = imgUrl;
            document.getElementById('modalTitle').textContent = item.title;
            
            // 🖼️ 다중 사진 썸네일 스위처 제어
            const thumbsContainer = document.getElementById('modalThumbsContainer');
            const images = (item.galleryImages && item.galleryImages.length > 0) ? item.galleryImages : (item.imageUrl ? [item.imageUrl] : []);
            if (thumbsContainer) {
                if (images.length > 1) {
                    thumbsContainer.style.display = 'flex';
                    thumbsContainer.innerHTML = '';
                    images.forEach((imgSrc, idx) => {
                        const thumbBtn = document.createElement('button');
                        thumbBtn.type = 'button';
                        thumbBtn.className = `modal-thumb-btn ${idx === 0 ? 'active' : ''}`;
                        thumbBtn.title = `사진 ${idx + 1} 보기`;
                        thumbBtn.style.cssText = `
                            width: 54px; height: 54px; border-radius: 10px; border: 2.5px solid ${idx === 0 ? 'var(--primary, #4a90e2)' : 'rgba(0,0,0,0.1)'};
                            padding: 0; overflow: hidden; cursor: pointer; background: #fff; transition: all 0.2s ease;
                            box-shadow: ${idx === 0 ? '0 2px 8px rgba(74,144,226,0.35)' : 'none'};
                        `;
                        thumbBtn.innerHTML = `<img src="${imgSrc}" style="width:100%; height:100%; object-fit:cover; display:block;" alt="사진 ${idx + 1}">`;
                        thumbBtn.onclick = () => {
                            document.getElementById('modalImg').src = imgSrc;
                            thumbsContainer.querySelectorAll('.modal-thumb-btn').forEach(b => {
                                b.style.borderColor = 'rgba(0,0,0,0.1)';
                                b.style.boxShadow = 'none';
                            });
                            thumbBtn.style.borderColor = 'var(--primary, #4a90e2)';
                            thumbBtn.style.boxShadow = '0 2px 8px rgba(74,144,226,0.35)';
                        };
                        thumbsContainer.appendChild(thumbBtn);
                    });
                } else {
                    thumbsContainer.style.display = 'none';
                    thumbsContainer.innerHTML = '';
                }
            }
            
            const authorTag = document.getElementById('modalAuthorTag');
            const isMinsu = item.author === '민수';
            const isMinseo = item.author === '민서';
            authorTag.textContent = (item.author === '공동' || item.author === '가족') ? '👨‍👩‍👧‍👦 온 가족 (공동)' : item.author;
            authorTag.className = `card-author-badge ${isMinsu ? 'badge--minsu' : (isMinseo ? 'badge--minseo' : 'badge--together')}`;
            
            document.getElementById('modalCategoryTag').textContent = `${item.categoryIcon || (isSpecial ? '🌟' : '🎨')} ${item.category}`;
            document.getElementById('modalDateTag').textContent = `📅 ${item.date}`;
            
            const noteText = isSpecial ? (item.desc || "가족과 함께한 행복하고 특별한 추억입니다.") : (item.artistNote || "작품에 담긴 이야기와 열정을 느껴보세요!");
            document.getElementById('modalArtistNote').textContent = noteText;

            // 동영상 풀영상 버튼 제어
            const videoBtn = document.getElementById('modalVideoBtn');
            const videoBtnText = document.getElementById('modalVideoBtnText');
            if (isSpecial && item.videoUrl) {
                videoBtn.href = item.videoUrl;
                if (videoBtnText) videoBtnText.textContent = item.videoBtnText || '동영상 풀영상 감상하기';
                videoBtn.style.display = 'inline-flex';
            } else {
                videoBtn.style.display = 'none';
            }

            // 편집 버튼 라벨 조정
            const editBtnSpan = document.querySelector('#editArtFullTriggerBtn span:last-child');
            if (editBtnSpan) {
                editBtnSpan.textContent = isSpecial ? '추억 정보 수정' : '작품 정보 수정';
            }
            const quoteTitle = document.querySelector('.artist-quote-title');
            if (quoteTitle) {
                quoteTitle.textContent = isSpecial ? '🌟 그날의 생생한 이야기' : '🗣️ 작가의 한마디';
            }

            // 스티커 반응 카운트
            const stickers = item.stickers || { heart: 0, thumb: 0, star: 0, trophy: 0 };
            document.getElementById('stickerCount_heart').textContent = stickers.heart || 0;
            document.getElementById('stickerCount_thumb').textContent = stickers.thumb || 0;
            document.getElementById('stickerCount_star').textContent = stickers.star || 0;
            document.getElementById('stickerCount_trophy').textContent = stickers.trophy || 0;

            // 댓글 리스트
            renderModalComments(item.comments || []);

            // 현재 접속자에 맞게 기본 댓글 작성자 선택
            document.getElementById('commentAuthorSelect').value = currentUserName || '아빠';

            document.getElementById('detailModal').style.display = 'flex';
        }

        function closeDetailModal() {
            toggleEditArtFull(false);
            cancelEditArtistNote();
            document.getElementById('detailModal').style.display = 'none';
            activeArtId = null;
        }

        function openOriginalImage() {
            const modalImg = document.getElementById('modalImg');
            if (modalImg && modalImg.src) {
                window.open(modalImg.src, '_blank');
            }
        }

        // ========================================================
        // ✏️ 작품 / 특별한 날 전체 메타 웹 편집 인터랙션
        // ========================================================
        function toggleEditArtFull(open) {
            const area = document.getElementById('artFullEditArea');
            const triggerBtn = document.getElementById('editArtFullTriggerBtn');
            if (!area) return;

            if (open) {
                if (!activeArtId) return;
                let item = galleryData.find(a => a.id === activeArtId);
                let isSpecial = false;
                if (!item || currentViewMode === 'special') {
                    const sp = specialDaysData.find(s => s.id === activeArtId);
                    if (sp) { item = sp; isSpecial = true; }
                }
                if (!item) return;

                cancelEditArtistNote();

                const catSelect = document.getElementById('editArtCategorySelect');
                const headerTitle = document.getElementById('editModalHeaderTitle');
                const catLabel = document.getElementById('editCategoryLabel');
                const titleLabel = document.getElementById('editTitleLabel');
                const descLabel = document.getElementById('editDescLabel');
                const videoRow = document.getElementById('editSpecialVideoRow');
                const videoInput = document.getElementById('editArtVideoInput');

                if (isSpecial) {
                    if (headerTitle) headerTitle.innerHTML = '<span>🌟</span> 특별한 날 추억 & 상세 정보 수정';
                    if (catLabel) catLabel.textContent = '분야 (특별한 날 6대 카테고리)';
                    if (titleLabel) titleLabel.textContent = '추억 제목';
                    if (descLabel) descLabel.textContent = '추억 이야기 / 상세 내용';
                    if (videoRow) videoRow.style.display = 'block';
                    if (videoInput) videoInput.value = item.videoUrl || '';

                    catSelect.innerHTML = SPECIAL_CATEGORIES.filter(c => c.key !== 'all').map(c => 
                        `<option value="${c.key}">${c.icon} ${c.label}</option>`
                    ).join('');
                    catSelect.value = item.category || '가족/생일파티';
                    document.getElementById('editArtDescInput').value = item.desc || '';
                } else {
                    if (headerTitle) headerTitle.innerHTML = '<span>✏️</span> 작품 정보 & 표준 5대 분야 수정';
                    if (catLabel) catLabel.textContent = '분야 (표준 5대 분류)';
                    if (titleLabel) titleLabel.textContent = '작품 제목';
                    if (descLabel) descLabel.textContent = '작가의 한마디 / 작품 설명';
                    if (videoRow) videoRow.style.display = 'none';

                    catSelect.innerHTML = ART_CATEGORIES.filter(c => c.key !== 'all').map(c => 
                        `<option value="${c.key}">${c.icon} ${c.label}</option>`
                    ).join('');
                    catSelect.value = item.category || '그림/미술';
                    document.getElementById('editArtDescInput').value = item.artistNote || '';
                }

                document.getElementById('editArtDateInput').value = item.date || '';
                document.getElementById('editArtTitleInput').value = item.title || '';

                area.style.display = 'block';
                if (triggerBtn) triggerBtn.style.display = 'none';
            } else {
                area.style.display = 'none';
                if (triggerBtn) triggerBtn.style.display = 'inline-flex';
            }
        }

        async function saveEditedArtFull() {
            if (!activeArtId) return;
            let item = galleryData.find(a => a.id === activeArtId);
            let isSpecial = false;
            if (!item || currentViewMode === 'special') {
                const sp = specialDaysData.find(s => s.id === activeArtId);
                if (sp) { item = sp; isSpecial = true; }
            }
            if (!item) return;

            const newCategory = document.getElementById('editArtCategorySelect').value;
            const newDate = document.getElementById('editArtDateInput').value.trim();
            const newTitle = document.getElementById('editArtTitleInput').value.trim();
            const newDesc = document.getElementById('editArtDescInput').value.trim();
            const videoInput = document.getElementById('editArtVideoInput');
            const newVideoUrl = (videoInput && isSpecial) ? videoInput.value.trim() : '';

            if (!newTitle) {
                alert(isSpecial ? "추억 제목을 입력해 주세요!" : "작품 제목을 입력해 주세요!");
                return;
            }
            if (!newDate) {
                alert("등록 일자를 선택해 주세요!");
                return;
            }

            const newIcon = getCategoryIcon(newCategory);

            // 변경 전 상태 스냅샷 (수정 이력 생성용)
            const oldState = {
                title: item.title,
                date: item.date,
                category: item.category,
                desc: isSpecial ? (item.desc || '') : (item.artistNote || ''),
                videoUrl: item.videoUrl || ''
            };

            if (isSpecial) {
                // 1. 메모리 및 영구 스토리지 반영
                item.title = newTitle;
                item.category = newCategory;
                item.categoryIcon = newIcon;
                item.date = newDate;
                item.desc = newDesc;
                item.videoUrl = newVideoUrl;

                setCustomSpecialMeta(item.id, {
                    title: newTitle,
                    category: newCategory,
                    categoryIcon: newIcon,
                    date: newDate,
                    desc: newDesc,
                    videoUrl: newVideoUrl
                });
                saveSpecialDaysData();

                // 2. 모달 뷰 갱신
                document.getElementById('modalTitle').textContent = newTitle;
                document.getElementById('modalCategoryTag').textContent = `${newIcon} ${newCategory}`;
                document.getElementById('modalDateTag').textContent = `📅 ${newDate}`;
                document.getElementById('modalArtistNote').textContent = newDesc || "가족과 함께한 행복하고 특별한 추억입니다.";

                const videoBtn = document.getElementById('modalVideoBtn');
                if (newVideoUrl) {
                    videoBtn.href = newVideoUrl;
                    videoBtn.style.display = 'inline-flex';
                } else {
                    videoBtn.style.display = 'none';
                }

                toggleEditArtFull(false);
                renderGallery();
                updateStats();

                if (typeof speakFairyTTS === 'function') {
                    speakFairyTTS("특별한 날 추억이 멋지게 저장되고 동기화되었어요!");
                }

                // 3. 📡 노션 데이터베이스 실시간 동기화 & 영구 수정 이력 블록 적재
                syncSpecialDayToNotion(item, oldState);
            } else {
                // 1. 메모리 및 영구 스토리지 반영
                item.title = newTitle;
                item.category = newCategory;
                item.categoryIcon = newIcon;
                item.date = newDate;
                item.artistNote = newDesc;

                setCustomMeta(item.id, {
                    title: newTitle,
                    category: newCategory,
                    categoryIcon: newIcon,
                    date: newDate,
                    artistNote: newDesc
                });
                saveGalleryData();

                // 2. 모달 뷰 갱신
                document.getElementById('modalTitle').textContent = newTitle;
                document.getElementById('modalCategoryTag').textContent = `${newIcon} ${newCategory}`;
                document.getElementById('modalDateTag').textContent = `📅 ${newDate}`;
                document.getElementById('modalArtistNote').textContent = newDesc || "작품에 담긴 이야기와 열정을 느껴보세요!";

                toggleEditArtFull(false);
                renderGallery();
                updateStats();

                if (typeof speakFairyTTS === 'function') {
                    speakFairyTTS("작품 정보가 멋지게 저장되고 동기화되었어요!");
                }

                // 3. 📡 노션 데이터베이스 실시간 동기화 & 영구 수정 이력 블록 적재
                syncArtworkToNotion(item, oldState);
            }
        }

        // ========================================================
        // 🗣️ 작가의 한마디 / 추억 이야기 직접 수정 인터랙션
        // ========================================================
        function toggleEditArtistNote() {
            if (!activeArtId) return;
            let item = galleryData.find(a => a.id === activeArtId);
            let isSpecial = false;
            if (!item || currentViewMode === 'special') {
                const sp = specialDaysData.find(s => s.id === activeArtId);
                if (sp) { item = sp; isSpecial = true; }
            }
            if (!item) return;

            const editArea = document.getElementById('artistNoteEditArea');
            const viewText = document.getElementById('modalArtistNote');
            const triggerBtn = document.getElementById('editNoteTriggerBtn');
            const input = document.getElementById('editArtistNoteInput');

            input.value = isSpecial ? (item.desc || '') : (item.artistNote || '');
            editArea.style.display = 'flex';
            viewText.style.display = 'none';
            triggerBtn.style.display = 'none';
            input.focus();
        }

        function cancelEditArtistNote() {
            const editArea = document.getElementById('artistNoteEditArea');
            const viewText = document.getElementById('modalArtistNote');
            const triggerBtn = document.getElementById('editNoteTriggerBtn');
            if (editArea) editArea.style.display = 'none';
            if (viewText) viewText.style.display = 'block';
            if (triggerBtn) triggerBtn.style.display = 'inline-flex';
        }

        async function saveEditedArtistNote() {
            if (!activeArtId) return;
            let item = galleryData.find(a => a.id === activeArtId);
            let isSpecial = false;
            if (!item || currentViewMode === 'special') {
                const sp = specialDaysData.find(s => s.id === activeArtId);
                if (sp) { item = sp; isSpecial = true; }
            }
            if (!item) return;

            const input = document.getElementById('editArtistNoteInput');
            const newNote = input.value.trim();
            if (!newNote) {
                alert("내용을 입력해 주세요!");
                return;
            }

            const oldDesc = isSpecial ? (item.desc || '') : (item.artistNote || '');

            if (isSpecial) {
                item.desc = newNote;
                setCustomSpecialMeta(item.id, { desc: newNote });
                saveSpecialDaysData();
                document.getElementById('modalArtistNote').textContent = newNote;
                cancelEditArtistNote();
                renderGallery();

                if (typeof speakFairyTTS === 'function') {
                    speakFairyTTS("특별한 날 이야기가 멋지게 저장되었어요!");
                }
                syncSpecialDayToNotion(item, { ...item, desc: oldDesc });
            } else {
                item.artistNote = newNote;
                setCustomArtistNote(item.id, newNote);
                setCustomMeta(item.id, { artistNote: newNote });
                saveGalleryData();
                document.getElementById('modalArtistNote').textContent = newNote;
                cancelEditArtistNote();
                renderGallery();

                if (typeof speakFairyTTS === 'function') {
                    speakFairyTTS("작가의 한마디가 멋지게 저장되었어요!");
                }
                syncNoteToNotion(item);
            }
        }

        function openOriginalImage() {
            if (!activeArtId) return;
            let item = galleryData.find(a => a.id === activeArtId);
            if (!item) item = specialDaysData.find(s => s.id === activeArtId);
            const imgUrl = item?.imageUrl || (item?.galleryImages && item.galleryImages[0]);
            if (imgUrl) {
                window.open(imgUrl, '_blank');
            }
        }

        function renderModalComments(comments) {
            const list = document.getElementById('modalCommentsList');
            if (!list) return;
            list.innerHTML = '';
            if (!comments || comments.length === 0) {
                list.innerHTML = '<div style="color:var(--text-sub); font-size:0.9rem; padding:8px 0;">아직 남겨진 칭찬이 없어요. 첫 칭찬을 남겨보세요!</div>';
                return;
            }
            comments.forEach(c => {
                const item = document.createElement('div');
                item.className = 'comment-item';
                item.innerHTML = `
                    <span class="comment-author">${c.author}:</span>
                    <span class="comment-text">${c.text}</span>
                    <span class="comment-date">${c.date || ''}</span>
                `;
                list.appendChild(item);
            });
        }

        // 스티커 반응 누르기
        function addStickerReaction(type) {
            if (!activeArtId) return;
            let item = galleryData.find(a => a.id === activeArtId);
            let isSpecial = false;
            if (!item) {
                item = specialDaysData.find(s => s.id === activeArtId);
                isSpecial = true;
            }
            if (!item) return;

            if (!item.stickers) item.stickers = { heart: 0, thumb: 0, star: 0, trophy: 0 };
            item.stickers[type] = (item.stickers[type] || 0) + 1;
            item.likes = (item.likes || 0) + 1;

            document.getElementById(`stickerCount_${type}`).textContent = item.stickers[type];
            if (isSpecial) saveSpecialDaysData();
            else saveGalleryData();

            renderGallery();
            updateStats();

            // 📡 노션 스티커 동기화
            syncStickerToNotion(item, type);
        }

        // 칭찬 댓글 등록
        function submitComment() {
            if (!activeArtId) return;
            const textInput = document.getElementById('commentTextInput');
            const text = textInput.value.trim();
            if (!text) return;

            const author = document.getElementById('commentAuthorSelect').value;
            let item = galleryData.find(a => a.id === activeArtId);
            let isSpecial = false;
            if (!item) {
                item = specialDaysData.find(s => s.id === activeArtId);
                isSpecial = true;
            }
            if (!item) return;

            if (!item.comments) item.comments = [];
            const todayStr = new Date().toISOString().split('T')[0];
            const newComment = { author, text, date: todayStr };
            item.comments.push(newComment);

            textInput.value = '';
            renderModalComments(item.comments);
            if (isSpecial) saveSpecialDaysData();
            else saveGalleryData();

            renderGallery();
            updateStats();

            // 📡 노션 댓글 동기화
            syncCommentToNotion(item, newComment);
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
                        const item = specialDaysData.find(s => s.id === itemId);
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
                        const art = galleryData.find(a => a.id === itemId);
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

                if (hasArtChanges) saveGalleryData();
                if (hasSpecialChanges) saveSpecialDaysData();
                if (hasArtChanges || hasSpecialChanges) {
                    renderGallery();
                    updateStats();
                }
            } catch (err) {
                console.warn("[갤러리 노션 동기화]", err);
            }
        }

        // 2. 작가의 한마디 노션 PATCH / POST
        async function syncNoteToNotion(art) {
            const dbId = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.GALLERY_DB_ID);
            if (!dbId) return;

            try {
                const pageId = notionPageIdMap[art.id];
                if (pageId) {
                    await fetch(`${NOTION_PROXY}/v1/pages/${pageId}`, {
                        method: 'PATCH',
                        headers: NOTION_HEADERS,
                        body: JSON.stringify({
                            properties: {
                                "작가의 한마디/일기본문": { rich_text: [{ text: { content: art.artistNote || "" } }] }
                            }
                        })
                    });
                }
            } catch (err) {
                console.warn("[노션 한마디 저장 오류]", err);
            }
        }

        // 3. 댓글 노션 PATCH
        async function syncCommentToNotion(item, newComment) {
            const dbId = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.GALLERY_DB_ID);
            if (!dbId) return;

            try {
                const pageId = notionPageIdMap[item.id];
                const commentsJson = JSON.stringify(item.comments || []);
                if (pageId) {
                    await fetch(`${NOTION_PROXY}/v1/pages/${pageId}`, {
                        method: 'PATCH',
                        headers: NOTION_HEADERS,
                        body: JSON.stringify({
                            properties: {
                                "가족 칭찬 댓글": { rich_text: [{ text: { content: commentsJson } }] }
                            }
                        })
                    });
                }
            } catch (err) {
                console.warn("[노션 댓글 저장 오류]", err);
            }
        }

        // 4. 스티커 반응 노션 PATCH
        async function syncStickerToNotion(item, type) {
            const dbId = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.GALLERY_DB_ID);
            if (!dbId) return;

            const stickerPropMap = {
                heart: "❤️ 하트",
                thumb: "👍 최고",
                star: "✨ 별",
                trophy: "🏆 트로피"
            };
            const propName = stickerPropMap[type];
            if (!propName) return;

            try {
                const pageId = notionPageIdMap[item.id];
                const count = item.stickers?.[type] || 0;
                if (pageId) {
                    await fetch(`${NOTION_PROXY}/v1/pages/${pageId}`, {
                        method: 'PATCH',
                        headers: NOTION_HEADERS,
                        body: JSON.stringify({
                            properties: {
                                [propName]: { number: count }
                            }
                        })
                    });
                }
            } catch (err) {
                console.warn("[노션 스티커 저장 오류]", err);
            }
        }

        // 5. 작품 정보 노션 PATCH / POST + 수정 이력 콜아웃 블록 적재
        async function syncArtworkToNotion(art, oldState) {
            const dbId = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.GALLERY_DB_ID);
            if (!dbId) return;

            try {
                let pageId = notionPageIdMap[art.id];
                if (!pageId) {
                    try {
                        const searchRes = await fetch(`${NOTION_PROXY}/v1/databases/${dbId}/query`, {
                            method: 'POST',
                            headers: NOTION_HEADERS,
                            body: JSON.stringify({
                                filter: {
                                    property: "식별ID",
                                    title: { equals: art.id }
                                },
                                page_size: 1
                            })
                        });
                        if (searchRes.ok) {
                            const sData = await searchRes.json();
                            if (sData.results && sData.results.length > 0) {
                                pageId = sData.results[0].id;
                                notionPageIdMap[art.id] = pageId;
                            }
                        }
                    } catch (se) {
                        console.warn("[노션 식별ID 검색 경고]", se);
                    }
                }

                const propsPayload = {
                    "제목": { rich_text: [{ text: { content: art.title } }] },
                    "날짜": { date: { start: art.date } },
                    "작가의 한마디/일기본문": { rich_text: [{ text: { content: art.artistNote || "" } }] }
                };

                if (art.category) {
                    propsPayload["분야"] = { select: { name: art.category } };
                }

                if (pageId) {
                    let patchRes = await fetch(`${NOTION_PROXY}/v1/pages/${pageId}`, {
                        method: 'PATCH',
                        headers: NOTION_HEADERS,
                        body: JSON.stringify({ properties: propsPayload })
                    });
                    if (!patchRes.ok && propsPayload["분야"]) {
                        delete propsPayload["분야"];
                        await fetch(`${NOTION_PROXY}/v1/pages/${pageId}`, {
                            method: 'PATCH',
                            headers: NOTION_HEADERS,
                            body: JSON.stringify({ properties: propsPayload })
                        });
                    }

                    // 🕒 수정 이력(Audit Trail) 블록 적재
                    if (oldState) {
                        await appendRevisionHistoryToNotion(pageId, "작품", oldState, {
                            title: art.title,
                            date: art.date,
                            category: art.category,
                            desc: art.artistNote
                        });
                    }
                } else {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const createRes = await fetch(`${NOTION_PROXY}/v1/pages`, {
                        method: 'POST',
                        headers: NOTION_HEADERS,
                        body: JSON.stringify({
                            parent: { database_id: dbId },
                            properties: {
                                "식별ID": { title: [{ text: { content: art.id } }] },
                                "구분": { select: { name: "작품" } },
                                "주인공": { select: { name: art.author } },
                                ...propsPayload
                            },
                            children: [
                                {
                                    object: "block",
                                    type: "heading_2",
                                    heading_2: { rich_text: [{ type: "text", text: { content: `🎨 ${art.title}` } }] }
                                },
                                {
                                    object: "block",
                                    type: "quote",
                                    quote: { rich_text: [{ type: "text", text: { content: art.artistNote || "작품에 담긴 이야기와 열정을 느껴보세요!" } }] }
                                }
                            ]
                        })
                    });
                    if (createRes.ok) {
                        const newPage = await createRes.json();
                        notionPageIdMap[art.id] = newPage.id;
                    }
                }
            } catch (err) {
                console.warn("[노션 작품 정보 동기화 오류]", err);
            }
        }

        // 6. 특별한 날 노션 PATCH / POST + 수정 이력 콜아웃 블록 적재
        async function syncSpecialDayToNotion(item, oldState) {
            const dbId = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.GALLERY_DB_ID);
            if (!dbId) return;

            try {
                let pageId = notionPageIdMap[item.id];
                if (!pageId) {
                    try {
                        const searchRes = await fetch(`${NOTION_PROXY}/v1/databases/${dbId}/query`, {
                            method: 'POST',
                            headers: NOTION_HEADERS,
                            body: JSON.stringify({
                                filter: {
                                    property: "식별ID",
                                    title: { equals: item.id }
                                },
                                page_size: 1
                            })
                        });
                        if (searchRes.ok) {
                            const sData = await searchRes.json();
                            if (sData.results && sData.results.length > 0) {
                                pageId = sData.results[0].id;
                                notionPageIdMap[item.id] = pageId;
                            }
                        }
                    } catch (se) {
                        console.warn("[노션 식별ID 검색 경고]", se);
                    }
                }

                const propsPayload = {
                    "제목": { rich_text: [{ text: { content: item.title } }] },
                    "날짜": { date: { start: item.date } },
                    "작가의 한마디/일기본문": { rich_text: [{ text: { content: item.desc || "" } }] }
                };

                if (item.category) {
                    propsPayload["분야"] = { select: { name: item.category } };
                }

                if (pageId) {
                    let patchRes = await fetch(`${NOTION_PROXY}/v1/pages/${pageId}`, {
                        method: 'PATCH',
                        headers: NOTION_HEADERS,
                        body: JSON.stringify({ properties: propsPayload })
                    });
                    if (!patchRes.ok && propsPayload["분야"]) {
                        delete propsPayload["분야"];
                        await fetch(`${NOTION_PROXY}/v1/pages/${pageId}`, {
                            method: 'PATCH',
                            headers: NOTION_HEADERS,
                            body: JSON.stringify({ properties: propsPayload })
                        });
                    }

                    // 🕒 수정 이력(Audit Trail) 블록 적재
                    if (oldState) {
                        await appendRevisionHistoryToNotion(pageId, "특별한 날", oldState, {
                            title: item.title,
                            date: item.date,
                            category: item.category,
                            desc: item.desc,
                            videoUrl: item.videoUrl
                        });
                    }
                } else {
                    const todayStr = new Date().toISOString().split('T')[0];
                    const childrenBlocks = [
                        {
                            object: "block",
                            type: "heading_2",
                            heading_2: { rich_text: [{ type: "text", text: { content: `🌟 ${item.title}` } }] }
                        },
                        {
                            object: "block",
                            type: "quote",
                            quote: { rich_text: [{ type: "text", text: { content: item.desc || "가족과 함께한 행복하고 특별한 추억입니다." } }] }
                        }
                    ];

                    if (item.videoUrl) {
                        childrenBlocks.push({
                            object: "block",
                            type: "bookmark",
                            bookmark: { url: item.videoUrl }
                        });
                    }

                    const createRes = await fetch(`${NOTION_PROXY}/v1/pages`, {
                        method: 'POST',
                        headers: NOTION_HEADERS,
                        body: JSON.stringify({
                            parent: { database_id: dbId },
                            properties: {
                                "식별ID": { title: [{ text: { content: item.id } }] },
                                "구분": { select: { name: "특별한 날" } },
                                "주인공": { select: { name: item.author || "공동" } },
                                ...propsPayload
                            },
                            children: childrenBlocks
                        })
                    });
                    if (createRes.ok) {
                        const newPage = await createRes.json();
                        notionPageIdMap[item.id] = newPage.id;
                    }
                }
            } catch (err) {
                console.warn("[노션 특별한 날 동기화 오류]", err);
            }
        }

        // ========================================================
        // 📸 헤더 업로드 액션 & 모달 제어
        // ========================================================
        function handleHeroUploadAction() {
            if (typeof window.openQuickUploader === 'function') {
                const cat = currentViewMode === 'special' ? '특별한 날' : '작품';
                const author = (currentUserName === '민서') ? '민서' : '민수';
                window.openQuickUploader({ defaultAuthor: author, defaultCategory: cat });
            } else {
                openUploadModal();
            }
        }

        function openUploadModal() {
            document.getElementById('newArtDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('newArtTitle').value = '';
            document.getElementById('newArtNote').value = '';
            document.getElementById('newArtUrlInput').value = '';
            document.getElementById('newArtFileInput').value = '';
            selectedUploadedImageBase64 = '';
            document.getElementById('imgPreviewBox').innerHTML = '<span style="color: #aaa; font-size: 0.9rem;">사진 미리보기가 여기에 표시됩니다.</span>';
            
            document.getElementById('newArtAuthor').value = (currentUserName === '민서') ? '민서' : '민수';
            document.getElementById('uploadModal').style.display = 'flex';
        }

        function closeUploadModal() {
            document.getElementById('uploadModal').style.display = 'none';
        }

        function handleImageFileSelect(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                selectedUploadedImageBase64 = e.target.result;
                document.getElementById('imgPreviewBox').innerHTML = `<img src="${selectedUploadedImageBase64}" alt="미리보기">`;
            };
            reader.readAsDataURL(file);
        }

        function handleImageUrlInput(url) {
            if (!url.trim()) return;
            selectedUploadedImageBase64 = url.trim();
            document.getElementById('imgPreviewBox').innerHTML = `<img src="${selectedUploadedImageBase64}" alt="미리보기" onerror="this.src='https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800'">`;
        }

        function saveNewArtwork() {
            const author = document.getElementById('newArtAuthor').value;
            const category = document.getElementById('newArtCategory').value;
            const title = document.getElementById('newArtTitle').value.trim();
            const date = document.getElementById('newArtDate').value || new Date().toISOString().split('T')[0];
            const note = document.getElementById('newArtNote').value.trim();

            if (!title) {
                alert("작품 제목을 입력해 주세요! ✨");
                return;
            }

            const imgUrl = selectedUploadedImageBase64 || "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80";

            const newArt = {
                id: `art_custom_${Date.now()}`,
                author: author,
                authorKey: author === '민수' ? 'son' : 'daughter',
                title: title,
                category: category,
                categoryIcon: getCategoryIcon(category),
                date: date,
                grade: author === '민수' ? '5학년' : '1학년',
                imageUrl: imgUrl,
                artistNote: note || "정성스럽게 완성한 멋진 작품입니다!",
                likes: 1,
                stickers: { heart: 1, thumb: 0, star: 0, trophy: 0 },
                comments: []
            };

            galleryData.unshift(newArt);
            saveGalleryData();
            closeUploadModal();
            renderGallery();
            updateStats();
            alert("🎉 새로운 작품이 갤러리에 멋지게 전시되었습니다!");
        }

        // 🚀 초기 구동
        window.addEventListener('load', () => {
            applyUserTheme();
            loadGalleryData();
            loadSpecialDaysData();
            renderFilterBar();
            renderGallery();
            updateStats();
            syncFromNotionGallery();
        });
    </script>
