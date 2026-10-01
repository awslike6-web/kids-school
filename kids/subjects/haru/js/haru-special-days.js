/**
 * 🏆 haru-special-days.js
 * 초등 1-2 통합교과 '하루' - 특별한 날 추억 피드 & 포토 갤러리 엔진
 * - 특별한 날 추억 피드 (학교 축제, 생일, 소풍, 현장학습 이야기)
 * - 고화질 사진 전체보기 팝업 모달 & 동영상 바로가기 연동
 * - 4종 감정 도장 & 나만의 느낌 한 줄 작성
 * - 제목 인라인 편집 및 신규 특별한 날 추억 등록
 */

(() => {
  let selectedStoryPhotoBase64 = "";

  function handleStoryPhotoSelect(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      selectedStoryPhotoBase64 = e.target.result;
      const previewBox = document.getElementById("storyImgPreviewBox");
      const previewImg = document.getElementById("storyImgPreview");
      if (previewBox && previewImg) {
        previewImg.src = selectedStoryPhotoBase64;
        previewBox.style.display = "flex";
      }
    };
    reader.readAsDataURL(file);
  }

  function handleStoryUrlInput(url) {
    const trimmed = url ? url.trim() : "";
    const previewBox = document.getElementById("storyImgPreviewBox");
    const previewImg = document.getElementById("storyImgPreview");
    if (!previewBox || !previewImg) return;

    if (trimmed) {
      selectedStoryPhotoBase64 = trimmed;
      previewImg.src = trimmed;
      previewBox.style.display = "flex";
    } else {
      selectedStoryPhotoBase64 = "";
      previewBox.style.display = "none";
    }
  }

  function getSpecialStories() {
    const child = window.currentChild || "minseo";
    const defaults = (window.HARU_DATA?.specialDays?.defaultEvents) || [];
    let customMeta = {};
    try {
      const rawMeta = localStorage.getItem("SPECIAL_DAYS_CUSTOM_META");
      if (rawMeta) customMeta = JSON.parse(rawMeta);
    } catch(e) {}

    try {
      const saved = localStorage.getItem("haru_special_stories_" + child);
      if (saved) {
        const parsed = JSON.parse(saved);
        const customStories = parsed.filter(s => s.id && s.id.startsWith("evt_custom_"));
        const mergedDefaults = defaults.map(def => {
          let res = { ...def };
          if (customMeta[def.id]) {
            res = { ...res, ...customMeta[def.id] };
          }
          const found = parsed.find(s => s.id === def.id);
          if (found && found._userEditedTitle) {
            res.title = found.title;
            res._userEditedTitle = true;
          }
          return res;
        });
        return [...customStories, ...mergedDefaults];
      }
    } catch(e) {}

    return defaults.map(def => {
      if (customMeta[def.id]) {
        return { ...def, ...customMeta[def.id] };
      }
      return def;
    });
  }

  function switchCardPhoto(event, thumbEl, targetUrl, mainImgId) {
    if (event) event.stopPropagation();
    const mainImg = document.getElementById(mainImgId);
    if (mainImg) {
      mainImg.src = targetUrl;
    }
    const parent = thumbEl.parentElement;
    if (parent) {
      parent.querySelectorAll('.special-card-thumb-btn').forEach(btn => btn.classList.remove('active'));
      thumbEl.classList.add('active');
    }
  }

  function openSpecialPhotoModal(storyId, mainImgId) {
    const modal = document.getElementById("specialPhotoModalOverlay");
    const modalImg = document.getElementById("photoModalImg");
    const modalTitle = document.getElementById("photoModalTitle");
    const modalThumbs = document.getElementById("photoModalThumbs");
    const modalCaption = document.getElementById("photoModalCaption");
    if (!modal || !modalImg) return;

    const stories = getSpecialStories();
    const story = stories.find(s => s.id === storyId);
    if (!story) return;

    if (modalTitle) {
      modalTitle.innerHTML = `<span>📸</span> ${story.title || '사진 전체보기'}`;
    }

    let currentSrc = story.imageUrl;
    if (mainImgId) {
      const cardMainImg = document.getElementById(mainImgId);
      if (cardMainImg && cardMainImg.src) {
        currentSrc = cardMainImg.src;
      }
    }
    modalImg.src = currentSrc;

    const galleryList = (story.galleryImages && story.galleryImages.length > 0) ? story.galleryImages : (story.imageUrl ? [story.imageUrl] : []);

    if (modalThumbs) {
      if (galleryList.length > 1) {
        modalThumbs.innerHTML = galleryList.map((gUrl, idx) => `
          <button type="button" class="photo-modal-thumb-btn ${gUrl === currentSrc ? 'active' : ''}" onclick="switchModalPhoto(this, '${gUrl}')" title="사진 ${idx + 1}">
            <img src="${gUrl}" alt="사진 ${idx + 1}" />
          </button>
        `).join("");
        modalThumbs.style.display = "flex";
      } else {
        modalThumbs.innerHTML = "";
        modalThumbs.style.display = "none";
      }
    }

    if (modalCaption) {
      modalCaption.textContent = `📅 ${story.date || '특별한 날'} · ${galleryList.length > 1 ? '아래 썸네일을 눌러 사진을 바꿔볼 수 있어요' : '사진 전체보기'}`;
    }

    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function switchModalPhoto(btn, targetUrl) {
    const modalImg = document.getElementById("photoModalImg");
    if (modalImg) modalImg.src = targetUrl;
    const parent = btn.parentElement;
    if (parent) {
      parent.querySelectorAll(".photo-modal-thumb-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    }
  }

  function closeSpecialPhotoModal() {
    const modal = document.getElementById("specialPhotoModalOverlay");
    if (modal) modal.classList.remove("active");
    document.body.style.overflow = "auto";
  }

  function stampReaction(event, storyId, emoji, label, storyTitle) {
    if (event) event.stopPropagation();
    const child = window.currentChild || "minseo";
    const childName = child === "minsu" ? "민수" : "민서";
    const isMinsu = child === "minsu";
    const curSymbol = isMinsu ? "다이아 2개(+💎💎)" : "젤리 2개(+🍬🍬)";
    const curWord = isMinsu ? "다이아몬드 2개" : "젤리 2개";

    const stampKey = `haru_stamp_${child}_${storyId}`;
    const alreadyStamped = localStorage.getItem(stampKey);

    const stampData = {
      emoji: emoji,
      label: label,
      date: new Date().toISOString().slice(5, 10).replace("-", "/")
    };
    localStorage.setItem(stampKey, JSON.stringify(stampData));

    if (!alreadyStamped) {
      if (typeof window.grantReward === "function") {
        window.grantReward(2, `특별한 하루 추억 도장: ${label}`);
      }
      if (typeof window.speakText === "function") {
        window.speakText(`${childName}가 [${label}] 감정 도장을 쾅 찍었네요! 신나는 하루 추억을 완성해서 ${curWord}를 선물합니다!`);
      }
      alert(`🎉 도장 쾅! [${emoji} ${label}] 도장이 찍혔습니다!\n추억을 완성해서 ${curSymbol}를 선물 받았어요!`);
    } else {
      if (typeof window.speakText === "function") {
        window.speakText(`${childName}의 마음이 [${label}] 도장으로 바뀌었어요!`);
      }
    }

    renderSpecialDaysTab();
  }

  function toggleEditTitle(event, storyId) {
    if (event) event.stopPropagation();
    const editBox = document.getElementById(`title_edit_box_${storyId}`);
    const displayBox = document.getElementById(`title_display_${storyId}`);
    if (!editBox) return;

    const isHidden = editBox.style.display === "none" || !editBox.style.display;
    editBox.style.display = isHidden ? "flex" : "none";
    if (displayBox) displayBox.style.display = isHidden ? "none" : "block";

    if (isHidden) {
      const input = document.getElementById(`title_edit_input_${storyId}`);
      if (input) {
        input.focus();
        input.select();
      }
    }
  }

  function saveEditedTitle(event, storyId) {
    if (event) event.stopPropagation();
    const input = document.getElementById(`title_edit_input_${storyId}`);
    if (!input) return;

    const newTitle = input.value.trim();
    if (!newTitle) {
      alert("제목을 입력해 주세요! ✏️");
      return;
    }

    const child = window.currentChild || "minseo";
    const stories = JSON.parse(JSON.stringify(getSpecialStories()));
    const story = stories.find(s => s.id === storyId);
    if (story) {
      story.title = newTitle;
      story._userEditedTitle = true;
      localStorage.setItem("haru_special_stories_" + child, JSON.stringify(stories));
      renderSpecialDaysTab();
      if (typeof window.speakText === "function") {
        window.speakText(`제목이 '${newTitle}'(으)로 변경되었어요!`);
      }
    }
  }

  function toggleCustomStampInput(event, storyId) {
    if (event) event.stopPropagation();
    const row = document.getElementById(`custom_stamp_row_${storyId}`);
    if (!row) return;

    const isHidden = row.style.display === "none" || !row.style.display;
    row.style.display = isHidden ? "flex" : "none";
    if (isHidden) {
      const input = document.getElementById(`custom_stamp_input_${storyId}`);
      if (input) {
        input.focus();
        input.select();
      }
    }
  }

  function submitCustomStamp(event, storyId, storyTitle) {
    if (event) event.stopPropagation();
    const input = document.getElementById(`custom_stamp_input_${storyId}`);
    if (!input) return;

    const text = input.value.trim();
    if (!text) {
      alert("느낌이나 생각을 적어주세요! (예: 너무 신났어! 😋)");
      return;
    }

    const emojiMatch = text.match(/^(\p{Emoji})/u);
    const emoji = emojiMatch ? emojiMatch[1] : "💮";
    const label = emojiMatch ? text.slice(emoji.length).trim() : text;

    stampReaction(event, storyId, emoji, label || text, storyTitle);
  }

  function handleNewStoryStampPreset(val) {
    const customInput = document.getElementById("newStoryCustomStamp");
    if (!customInput) return;
    if (val === "custom") {
      customInput.style.display = "block";
      customInput.focus();
    } else {
      customInput.style.display = "none";
    }
  }

  function renderSpecialDaysTab() {
    const container = document.getElementById("specialFeedGrid");
    if (!container) return;

    const child = window.currentChild || "minseo";
    const childName = child === "minsu" ? "민수" : "민서";
    const stories = getSpecialStories();

    container.innerHTML = stories.map((s, idx) => {
      const hasPhoto = !!s.imageUrl;
      const category = s.category || "특별한날";
      const categoryIcon = s.categoryIcon || (hasPhoto ? "🌱" : (s.icon || "🌟"));
      const galleryList = (s.galleryImages && s.galleryImages.length > 0) ? s.galleryImages : (hasPhoto ? [s.imageUrl] : []);
      const mainImgId = `main_img_${s.id || idx}`;

      const stampKey = `haru_stamp_${child}_${s.id}`;
      let savedStamp = null;
      try {
        const raw = localStorage.getItem(stampKey);
        if (raw) savedStamp = JSON.parse(raw);
      } catch(e) {}

      const stampBtns = [
        { emoji: "😆", label: "꿀잼" },
        { emoji: "😲", label: "신기해" },
        { emoji: "🧺", label: "뿌듯해" },
        { emoji: "😋", label: "고소해" }
      ];

      const titleRowHtml = `
        <div class="special-card-title-row">
          <div class="special-card-title" id="title_display_${s.id}">${s.title}</div>
          <button class="title-edit-btn" onclick="toggleEditTitle(event, '${s.id}')" title="제목 직접 수정하기">✏️</button>
        </div>
        <div id="title_edit_box_${s.id}" class="title-edit-row" style="display:none;" onclick="event.stopPropagation();">
          <input type="text" id="title_edit_input_${s.id}" class="title-edit-input" value="${s.title}" placeholder="새로운 제목 입력" onkeydown="if(event.key==='Enter') saveEditedTitle(event, '${s.id}')" />
          <button class="title-save-btn" onclick="saveEditedTitle(event, '${s.id}')">저장</button>
          <button class="title-cancel-btn" onclick="toggleEditTitle(event, '${s.id}')">취소</button>
        </div>
      `;

      const stampHtml = `
        <div class="special-card-reactions">
          <div class="reaction-label">
            <span>💮 ${childName}의 감정 도장:</span>
            ${savedStamp ? `<span style="font-size:0.75rem; color:#2ed573;">완성됨 ✨</span>` : `<span style="font-size:0.75rem; color:#888;">도장 찍고 젤리 받기 🍬</span>`}
          </div>
          <div class="reaction-btns">
            ${stampBtns.map(st => {
              const isSelected = savedStamp && savedStamp.label === st.label;
              return `<button class="reaction-stamp-btn ${isSelected ? 'selected' : ''}" onclick="stampReaction(event, '${s.id}', '${st.emoji}', '${st.label}', '${s.title}')">${st.emoji} ${st.label}</button>`;
            }).join("")}
            <button class="reaction-stamp-btn custom-btn" onclick="toggleCustomStampInput(event, '${s.id}')" title="내 느낌 직접 쓰기">✏️ 직접 쓰기</button>
          </div>
          <div id="custom_stamp_row_${s.id}" class="custom-stamp-input-row" style="display:none;" onclick="event.stopPropagation();">
            <input type="text" id="custom_stamp_input_${s.id}" class="custom-stamp-input" placeholder="나만의 느낌 쓰기 (예: 너무 재밌었어!)" maxlength="15" onkeydown="if(event.key==='Enter') submitCustomStamp(event, '${s.id}', '${s.title}')" />
            <button class="custom-stamp-submit-btn" onclick="submitCustomStamp(event, '${s.id}', '${s.title}')">도장 쾅! 💮</button>
          </div>
          ${savedStamp ? `<div class="reaction-stamp-badge"><span>💖</span> <b>${childName}의 소감:</b> [${savedStamp.emoji} ${savedStamp.label}!] (${savedStamp.date})</div>` : ''}
        </div>
      `;

      const videoList = (s.videos && Array.isArray(s.videos) && s.videos.length > 0)
        ? s.videos
        : (s.videoUrl ? [{ url: s.videoUrl, text: s.videoBtnText, icon: "🎬" }] : []);

      let videoBtnHtml = "";
      if (videoList.length > 0) {
        videoBtnHtml = `
          <div class="special-card-video-wrap" style="display:flex; flex-direction:column; gap:8px;" onclick="event.stopPropagation();">
            ${videoList.map(v => {
              const label = v.text || (v.url && v.url.includes("photos.app.goo.gl") ? "구글 포토 영상 보러가기" : "동영상 보러가기");
              const icon = v.icon || "🎬";
              return `
                <a href="${v.url}" target="_blank" rel="noopener noreferrer" class="special-card-video-btn" title="동영상 감상하기 (구글 포토/유튜브/드라이브)">
                  <div class="video-btn-left">
                    <span class="video-btn-icon">${icon}</span>
                    <span class="video-btn-text">${label}</span>
                  </div>
                  <span class="video-btn-badge">고화질 재생 ➔</span>
                </a>
              `;
            }).join("")}
          </div>
        `;
      }

      if (hasPhoto) {
        const thumbsHtml = galleryList.length > 1 ? `
          <div class="special-card-thumbs">
            ${galleryList.map((gUrl, gIdx) => `
              <button class="special-card-thumb-btn ${gIdx === 0 ? 'active' : ''}" onclick="switchCardPhoto(event, this, '${gUrl}', '${mainImgId}')" title="사진 ${gIdx + 1}">
                <img src="${gUrl}" alt="썸네일 ${gIdx + 1}" />
              </button>
            `).join("")}
          </div>
        ` : "";

        return `
          <div class="special-card has-photo" id="special_card_${s.id}" onclick="toggleSpeakStoryText('${s.id}', '${s.title}', '${s.desc}')" title="터치하면 이야기 낭독 / 다시 터치하면 멈춤 ⏹️">
            <div class="special-card-img-wrap" onclick="event.stopPropagation(); openSpecialPhotoModal('${s.id}', '${mainImgId}')" title="터치하면 사진을 팝업으로 전체 감상해요 🔍">
              <span class="special-card-category-chip">${categoryIcon} ${category}</span>
              ${galleryList.length > 1 ? `<span class="special-card-photo-count">📷 사진 ${galleryList.length}장</span>` : ''}
              ${videoList.length > 0 ? `<span class="special-card-video-chip">🎬 영상 ${videoList.length > 1 ? `${videoList.length}편 ` : ''}포함</span>` : ''}
              <span class="special-card-zoom-chip">🔍 전체보기</span>
              <img id="${mainImgId}" src="${s.imageUrl}" class="special-card-img" alt="${s.title}" onerror="this.parentElement.style.display='none';" />
            </div>
            ${thumbsHtml}
            ${titleRowHtml}
            <div class="special-card-date">📅 ${s.date || '특별한 날'}</div>
            <p class="special-card-desc">${s.desc}</p>
            ${videoBtnHtml}
            ${stampHtml}
          </div>
        `;
      }

      return `
        <div class="special-card" id="special_card_${s.id}" onclick="toggleSpeakStoryText('${s.id}', '${s.title}', '${s.desc}')" title="터치하면 이야기 낭독 / 다시 터치하면 멈춤 ⏹️">
          <div class="special-card-icon">${s.icon || '🌟'}</div>
          ${titleRowHtml}
          <div class="special-card-date">📅 ${s.date || '특별한 날'}</div>
          <p class="special-card-desc">${s.desc}</p>
          ${videoBtnHtml}
          ${stampHtml}
        </div>
      `;
    }).join("");
  }

  function addNewSpecialStory() {
    const catInput = document.getElementById("newStoryCategory");
    const titleInput = document.getElementById("newStoryTitle");
    const dateInput = document.getElementById("newStoryDate");
    const descInput = document.getElementById("newStoryDesc");
    const fileInput = document.getElementById("newStoryFileInput");
    const urlInput = document.getElementById("newStoryUrlInput");
    const videoInput = document.getElementById("newStoryVideoInput");

    if (!titleInput || !descInput) return;

    const category = catInput ? catInput.value : "특별한날";
    const title = titleInput.value.trim();
    const date = dateInput && dateInput.value.trim() ? dateInput.value.trim() : new Date().toISOString().slice(0, 10);
    const desc = descInput.value.trim();
    const photoUrl = selectedStoryPhotoBase64 || (urlInput ? urlInput.value.trim() : "");
    const videoUrl = videoInput ? videoInput.value.trim() : "";

    if (!title || !desc) {
      alert("특별한 날의 제목과 즐거웠던 이야기를 적어주세요! ✏️");
      return;
    }

    const categoryIconMap = {
      "생태/텃밭": "🌱",
      "학교활동": "🎒",
      "가을소풍": "🍁",
      "가족기념일": "🎂",
      "자연관찰": "🌿",
      "특별한날": "⭐"
    };

    const stampPreset = document.getElementById("newStoryStampPreset") ? document.getElementById("newStoryStampPreset").value : "";
    const customStampInput = document.getElementById("newStoryCustomStamp") ? document.getElementById("newStoryCustomStamp").value.trim() : "";

    let initialStamp = null;
    if (stampPreset === "custom" && customStampInput) {
      const emojiMatch = customStampInput.match(/^(\p{Emoji})/u);
      const emoji = emojiMatch ? emojiMatch[1] : "💮";
      const label = emojiMatch ? customStampInput.slice(emoji.length).trim() : customStampInput;
      initialStamp = { emoji: emoji, label: label || customStampInput, date: new Date().toISOString().slice(5, 10).replace("-", "/") };
    } else if (stampPreset && stampPreset !== "custom") {
      const parts = stampPreset.split(" ");
      initialStamp = { emoji: parts[0], label: parts.slice(1).join(" "), date: new Date().toISOString().slice(5, 10).replace("-", "/") };
    }

    const child = window.currentChild || "minseo";
    const newStoryId = "evt_custom_" + Date.now();
    if (initialStamp) {
      localStorage.setItem(`haru_stamp_${child}_${newStoryId}`, JSON.stringify(initialStamp));
    }

    const stories = getSpecialStories();
    stories.unshift({
      id: newStoryId,
      category: category,
      categoryIcon: categoryIconMap[category] || "⭐",
      title: `✨ ${title}`,
      date: date,
      desc: desc,
      icon: categoryIconMap[category] || "💖",
      imageUrl: photoUrl || null,
      videoUrl: videoUrl || null
    });

    localStorage.setItem("haru_special_stories_" + child, JSON.stringify(stories));
    titleInput.value = "";
    if (dateInput) dateInput.value = "";
    descInput.value = "";
    if (fileInput) fileInput.value = "";
    if (urlInput) urlInput.value = "";
    if (videoInput) videoInput.value = "";
    if (document.getElementById("newStoryCustomStamp")) {
      document.getElementById("newStoryCustomStamp").value = "";
      document.getElementById("newStoryCustomStamp").style.display = "none";
    }
    if (document.getElementById("newStoryStampPreset")) {
      document.getElementById("newStoryStampPreset").value = "😆 꿀잼";
    }
    selectedStoryPhotoBase64 = "";
    const previewBox = document.getElementById("storyImgPreviewBox");
    if (previewBox) previewBox.style.display = "none";

    renderSpecialDaysTab();

    const isMinsu = child === "minsu";
    const curSymbol = isMinsu ? "다이아 2개(+💎💎)" : "젤리 2개(+🍬🍬)";
    const curWord = isMinsu ? "다이아몬드 2개" : "젤리 2개";
    if (typeof window.grantReward === "function") {
      window.grantReward(2, `특별한 하루 추억 작성: ${title}`);
    }
    if (typeof window.speakText === "function") {
      window.speakText(`새로운 특별한 하루 이야기 [${title}]이 우리 게시판에 등록되었어요! ${curWord}를 선물합니다!`);
    }
    alert(`🎉 [${title}] 이야기가 추억 게시판에 등록되었습니다! ${curSymbol}를 받았어요!\n\n💡 팁: 학교 사진을 12년 성장 아카이브(kids-archive)에 영구 보존하려면 [scripts/add_activity_photo.py] 도구를 활용해 보세요!`);
  }

  // 전역 네임스페이스 바인딩
  window.handleStoryPhotoSelect = handleStoryPhotoSelect;
  window.handleStoryUrlInput = handleStoryUrlInput;
  window.getSpecialStories = getSpecialStories;
  window.switchCardPhoto = switchCardPhoto;
  window.openSpecialPhotoModal = openSpecialPhotoModal;
  window.switchModalPhoto = switchModalPhoto;
  window.closeSpecialPhotoModal = closeSpecialPhotoModal;
  window.stampReaction = stampReaction;
  window.toggleEditTitle = toggleEditTitle;
  window.saveEditedTitle = saveEditedTitle;
  window.toggleCustomStampInput = toggleCustomStampInput;
  window.submitCustomStamp = submitCustomStamp;
  window.handleNewStoryStampPreset = handleNewStoryStampPreset;
  window.renderSpecialDaysTab = renderSpecialDaysTab;
  window.addNewSpecialStory = addNewSpecialStory;

  window.HaruSpecialDaysEngine = {
    getSpecialStories,
    renderSpecialDaysTab,
    openSpecialPhotoModal,
    closeSpecialPhotoModal,
    addNewSpecialStory
  };
})();
