/* ========================================================
   📖 민민이네 공부방 스토리북 공통 뷰어 엔진 (storybook_engine.js)
   ======================================================== */
(function() {
  let STORY_BOOK = null;
  let STORY_DATA = [];
  let currentMode = 'ebook';
  let currentPageIndex = 0;
  let isContinuousPlaying = false;
  let webtoonPlayIdx = 0;
  let audio = null;

  function initStorybook(bookData) {
    if (!bookData) {
      console.error('[Storybook] 도서 데이터(STORY_BOOK)가 제공되지 않았습니다.');
      return;
    }
    STORY_BOOK = bookData;
    STORY_DATA = bookData.pages || [];

    // 1. 페이지 메타데이터 & 타이틀 설정
    if (STORY_BOOK.title) {
      document.title = `${STORY_BOOK.title} 📖 | 민민이네 공부방`;
      const titleEl = document.getElementById('storyTitleText');
      if (titleEl) titleEl.textContent = STORY_BOOK.title;
      const titleIconEl = document.getElementById('storyTitleIcon');
      if (titleIconEl && STORY_BOOK.icon) titleIconEl.textContent = STORY_BOOK.icon;
      const webtoonTitleEl = document.getElementById('webtoonStickyTitle');
      if (webtoonTitleEl) webtoonTitleEl.textContent = `${STORY_BOOK.icon || '📖'} ${STORY_BOOK.title} (전체 ${STORY_DATA.length}장)`;
    }

    // 2. 뒤로가기 버튼 링크 설정
    const backBtn = document.getElementById('storyBackBtn');
    if (backBtn && STORY_BOOK.backUrl) {
      backBtn.href = STORY_BOOK.backUrl;
      if (STORY_BOOK.backLabel) {
        backBtn.innerHTML = STORY_BOOK.backLabel;
      }
    }

    // 3. 테마 컬러 동적 적용
    if (STORY_BOOK.themeColor) {
      document.documentElement.style.setProperty('--primary', STORY_BOOK.themeColor);
      const darkColor = STORY_BOOK.themeColorDark || adjustColorBrightness(STORY_BOOK.themeColor, -20);
      document.documentElement.style.setProperty('--primary-dark', darkColor);
    }

    // 4. 오디오 엘리먼트 초기화
    audio = document.getElementById('mainAudio');
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = 'mainAudio';
      audio.preload = 'auto';
      document.body.appendChild(audio);
    }

    bindAudioEvents();
    renderEbook();
  }

  function adjustColorBrightness(hex, percent) {
    let num = parseInt(hex.replace('#', ''), 16);
    let r = (num >> 16) + percent;
    let g = ((num >> 8) & 0x00FF) + percent;
    let b = (num & 0x0000FF) + percent;
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return `#${(g | (b << 8) | (r << 16)).toString(16).padStart(6, '0')}`;
  }

  function bindAudioEvents() {
    if (!audio) return;

    audio.onended = () => {
      if (currentMode === 'ebook') {
        updateEbookAudioUI(false);
        const autoPlayEl = document.getElementById('autoPlayCheckbox');
        const autoPlay = autoPlayEl ? autoPlayEl.checked : false;
        if (autoPlay && currentPageIndex < STORY_DATA.length - 1) {
          setTimeout(() => changePage(1), 1000);
        }
      } else {
        if (isContinuousPlaying) {
          const currentCard = document.getElementById(`webtoonCard_${webtoonPlayIdx}`);
          if (currentCard) currentCard.style.borderColor = '#334155';

          if (webtoonPlayIdx < STORY_DATA.length - 1) {
            webtoonPlayIdx++;
            setTimeout(() => playWebtoonIndex(webtoonPlayIdx), 800);
          } else {
            updateContinuousUI(false);
            isContinuousPlaying = false;
          }
        }
      }
    };

    audio.onerror = () => {
      updateEbookAudioUI(false);
      updateContinuousUI(false);
    };
  }

  function setViewerMode(mode) {
    currentMode = mode;
    if (audio) audio.pause();
    updateEbookAudioUI(false);
    updateContinuousUI(false);
    isContinuousPlaying = false;

    const tabEbook = document.getElementById('tabEbook');
    const tabWebtoon = document.getElementById('tabWebtoon');
    const ebookView = document.getElementById('ebookView');
    const webtoonView = document.getElementById('webtoonView');

    if (mode === 'ebook') {
      if (tabEbook) tabEbook.classList.add('active');
      if (tabWebtoon) tabWebtoon.classList.remove('active');
      if (ebookView) ebookView.style.display = 'flex';
      if (webtoonView) webtoonView.style.display = 'none';
      renderEbook();
    } else {
      if (tabWebtoon) tabWebtoon.classList.add('active');
      if (tabEbook) tabEbook.classList.remove('active');
      if (ebookView) ebookView.style.display = 'none';
      if (webtoonView) webtoonView.style.display = 'flex';
      renderWebtoonList();
    }
  }

  function resolveImagePath(item, isWebtoon) {
    const base = (STORY_BOOK && STORY_BOOK.imgBase) || '';
    if (isWebtoon && item.illImg) {
      return `${base}${item.illImg}`;
    }
    if (item.spreadImg) {
      return `${base}${item.spreadImg}`;
    }
    if (item.img) {
      return item.img;
    }
    return '';
  }

  function renderEbook() {
    if (!STORY_DATA.length) return;
    const item = STORY_DATA[currentPageIndex];
    const img = document.getElementById('ebookImg');
    const version = STORY_BOOK.version || '20260904';
    const imgSrc = resolveImagePath(item, false);
    if (img && imgSrc) {
      img.src = `${imgSrc}?v=${version}`;
      img.alt = item.tag || `페이지 ${item.page}`;
    }

    const indicator = document.getElementById('pageIndicator');
    if (indicator) {
      indicator.textContent = `${item.page} / ${STORY_DATA.length} 쪽`;
    }

    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) prevBtn.disabled = (currentPageIndex === 0);

    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
      nextBtn.textContent = (currentPageIndex === STORY_DATA.length - 1) ? '🎉 처음으로' : '다음 장 ▶';
    }

    if (audio) {
      audio.src = item.audio || '';
      audio.pause();
    }
    updateEbookAudioUI(false);

    const autoPlayEl = document.getElementById('autoPlayCheckbox');
    const autoPlay = autoPlayEl ? autoPlayEl.checked : false;
    if (autoPlay && item.audio) {
      setTimeout(() => {
        if (audio && currentMode === 'ebook') {
          audio.play().then(() => updateEbookAudioUI(true)).catch(() => updateEbookAudioUI(false));
        }
      }, 250);
    }
  }

  function changePage(dir) {
    if (audio) audio.pause();
    if (currentPageIndex === STORY_DATA.length - 1 && dir === 1) {
      currentPageIndex = 0;
    } else {
      currentPageIndex = Math.max(0, Math.min(STORY_DATA.length - 1, currentPageIndex + dir));
    }
    renderEbook();
  }

  function toggleEbookAudio() {
    if (!audio || !audio.src) return;
    if (audio.paused) {
      audio.play().then(() => updateEbookAudioUI(true)).catch(() => updateEbookAudioUI(false));
    } else {
      audio.pause();
      updateEbookAudioUI(false);
    }
  }

  function updateEbookAudioUI(isPlaying) {
    const btn = document.getElementById('playBtn');
    const icon = document.getElementById('playIcon');
    const text = document.getElementById('playText');
    if (!btn) return;
    if (isPlaying) {
      btn.classList.add('playing');
      if (icon) icon.textContent = '⏸️';
      if (text) text.textContent = '일시 정지';
    } else {
      btn.classList.remove('playing');
      if (icon) icon.textContent = '🔊';
      if (text) text.textContent = '동화 듣기';
    }
  }

  function renderWebtoonList() {
    const container = document.getElementById('webtoonCardsList');
    if (!container) return;
    const version = STORY_BOOK.version || '20260904';

    container.innerHTML = STORY_DATA.map((item, idx) => {
      const imgSrc = resolveImagePath(item, true);
      return `
        <div class="webtoon-card" id="webtoonCard_${idx}">
          <div class="webtoon-header">
            <div class="webtoon-tag">${item.tag || `${item.page}장`}</div>
            ${item.audio ? `
              <button class="btn-card-read" onclick="window.playWebtoonCardAudio(${idx})">
                🔊 이 장면 듣기
              </button>
            ` : ''}
          </div>
          ${imgSrc ? `<img class="webtoon-img" src="${imgSrc}?v=${version}" alt="${item.tag || ''}" loading="lazy">` : ''}
          <div class="webtoon-body">
            ${item.textHtml || ''}
          </div>
        </div>
      `;
    }).join('');
  }


  function playWebtoonCardAudio(idx) {
    isContinuousPlaying = false;
    updateContinuousUI(false);
    playWebtoonIndex(idx);
  }

  function playWebtoonIndex(idx) {
    webtoonPlayIdx = idx;
    const item = STORY_DATA[idx];
    if (!item) return;

    const card = document.getElementById(`webtoonCard_${idx}`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.style.borderColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#ec4899';
    }

    if (audio && item.audio) {
      audio.src = item.audio;
      audio.play().catch(e => console.log('[Storybook Audio error]', e));
    }
  }

  function toggleContinuousPlay() {
    if (isContinuousPlaying) {
      if (audio) audio.pause();
      updateContinuousUI(false);
    } else {
      updateContinuousUI(true);
      playWebtoonIndex(0);
    }
  }

  function updateContinuousUI(playing) {
    isContinuousPlaying = playing;
    const btn = document.getElementById('continuousPlayBtn');
    const icon = document.getElementById('continuousIcon');
    const text = document.getElementById('continuousText');
    if (!btn) return;
    if (playing) {
      btn.classList.add('playing');
      if (icon) icon.textContent = '⏸️';
      if (text) text.textContent = '연속 낭독 중지';
    } else {
      btn.classList.remove('playing');
      if (icon) icon.textContent = '▶';
      if (text) text.textContent = '처음부터 연속 낭독';
    }
  }

  // 전역 노출 바인딩
  window.initStorybook = initStorybook;
  window.setViewerMode = setViewerMode;
  window.changePage = changePage;
  window.toggleEbookAudio = toggleEbookAudio;
  window.toggleContinuousPlay = toggleContinuousPlay;
  window.playWebtoonCardAudio = playWebtoonCardAudio;

  window.addEventListener('DOMContentLoaded', () => {
    if (window.STORY_BOOK) {
      initStorybook(window.STORY_BOOK);
    }
  });
})();
