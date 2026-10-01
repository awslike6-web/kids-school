/**
 * ==============================================================================
 * 🪟 [Gallery Modal & Interaction Manager] 상세 모달 및 반응형 제어 모듈 (gallery-modal-manager.js)
 * ==============================================================================
 * 역할 및 구성:
 * 1. 작품 및 특별한 날 추억 상세 모달 팝업 열기/닫기
 * 2. 다중 사진 썸네일 스위처 및 고화질 원본 보기 (중복 제거)
 * 3. 작품/추억 전체 메타 웹 편집 인터랙션 및 노션 동기화 브리지
 * 4. 작가의 한마디 직접 수정 인터랙션
 * 5. 스티커 반응 누르기 및 가족 칭찬 댓글 관리
 * ==============================================================================
 */

let activeArtId = null;

// ========================================================
// 🪟 상세 모달 제어
// ========================================================
function openDetailModal(id) {
    let item = window.galleryData.find(a => a.id === id);
    let isSpecial = false;
    if (!item || window.currentViewMode === 'special') {
        const sp = window.specialDaysData.find(s => s.id === id);
        if (sp) { item = sp; isSpecial = true; }
    }
    if (!item) return;
    activeArtId = id;

    toggleEditArtFull(false);
    cancelEditArtistNote();

    const imgUrl = item.imageUrl || (item.galleryImages && item.galleryImages[0]) || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800';
    const modalImg = document.getElementById('modalImg');
    if (modalImg) modalImg.src = imgUrl;

    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) modalTitle.textContent = item.title;
    
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
                    if (modalImg) modalImg.src = imgSrc;
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
    if (authorTag) {
        const isMinsu = item.author === '민수';
        const isMinseo = item.author === '민서';
        authorTag.textContent = (item.author === '공동' || item.author === '가족') ? '👨‍👩‍👧‍👦 온 가족 (공동)' : item.author;
        authorTag.className = `card-author-badge ${isMinsu ? 'badge--minsu' : (isMinseo ? 'badge--minseo' : 'badge--together')}`;
    }
    
    const catTag = document.getElementById('modalCategoryTag');
    if (catTag) catTag.textContent = `${item.categoryIcon || (isSpecial ? '🌟' : '🎨')} ${item.category}`;

    const dateTag = document.getElementById('modalDateTag');
    if (dateTag) dateTag.textContent = `📅 ${item.date}`;
    
    const noteText = isSpecial ? (item.desc || "가족과 함께한 행복하고 특별한 추억입니다.") : (item.artistNote || "작품에 담긴 이야기와 열정을 느껴보세요!");
    const noteEl = document.getElementById('modalArtistNote');
    if (noteEl) noteEl.textContent = noteText;

    // 동영상 풀영상 버튼 제어
    const videoBtn = document.getElementById('modalVideoBtn');
    const videoBtnText = document.getElementById('modalVideoBtnText');
    if (videoBtn) {
        if (isSpecial && item.videoUrl) {
            videoBtn.href = item.videoUrl;
            if (videoBtnText) videoBtnText.textContent = item.videoBtnText || '동영상 풀영상 감상하기';
            videoBtn.style.display = 'inline-flex';
        } else {
            videoBtn.style.display = 'none';
        }
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
    const scHeart = document.getElementById('stickerCount_heart');
    const scThumb = document.getElementById('stickerCount_thumb');
    const scStar = document.getElementById('stickerCount_star');
    const scTrophy = document.getElementById('stickerCount_trophy');
    if (scHeart) scHeart.textContent = stickers.heart || 0;
    if (scThumb) scThumb.textContent = stickers.thumb || 0;
    if (scStar) scStar.textContent = stickers.star || 0;
    if (scTrophy) scTrophy.textContent = stickers.trophy || 0;

    // 댓글 리스트
    renderModalComments(item.comments || []);

    // 현재 접속자에 맞게 기본 댓글 작성자 선택
    const authorSelect = document.getElementById('commentAuthorSelect');
    if (authorSelect) {
        authorSelect.value = window.currentUserName || '아빠';
    }

    const detailModal = document.getElementById('detailModal');
    if (detailModal) detailModal.style.display = 'flex';
}

function closeDetailModal() {
    toggleEditArtFull(false);
    cancelEditArtistNote();
    const detailModal = document.getElementById('detailModal');
    if (detailModal) detailModal.style.display = 'none';
    activeArtId = null;
}

