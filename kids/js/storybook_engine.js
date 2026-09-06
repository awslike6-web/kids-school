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
        } else if (autoPlay && currentPageIndex === STORY_DATA.length - 1) {
          setTimeout(() => showCompletionModal(), 1200);
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
            setTimeout(() => showCompletionModal(), 1000);
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
      nextBtn.textContent = (currentPageIndex === STORY_DATA.length - 1) ? '🎉 완독 축하 & 보상!' : '다음 장 ▶';
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
      showCompletionModal();
      return;
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

    const cardsHtml = STORY_DATA.map((item, idx) => {
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

    const finishCardHtml = `
      <div class="webtoon-finish-card">
        <div style="font-size: 3rem;">🎉</div>
        <h3>모든 이야기를 재미있게 읽었나요?</h3>
        <p>단원 동화를 끝까지 탐험한 친구에게 완독 축하 보상을 드려요!</p>
        <button type="button" class="btn-claim-reward" onclick="window.showCompletionModal()">
          🎁 완독 축하 보상 받기 (+3💎/🍬 &amp; +10 EXP)
        </button>
      </div>
    `;

    container.innerHTML = cardsHtml + finishCardHtml;
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

  // ========================================================
  // 🎁 스토리북 완독 보상 및 축하 모달 엔진
  // ========================================================
  function getCurrentReaderInfo() {
    const savedName = localStorage.getItem('currentUserName') || '';
    const userParam = new URLSearchParams(window.location.search).get('user');
    const currentChild = localStorage.getItem('currentChild') || '';
    const currentUser = localStorage.getItem('currentUser') || '';

    let isMinsu = true;
    if (userParam === 'daughter' || userParam === 'minseo' || currentChild === 'minseo' || currentUser === 'daughter' || savedName === '민서') {
      isMinsu = false;
    } else if (userParam === 'son' || userParam === 'minsu' || currentChild === 'minsu' || currentUser === 'son' || savedName === '민수') {
      isMinsu = true;
    }

    const childName = isMinsu ? '민수' : '민서';
    const isAdmin = (savedName === '아빠' || savedName === '엄마' || savedName === '어른' || savedName === 'admin');

    let subject = (STORY_BOOK && STORY_BOOK.subject) || '';
    if (!subject) {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('korean')) subject = '국어';
      else if (path.includes('math')) subject = '수학';
      else if (path.includes('english')) subject = '영어';
      else if (path.includes('science')) subject = '과학';
      else if (path.includes('society')) subject = '사회';
      else subject = '공부';
    }

    return { childName, isMinsu, isAdmin, subject };
  }

  async function dispenseStorybookReward(childName, subject, currencyAmount = 3, expAmount = 10) {
    const PROXY_URL = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) || "https://minmin-notion.awslike6.workers.dev";
    const INVENTORY_DB_ID = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.INVENTORY_DB_ID) || "374a27115b688042bb61e6a102242e12";

    try {
      const qResp = await fetch(`${PROXY_URL}/v1/databases/${INVENTORY_DB_ID}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
        body: JSON.stringify({ filter: { property: "이름", title: { equals: childName } } })
      });
      if (!qResp.ok) return false;
      const qData = await qResp.json();
      if (!qData.results || qData.results.length === 0) return false;

      const page = qData.results[0];
      const pageId = page.id;
      const props = page.properties;

      const patchProps = {};
      // 1. 재화 지급 (+3)
      if (childName === '민서') {
        const curHaribo = props["하리보 젤리 개수"]?.number || props["슬라임 파츠 개수"]?.number || 0;
        patchProps["하리보 젤리 개수"] = { number: curHaribo + currencyAmount };
      } else {
        const curDia = props["다이아몬드 개수"]?.number || 0;
        patchProps["다이아몬드 개수"] = { number: curDia + currencyAmount };
      }

      // 2. 과목 경험치 지급 (+10)
      const expPropName = `${subject} 경험치`;
      if (props[expPropName] !== undefined) {
        const curExp = props[expPropName]?.number || 0;
        patchProps[expPropName] = { number: curExp + expAmount };
      }

      // 3. 일일 과목 획득 누적
      const dailyPropName = `오늘 획득_${subject}`;
      if (props[dailyPropName] !== undefined) {
        const curDaily = props[dailyPropName]?.number || 0;
        patchProps[dailyPropName] = { number: curDaily + currencyAmount };
      }

      const pResp = await fetch(`${PROXY_URL}/v1/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
        body: JSON.stringify({ properties: patchProps })
      });

      return pResp.ok;
    } catch (err) {
      console.warn("[Storybook Reward Error]", err);
      return false;
    }
  }

  function showCompletionModal() {
    const { childName, isMinsu, isAdmin, subject } = getCurrentReaderInfo();
    const bookId = (STORY_BOOK && STORY_BOOK.id) || window.location.pathname.split('/').pop().replace('.html', '');
    const todayStr = new Date().toISOString().slice(0, 10);
    const rewardKey = `mimi_storybook_reward_${bookId}_${childName}_${todayStr}`;
    const alreadyClaimed = localStorage.getItem(rewardKey) === 'true';

    let modal = document.getElementById('storybookCompletionModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'storybookCompletionModal';
      modal.className = 'storybook-completion-overlay';
      document.body.appendChild(modal);
    }

    const currencyUnit = isMinsu ? '💎 다이아몬드 +3개' : '🍬 하리보 젤리 +3개';
    const expUnit = `⭐ ${subject} 경험치 +10 EXP`;

    let bodyHtml = '';
    if (isAdmin) {
      bodyHtml = `
        <div class="completion-modal-icon">🛠️</div>
        <div class="completion-modal-title">완독 시뮬레이션 완료!</div>
        <div class="completion-modal-desc">
          <strong>[관리자 모드]</strong> 데이터 오염 방지막이 가동 중입니다.<br>
          정상 환경에서는 아이에게 <strong>${currencyUnit}</strong> 및 <strong>${expUnit}</strong>가 자동 적립됩니다.
        </div>
        <div class="reward-highlight-badge">🎟️ 무한 패스 검수 완료</div>
      `;
    } else if (alreadyClaimed) {
      bodyHtml = `
        <div class="completion-modal-icon">🌟</div>
        <div class="completion-modal-title">또 한 번 멋지게 완독했어요!</div>
        <div class="completion-modal-desc">
          이야기를 다시 읽으며 지식을 쑥쑥 다졌네요!<br>
          오늘의 완독 보상은 이미 받았지만, 반복해서 탐구하는 ${childName}의 모습이 최고예요! 👍
        </div>
        <div class="reward-highlight-badge">✨ 오늘도 완독 마스터!</div>
      `;
    } else {
      bodyHtml = `
        <div class="completion-modal-icon">🎉</div>
        <div class="completion-modal-title">축하합니다! 완독 달성!</div>
        <div class="completion-modal-desc">
          동화를 끝까지 훌륭하게 읽었어요!<br>
          멋진 탐험가 ${childName}에게 완독 보상을 지급합니다.
        </div>
        <div class="reward-highlight-badge">${currencyUnit} &amp; ${expUnit}</div>
      `;
      localStorage.setItem(rewardKey, 'true');
      dispenseStorybookReward(childName, subject, 3, 10).then(success => {
        console.log(`[스토리북 보상 결과] ${childName} 완독 보상 지급:`, success);
      });
    }

    const backUrl = (STORY_BOOK && STORY_BOOK.backUrl) || 'javascript:history.back()';
    const backLabel = (STORY_BOOK && STORY_BOOK.backLabel) || '과목방으로 돌아가기';

    modal.innerHTML = `
      <div class="completion-modal-box">
        ${bodyHtml}
        <div class="completion-btn-row">
          <button type="button" class="btn-re-read" onclick="window.closeCompletionModal(true)">🔄 다시 읽기</button>
          <a href="${backUrl}" class="btn-back-room">🚪 ${backLabel}</a>
        </div>
      </div>
    `;
    modal.style.display = 'flex';
  }

  function closeCompletionModal(reRead = false) {
    const modal = document.getElementById('storybookCompletionModal');
    if (modal) modal.style.display = 'none';
    if (reRead) {
      currentPageIndex = 0;
      if (currentMode === 'ebook') {
        renderEbook();
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  // 전역 노출 바인딩
  window.initStorybook = initStorybook;
  window.setViewerMode = setViewerMode;
  window.changePage = changePage;
  window.toggleEbookAudio = toggleEbookAudio;
  window.toggleContinuousPlay = toggleContinuousPlay;
  window.playWebtoonCardAudio = playWebtoonCardAudio;
  window.showCompletionModal = showCompletionModal;
  window.closeCompletionModal = closeCompletionModal;
  window.dispenseStorybookReward = dispenseStorybookReward;

  window.addEventListener('DOMContentLoaded', () => {
    if (window.STORY_BOOK) {
      initStorybook(window.STORY_BOOK);
    }
  });
})();
