/**
 * ==============================================================================
 * 🎨 [Gallery Main Controller] 꿈나무 갤러리 메인 뷰 컨트롤러 (gallery_controller.js)
 * ==============================================================================
 * 역할 및 구성:
 * 1. 유저 프로필 및 테마 실시간 적용 (DOM null 체크 안전 가드 장착)
 * 2. 2대 뷰 모드 스위처: 'art'(성장 작품) vs 'special'(특별한 날 추억)
 * 3. 2대 필터 바(작성자별/분야별) 동적 렌더링 및 통계 바 업데이트
 * 4. 작품 및 추억 카드 그리드 렌더러 & 빠른 좋아요(Quick Like)
 * 5. 새 작품/추억 찰칵 업로드 액션 & 모달 제어
 * 6. 브라우저 load 이벤트 기반 통합 초기화
 * ==============================================================================
 */

// 전역 뷰 상태 관리
window.currentViewMode = 'art'; // 'art' (성장 작품) | 'special' (특별한 날 추억)
let currentAuthorFilter = 'all';
let currentCategoryFilter = 'all';
let selectedUploadedImageBase64 = '';

// 유저 프로필 및 테마 초기화
let currentUser = localStorage.getItem('currentUser') || 'son';
let currentUserName = localStorage.getItem('currentUserName') || '민수';
window.currentUserName = currentUserName;