// 🪟 고화질 원본 보기 (단일 SSOT 함수)
function openOriginalImage() {
    if (!activeArtId) return;
    let item = window.galleryData.find(a => a.id === activeArtId);
    if (!item) item = window.specialDaysData.find(s => s.id === activeArtId);
    const modalImg = document.getElementById('modalImg');
    const imgUrl = (modalImg && modalImg.src) || item?.imageUrl || (item?.galleryImages && item.galleryImages[0]);
    if (imgUrl) {
        window.open(imgUrl, '_blank');
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
        let item = window.galleryData.find(a => a.id === activeArtId);
        let isSpecial = false;
        if (!item || window.currentViewMode === 'special') {
            const sp = window.specialDaysData.find(s => s.id === activeArtId);
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

            if (catSelect) {
                catSelect.innerHTML = SPECIAL_CATEGORIES.filter(c => c.key !== 'all').map(c => 
                    `<option value="${c.key}">${c.icon} ${c.label}</option>`
                ).join('');
                catSelect.value = item.category || '가족/생일파티';
            }
            const descInput = document.getElementById('editArtDescInput');
            if (descInput) descInput.value = item.desc || '';
        } else {
            if (headerTitle) headerTitle.innerHTML = '<span>✏️</span> 작품 정보 & 표준 5대 분야 수정';
            if (catLabel) catLabel.textContent = '분야 (표준 5대 분류)';
            if (titleLabel) titleLabel.textContent = '작품 제목';
            if (descLabel) descLabel.textContent = '작가의 한마디 / 작품 설명';
            if (videoRow) videoRow.style.display = 'none';

            if (catSelect) {
                catSelect.innerHTML = ART_CATEGORIES.filter(c => c.key !== 'all').map(c => 
                    `<option value="${c.key}">${c.icon} ${c.label}</option>`
                ).join('');
                catSelect.value = item.category || '그림/미술';
            }
            const descInput = document.getElementById('editArtDescInput');
            if (descInput) descInput.value = item.artistNote || '';
        }

        const dateInput = document.getElementById('editArtDateInput');
        if (dateInput) dateInput.value = item.date || '';

        const titleInput = document.getElementById('editArtTitleInput');
        if (titleInput) titleInput.value = item.title || '';

        area.style.display = 'block';
        if (triggerBtn) triggerBtn.style.display = 'none';
    } else {
        area.style.display = 'none';
        if (triggerBtn) triggerBtn.style.display = 'inline-flex';
    }
}

async function saveEditedArtFull() {
    if (!activeArtId) return;
    let item = window.galleryData.find(a => a.id === activeArtId);
    let isSpecial = false;
    if (!item || window.currentViewMode === 'special') {
        const sp = window.specialDaysData.find(s => s.id === activeArtId);
        if (sp) { item = sp; isSpecial = true; }
    }
    if (!item) return;

    const newCategory = document.getElementById('editArtCategorySelect')?.value || '그림/미술';
    const newDate = document.getElementById('editArtDateInput')?.value.trim() || '';
    const newTitle = document.getElementById('editArtTitleInput')?.value.trim() || '';
    const newDesc = document.getElementById('editArtDescInput')?.value.trim() || '';
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

        const titleEl = document.getElementById('modalTitle');
        if (titleEl) titleEl.textContent = newTitle;
        const catTag = document.getElementById('modalCategoryTag');
        if (catTag) catTag.textContent = `${newIcon} ${newCategory}`;
        const dateTag = document.getElementById('modalDateTag');
        if (dateTag) dateTag.textContent = `📅 ${newDate}`;
        const noteEl = document.getElementById('modalArtistNote');
        if (noteEl) noteEl.textContent = newDesc || "가족과 함께한 행복하고 특별한 추억입니다.";

        const videoBtn = document.getElementById('modalVideoBtn');
        if (videoBtn) {
            if (newVideoUrl) {
                videoBtn.href = newVideoUrl;
                videoBtn.style.display = 'inline-flex';
            } else {
                videoBtn.style.display = 'none';
            }
        }

        toggleEditArtFull(false);
        if (typeof renderGallery === 'function') renderGallery();
        if (typeof updateStats === 'function') updateStats();

        if (typeof speakFairyTTS === 'function') {
            speakFairyTTS("특별한 날 추억이 멋지게 저장되고 동기화되었어요!");
        }

        syncSpecialDayToNotion(item, oldState);
    } else {
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

        const titleEl = document.getElementById('modalTitle');
        if (titleEl) titleEl.textContent = newTitle;
        const catTag = document.getElementById('modalCategoryTag');
        if (catTag) catTag.textContent = `${newIcon} ${newCategory}`;
        const dateTag = document.getElementById('modalDateTag');
        if (dateTag) dateTag.textContent = `📅 ${newDate}`;
        const noteEl = document.getElementById('modalArtistNote');
        if (noteEl) noteEl.textContent = newDesc || "작품에 담긴 이야기와 열정을 느껴보세요!";

        toggleEditArtFull(false);
        if (typeof renderGallery === 'function') renderGallery();
        if (typeof updateStats === 'function') updateStats();

        if (typeof speakFairyTTS === 'function') {
            speakFairyTTS("작품 정보가 멋지게 저장되고 동기화되었어요!");
        }

        syncArtworkToNotion(item, oldState);
    }
}

