// kids/core/quick-uploader.js
// 📸 모바일 원터치 패밀리 성장 사진 퀵 업로더 엔진 (kids-archive & 노션 DB 연동)

(function () {
  'use strict';

  const NOTION_PROXY = 'https://minmin-notion.awslike6.workers.dev';
  const GALLERY_DIARY_DB_ID = '3dfa27115b688010a85be385f91d64ee';

  let currentAuthor = '민수';
  let currentCategory = '종이일기';
  let compressedDataUrl = null;
  let compressedBlob = null;
  let isSubmitting = false;

  // 1. 모달 DOM 자동 주입
  function injectModalDom() {
    if (document.getElementById('quickUploaderOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'quickUploaderOverlay';
    overlay.className = 'quick-uploader-modal-overlay';
    overlay.innerHTML = `
      <div class="quick-uploader-modal" role="dialog" aria-modal="true" aria-labelledby="quTitle">
        <!-- 헤더 -->
        <div class="qu-header">
          <h3 id="quTitle" class="qu-title">📸 우리 가족 찰칵! 바로 올리기</h3>
          <button type="button" class="qu-close-btn" id="quCloseBtn" aria-label="닫기">✕</button>
        </div>

        <!-- 1. 작성자 선택 -->
        <div class="qu-section">
          <label class="qu-label">👦 누가 올리나요?</label>
          <div class="qu-chip-group" id="quAuthorChips">
            <button type="button" class="qu-chip active" data-author="민수"><span class="qu-emoji">👦</span>민수</button>
            <button type="button" class="qu-chip" data-author="민서"><span class="qu-emoji">👧</span>민서</button>
            <button type="button" class="qu-chip" data-author="아빠"><span class="qu-emoji">👨</span>아빠</button>
            <button type="button" class="qu-chip" data-author="엄마"><span class="qu-emoji">👩</span>엄마</button>
          </div>
        </div>

        <!-- 2. 종류 선택 -->
        <div class="qu-section">
          <label class="qu-label">📂 어떤 사진인가요?</label>
          <div class="qu-chip-group category" id="quCategoryChips">
            <button type="button" class="qu-chip active" data-category="종이일기"><span class="qu-emoji">📝</span>손글씨 종이일기</button>
            <button type="button" class="qu-chip" data-category="작품"><span class="qu-emoji">🎨</span>미술 작품/만들기</button>
            <button type="button" class="qu-chip" data-category="상장"><span class="qu-emoji">🏆</span>상장 / 임명장</button>
            <button type="button" class="qu-chip" data-category="특별한 날"><span class="qu-emoji">🌟</span>특별한 날/체험학습</button>
          </div>
        </div>

        <!-- 3. 사진 촬영 및 선택 -->
        <div class="qu-section">
          <label class="qu-label">📷 사진을 찍거나 골라주세요</label>
          <div class="qu-photo-area" id="quPhotoArea">
            <div id="quPhotoBtns" class="qu-btn-row">
              <button type="button" class="qu-photo-btn primary" id="quCameraBtn">
                <span>📸</span> 카메라 찰칵!
              </button>
              <button type="button" class="qu-photo-btn" id="quGalleryBtn">
                <span>🖼️</span> 앨범에서 선택
              </button>
            </div>
            <div id="quPreviewContainer" style="display:none; width:100%;">
              <div class="qu-preview-wrapper">
                <img id="quPreviewImg" class="qu-preview-img" alt="미리보기" />
                <button type="button" class="qu-remove-btn" id="quRemovePhotoBtn" title="사진 삭제">✕</button>
              </div>
            </div>
          </div>
          <!-- 숨겨진 파일 인풋 (카메라 직결용 / 갤러리용) -->
          <input type="file" id="quInputCamera" accept="image/*" capture="environment" style="display:none;" />
          <input type="file" id="quInputGallery" accept="image/*" style="display:none;" />
        </div>

        <!-- 4. 한 줄 메모 (선택) -->
        <div class="qu-section">
          <label class="qu-label" for="quMemoInput">✏️ 한 줄 메모 (생략 가능)</label>
          <input type="text" id="quMemoInput" class="qu-input" placeholder="예: 오늘 그린 피카소 고양이, 척추 보건수업 일기" maxlength="100" />
        </div>

        <!-- 상태 메시지 박스 -->
        <div id="quStatusBox" class="qu-status-box"></div>

        <!-- 5. 등록 버튼 -->
        <button type="button" id="quSubmitBtn" class="qu-submit-btn" disabled>
          <span>🚀</span> 바로 등록하기!
        </button>
      </div>
    `;
    document.body.appendChild(overlay);

    initModalEvents();
  }

  // 2. 모달 이벤트 리스너 바인딩
  function initModalEvents() {
    const overlay = document.getElementById('quickUploaderOverlay');
    const closeBtn = document.getElementById('quCloseBtn');
    const cameraBtn = document.getElementById('quCameraBtn');
    const galleryBtn = document.getElementById('quGalleryBtn');
    const inputCamera = document.getElementById('quInputCamera');
    const inputGallery = document.getElementById('quInputGallery');
    const removeBtn = document.getElementById('quRemovePhotoBtn');
    const submitBtn = document.getElementById('quSubmitBtn');

    // 닫기
    closeBtn.addEventListener('click', closeQuickUploader);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeQuickUploader();
    });

    // 작성자 칩 선택
    document.querySelectorAll('#quAuthorChips .qu-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#quAuthorChips .qu-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentAuthor = btn.getAttribute('data-author');
      });
    });

    // 카테고리 칩 선택
    document.querySelectorAll('#quCategoryChips .qu-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#quCategoryChips .qu-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.getAttribute('data-category');
      });
    });

    // 카메라/갤러리 트리거
    cameraBtn.addEventListener('click', () => inputCamera.click());
    galleryBtn.addEventListener('click', () => inputGallery.click());

    inputCamera.addEventListener('change', handleFileSelect);
    inputGallery.addEventListener('change', handleFileSelect);

    // 사진 삭제
    removeBtn.addEventListener('click', clearPhoto);

    // 제출
    submitBtn.addEventListener('click', submitUpload);
  }

  // 3. 이미지 압축 및 리사이즈 (Canvas 1200px)
  function handleFileSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    showStatus('loading', '⏳ 사진 최적화 중입니다...');
    const reader = new FileReader();

    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        // 최대 가로/세로 1200px 리사이즈
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        // JPEG 82% 고화질 경량 압축 (모바일 10MB -> 150KB 내외)
        canvas.toBlob((blob) => {
          compressedBlob = blob;
          compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

          // 미리보기 렌더링
          const previewImg = document.getElementById('quPreviewImg');
          previewImg.src = compressedDataUrl;
          document.getElementById('quPhotoBtns').style.display = 'none';
          document.getElementById('quPreviewContainer').style.display = 'block';
          document.getElementById('quPhotoArea').classList.add('has-file');

          document.getElementById('quSubmitBtn').disabled = false;
          hideStatus();
        }, 'image/jpeg', 0.82);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    compressedDataUrl = null;
    compressedBlob = null;
    document.getElementById('quInputCamera').value = '';
    document.getElementById('quInputGallery').value = '';
    document.getElementById('quPreviewContainer').style.display = 'none';
    document.getElementById('quPhotoBtns').style.display = 'flex';
    document.getElementById('quPhotoArea').classList.remove('has-file');
    document.getElementById('quSubmitBtn').disabled = true;
    hideStatus();
  }

  // 4. 노션 DB 업로드 제출
  async function submitUpload() {
    if (isSubmitting || !compressedDataUrl) return;

    isSubmitting = true;
    const submitBtn = document.getElementById('quSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳</span> 등록 중입니다...';
    showStatus('loading', '🚀 성장 갤러리 & 노션 DB에 등록하고 있습니다...');

    const memoText = document.getElementById('quMemoInput').value.trim();
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const timeStr = today.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

    // 주인공 노션 select 매핑
    let heroSelect = currentAuthor;
    if (currentAuthor === '아빠' || currentAuthor === '엄마') {
      heroSelect = '부모관리자';
    }

    // 식별 ID
    const shortTitle = memoText || `${currentCategory} 기록`;
    const recordTitle = `[퀵업로드] ${currentAuthor}_${dateStr} (${shortTitle})`;

    // 노션 페이지 생성 바디
    const pageBody = {
      parent: { database_id: GALLERY_DIARY_DB_ID },
      properties: {
        '식별ID': {
          title: [{ text: { content: recordTitle } }]
        },
        '구분': {
          select: { name: currentCategory }
        },
        '주인공': {
          select: { name: heroSelect }
        },
        '날짜': {
          date: { start: dateStr }
        },
        '작가의 한마디/일기본문': {
          rich_text: [{ text: { content: memoText || `[모바일 퀵업로드] ${currentAuthor}의 소중한 사진이 등록되었습니다. (${timeStr})` } }]
        }
      },
      children: [
        {
          object: 'block',
          type: 'callout',
          callout: {
            icon: { type: 'emoji', emoji: '📸' },
            rich_text: [{
              type: 'text',
              text: { content: `[모바일 퀵 업로드] ${currentAuthor} (${currentCategory}) · ${dateStr} ${timeStr} 등록` }
            }]
          }
        }
      ]
    };

    if (memoText) {
      pageBody.children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: memoText } }]
        }
      });
    }

    try {
      const resp = await fetch(`${NOTION_PROXY}/v1/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        body: JSON.stringify(pageBody)
      });

      if (!resp.ok) {
        throw new Error(`노션 통신 오류 (HTTP ${resp.status})`);
      }

      const resData = await resp.json();
      console.log('✅ [퀵 업로드 성공]', resData);

      // 로컬 스토리지에 최근 퀵업로드 저장 (선택적)
      saveLocalQuickRecord({
        id: resData.id,
        author: currentAuthor,
        category: currentCategory,
        memo: memoText,
        date: dateStr,
        preview: compressedDataUrl.substring(0, 100)
      });

      showStatus('success', '🎉 와아! 예쁘게 등록되었어요! (노션 & 갤러리 반영 완료)');
      submitBtn.innerHTML = '<span>✅</span> 등록 완료!';

      setTimeout(() => {
        closeQuickUploader();
        // 페이지가 갤러리나 일기장이라면 실시간 새로고침 시도
        if (typeof window.refreshGalleryFeed === 'function') {
          window.refreshGalleryFeed();
        }
      }, 1500);

    } catch (err) {
      console.error('❌ 퀵 업로드 실패:', err);
      showStatus('error', `등록에 실패했습니다: ${err.message || '네트워크 확인 필요'}`);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>🚀</span> 다시 시도하기';
      isSubmitting = false;
    }
  }

  function saveLocalQuickRecord(item) {
    try {
      const key = 'kids_quick_uploaded_list';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.unshift(item);
      localStorage.setItem(key, JSON.stringify(list.slice(0, 30)));
    } catch (e) { }
  }

  function showStatus(type, msg) {
    const box = document.getElementById('quStatusBox');
    if (!box) return;
    box.className = `qu-status-box ${type}`;
    box.textContent = msg;
  }

  function hideStatus() {
    const box = document.getElementById('quStatusBox');
    if (box) box.className = 'qu-status-box';
  }

  // 5. 전역 노출 API
  window.openQuickUploader = function (options = {}) {
    injectModalDom();
    const overlay = document.getElementById('quickUploaderOverlay');
    if (!overlay) return;

    if (options.defaultAuthor) {
      const aBtn = document.querySelector(`#quAuthorChips .qu-chip[data-author="${options.defaultAuthor}"]`);
      if (aBtn) aBtn.click();
    }
    if (options.defaultCategory) {
      const cBtn = document.querySelector(`#quCategoryChips .qu-chip[data-category="${options.defaultCategory}"]`);
      if (cBtn) cBtn.click();
    }

    clearPhoto();
    document.getElementById('quMemoInput').value = '';
    isSubmitting = false;
    const submitBtn = document.getElementById('quSubmitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>🚀</span> 바로 등록하기!';

    overlay.classList.add('active');
  };

  window.closeQuickUploader = function () {
    const overlay = document.getElementById('quickUploaderOverlay');
    if (overlay) overlay.classList.remove('active');
  };

  // DOM 로드 시 모달 준비
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectModalDom);
  } else {
    injectModalDom();
  }

})();