// 🎨 테마 및 프로필 안전 적용
function applyUserTheme() {
    const isDaughter = currentUser === 'daughter' || localStorage.getItem('currentChild') === 'minseo';
    const childKey = isDaughter ? 'minseo' : 'minsu';
    const nameTag = document.getElementById('userNameTag');
    const avatarTag = document.getElementById('userAvatar');

    if (!isDaughter && (currentUser === 'son' || currentUserName === '민수')) {
        document.body.className = 'theme--arcade';
        if (nameTag) nameTag.textContent = '민수';
        if (avatarTag) avatarTag.textContent = '👦';
    } else {
        document.body.className = 'theme--hideout';
        if (nameTag) nameTag.textContent = '민서';
        if (avatarTag) avatarTag.textContent = '👧';
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
    window.currentUserName = currentUserName;
    localStorage.setItem('currentUser', currentUser);
    localStorage.setItem('currentUserName', currentUserName);
    applyUserTheme();
}

// 🔀 2대 뷰 모드 스위처 (성장 작품 vs 특별한 날 추억)
function switchViewMode(mode) {
    if (window.currentViewMode === mode) return;
    window.currentViewMode = mode;

    const btnArt = document.getElementById('btnModeArt');
    const btnSpecial = document.getElementById('btnModeSpecial');
    const heroTitle = document.getElementById('heroTitle');
    const heroSubtitle = document.getElementById('heroSubtitle');
    const uploadBtnText = document.getElementById('heroUploadBtnText');
    const navLogoText = document.getElementById('navLogoText');

    currentAuthorFilter = 'all';
    currentCategoryFilter = 'all';

    if (mode === 'special') {
        if (btnArt) btnArt.classList.remove('active');
        if (btnSpecial) btnSpecial.classList.add('active');
        if (heroTitle) heroTitle.innerHTML = '🌟 민민이네 특별한 날 추억관';
        if (heroSubtitle) heroSubtitle.textContent = '생일파티, 텃밭체험, 소풍, 학교행사 등 온 가족이 함께한 눈부신 순간들을 모아보세요!';
        if (uploadBtnText) uploadBtnText.textContent = '특별한 날 추억 찰칵!';
        if (navLogoText) navLogoText.textContent = '특별한 날 추억관';
    } else {
        if (btnArt) btnArt.classList.add('active');
        if (btnSpecial) btnSpecial.classList.remove('active');
        if (heroTitle) heroTitle.innerHTML = '🎨 민민이네 꿈나무 갤러리';
        if (heroSubtitle) heroSubtitle.textContent = '학교와 집에서 정성껏 만든 소중한 작품들을 감상하고 칭찬해 주세요!';
        if (uploadBtnText) uploadBtnText.textContent = '새 작품 찰칵 올리기';
        if (navLogoText) navLogoText.textContent = '꿈나무 작품 갤러리';
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

    if (window.currentViewMode === 'special') {
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
    if (countArtEl) countArtEl.textContent = window.galleryData.length;
    if (countSpecEl) countSpecEl.textContent = window.specialDaysData.length;

    const isSpecial = window.currentViewMode === 'special';
    const currentList = isSpecial ? window.specialDaysData : window.galleryData;

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

// 🖼️ 갤러리 카드 그리드 렌더링
function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const isSpecial = window.currentViewMode === 'special';
    const list = isSpecial ? window.specialDaysData : window.galleryData;

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
    let item = window.galleryData.find(a => a.id === id);
    let isSpecial = false;
    if (!item) {
        item = window.specialDaysData.find(s => s.id === id);
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
// 📸 헤더 업로드 액션 & 모달 제어
// ========================================================
function handleHeroUploadAction() {
    if (typeof window.openQuickUploader === 'function') {
        const cat = window.currentViewMode === 'special' ? '특별한 날' : '작품';
        const author = (currentUserName === '민서') ? '민서' : '민수';
        window.openQuickUploader({ defaultAuthor: author, defaultCategory: cat });
    } else {
        openUploadModal();
    }
}

function openUploadModal() {
    const dateInput = document.getElementById('newArtDate');
    const titleInput = document.getElementById('newArtTitle');
    const noteInput = document.getElementById('newArtNote');
    const urlInput = document.getElementById('newArtUrlInput');
    const fileInput = document.getElementById('newArtFileInput');
    const authorInput = document.getElementById('newArtAuthor');
    const previewBox = document.getElementById('imgPreviewBox');
    const modal = document.getElementById('uploadModal');

    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    if (titleInput) titleInput.value = '';
    if (noteInput) noteInput.value = '';
    if (urlInput) urlInput.value = '';
    if (fileInput) fileInput.value = '';
    selectedUploadedImageBase64 = '';
    if (previewBox) previewBox.innerHTML = '<span style="color: #aaa; font-size: 0.9rem;">사진 미리보기가 여기에 표시됩니다.</span>';
    if (authorInput) authorInput.value = (currentUserName === '민서') ? '민서' : '민수';
    if (modal) modal.style.display = 'flex';
}

function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) modal.style.display = 'none';
}

function handleImageFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        selectedUploadedImageBase64 = e.target.result;
        const previewBox = document.getElementById('imgPreviewBox');
        if (previewBox) previewBox.innerHTML = `<img src="${selectedUploadedImageBase64}" alt="미리보기">`;
    };
    reader.readAsDataURL(file);
}

function handleImageUrlInput(url) {
    if (!url.trim()) return;
    selectedUploadedImageBase64 = url.trim();
    const previewBox = document.getElementById('imgPreviewBox');
    if (previewBox) {
        previewBox.innerHTML = `<img src="${selectedUploadedImageBase64}" alt="미리보기" onerror="this.src='https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800'">`;
    }
}

function saveNewArtwork() {
    const author = document.getElementById('newArtAuthor')?.value || '민수';
    const category = document.getElementById('newArtCategory')?.value || '그림/미술';
    const title = document.getElementById('newArtTitle')?.value.trim() || '';
    const date = document.getElementById('newArtDate')?.value || new Date().toISOString().split('T')[0];
    const note = document.getElementById('newArtNote')?.value.trim() || '';

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

    window.galleryData.unshift(newArt);
    saveGalleryData();
    closeUploadModal();
    renderGallery();
    updateStats();
    alert("🎉 새로운 작품이 갤러리에 멋지게 전시되었습니다!");
}

// 🚀 통합 초기 구동 리스너
window.addEventListener('load', () => {
    applyUserTheme();
    loadGalleryData();
    loadSpecialDaysData();
    renderFilterBar();
    renderGallery();
    updateStats();
    syncFromNotionGallery();
});