// ========================================================
// 🗣️ 작가의 한마디 / 추억 이야기 직접 수정 인터랙션
// ========================================================
function toggleEditArtistNote() {
    if (!activeArtId) return;
    let item = window.galleryData.find(a => a.id === activeArtId);
    let isSpecial = false;
    if (!item || window.currentViewMode === 'special') {
        const sp = window.specialDaysData.find(s => s.id === activeArtId);
        if (sp) { item = sp; isSpecial = true; }
    }
    if (!item) return;

    const editArea = document.getElementById('artistNoteEditArea');
    const viewText = document.getElementById('modalArtistNote');
    const triggerBtn = document.getElementById('editNoteTriggerBtn');
    const input = document.getElementById('editArtistNoteInput');

    if (input) input.value = isSpecial ? (item.desc || '') : (item.artistNote || '');
    if (editArea) editArea.style.display = 'flex';
    if (viewText) viewText.style.display = 'none';
    if (triggerBtn) triggerBtn.style.display = 'none';
    if (input) input.focus();
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
    let item = window.galleryData.find(a => a.id === activeArtId);
    let isSpecial = false;
    if (!item || window.currentViewMode === 'special') {
        const sp = window.specialDaysData.find(s => s.id === activeArtId);
        if (sp) { item = sp; isSpecial = true; }
    }
    if (!item) return;

    const input = document.getElementById('editArtistNoteInput');
    const newNote = input ? input.value.trim() : '';
    if (!newNote) {
        alert("내용을 입력해 주세요!");
        return;
    }

    const oldDesc = isSpecial ? (item.desc || '') : (item.artistNote || '');

    if (isSpecial) {
        item.desc = newNote;
        setCustomSpecialMeta(item.id, { desc: newNote });
        saveSpecialDaysData();
        const modalNote = document.getElementById('modalArtistNote');
        if (modalNote) modalNote.textContent = newNote;
        cancelEditArtistNote();
        if (typeof renderGallery === 'function') renderGallery();

        if (typeof speakFairyTTS === 'function') {
            speakFairyTTS("특별한 날 이야기가 멋지게 저장되었어요!");
        }
        syncSpecialDayToNotion(item, { ...item, desc: oldDesc });
    } else {
        item.artistNote = newNote;
        setCustomArtistNote(item.id, newNote);
        setCustomMeta(item.id, { artistNote: newNote });
        saveGalleryData();
        const modalNote = document.getElementById('modalArtistNote');
        if (modalNote) modalNote.textContent = newNote;
        cancelEditArtistNote();
        if (typeof renderGallery === 'function') renderGallery();

        if (typeof speakFairyTTS === 'function') {
            speakFairyTTS("작가의 한마디가 멋지게 저장되었어요!");
        }
        syncNoteToNotion(item);
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
        
        const authorSpan = document.createElement('span');
        authorSpan.className = 'comment-author';
        authorSpan.textContent = `${c.author}: `;

        const textSpan = document.createElement('span');
        textSpan.className = 'comment-text';
        textSpan.textContent = c.text;

        const dateSpan = document.createElement('span');
        dateSpan.className = 'comment-date';
        dateSpan.textContent = c.date || '';

        item.append(authorSpan, textSpan, dateSpan);
        list.appendChild(item);
    });
}

// 스티커 반응 누르기
function addStickerReaction(type) {
    if (!activeArtId) return;
    let item = window.galleryData.find(a => a.id === activeArtId);
    let isSpecial = false;
    if (!item) {
        item = window.specialDaysData.find(s => s.id === activeArtId);
        isSpecial = true;
    }
    if (!item) return;

    if (!item.stickers) item.stickers = { heart: 0, thumb: 0, star: 0, trophy: 0 };
    item.stickers[type] = (item.stickers[type] || 0) + 1;
    item.likes = (item.likes || 0) + 1;

    const countEl = document.getElementById(`stickerCount_${type}`);
    if (countEl) countEl.textContent = item.stickers[type];

    if (isSpecial) saveSpecialDaysData();
    else saveGalleryData();

    if (typeof renderGallery === 'function') renderGallery();
    if (typeof updateStats === 'function') updateStats();

    syncStickerToNotion(item, type);
}

// 칭찬 댓글 등록
function submitComment() {
    if (!activeArtId) return;
    const textInput = document.getElementById('commentTextInput');
    if (!textInput) return;
    const text = textInput.value.trim();
    if (!text) return;

    const author = document.getElementById('commentAuthorSelect')?.value || '아빠';
    let item = window.galleryData.find(a => a.id === activeArtId);
    let isSpecial = false;
    if (!item) {
        item = window.specialDaysData.find(s => s.id === activeArtId);
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

    if (typeof renderGallery === 'function') renderGallery();
    if (typeof updateStats === 'function') updateStats();

    syncCommentToNotion(item, newComment);
}
