
    const PROXY_URL = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL) ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
    const CURRICULUM_DB_ID = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.CURRICULUM_DB_ID) ? APP_CONFIG.CURRICULUM_DB_ID : "3e8a27115b68806d94bfc81e9b3435fa";
    const VOCA_DB_ID = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.VOCA_DB_ID) ? APP_CONFIG.VOCA_DB_ID : "375a27115b688038b686d3994ee12919";
    const GITHUB_REPO = 'awslike6-web/kids-school';
    const GITHUB_BRANCH = 'main';

    let currentMode = 'curriculum'; // 'curriculum' | 'voca'
    let allNotionItems = [];
    let modifiedItems = new Map(); // pageId -> itemObj

    window.addEventListener('DOMContentLoaded', () => {
      refreshCurrentModeData();
    });

    // 🎛️ 모드 전환 핸들러
    function switchMode(mode) {
      if (currentMode === mode) return;
      currentMode = mode;

      const tabCurriculum = document.getElementById('tabCurriculum');
      const tabVoca = document.getElementById('tabVoca');
      const zoneFilterGroup = document.getElementById('zoneFilterGroup');

      if (mode === 'curriculum') {
        tabCurriculum.className = 'mode-tab-btn active curriculum-active';
        tabVoca.className = 'mode-tab-btn';
        zoneFilterGroup.style.display = 'flex';
      } else {
        tabCurriculum.className = 'mode-tab-btn';
        tabVoca.className = 'mode-tab-btn active voca-active';
        zoneFilterGroup.style.display = 'none'; // 용어사전 모드에서는 구역 필터 숨김
      }

      modifiedItems.clear();
      refreshCurrentModeData();
    }

    function refreshCurrentModeData() {
      if (currentMode === 'curriculum') {
        refreshCurriculumData();
      } else {
        refreshVocaData();
      }
    }

    // =========================================================
    // 🏛️ 1. 교재·사료 마스터 DB 데이터 fetch
    // =========================================================
    async function refreshCurriculumData() {
      const statsChip = document.getElementById('statsChip');
      statsChip.innerHTML = '<span class="notion-live-dot" style="background:#e3b341;"></span> 교재 DB 동기화 중...';
      
      const grid = document.getElementById('questionGrid');
      grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:3rem; color:#8b949e;">📡 노션 교재·사료 마스터 DB에서 실시간 데이터를 가져오는 중입니다...</div>';

      try {
        const url = `${PROXY_URL}/v1/databases/${CURRICULUM_DB_ID}/query`;
        let results = [];
        let hasMore = true;
        let cursor = null;

        while (hasMore) {
          const bodyPayload = { page_size: 100 };
          if (cursor) bodyPayload.start_cursor = cursor;

          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
            body: JSON.stringify(bodyPayload)
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          results = results.concat(data.results || []);
          hasMore = data.has_more || false;
          cursor = data.next_cursor || null;
        }

        allNotionItems = results.map(parseCurriculumPage);
        updateUnitSelectOptions();
        updateZoneSelectOptions();
        renderQuestions();

        statsChip.innerHTML = `<span class="notion-live-dot"></span> 교재 DB 연동됨 (${allNotionItems.length}개)`;
        showToast(`✅ 교재 DB에서 총 ${allNotionItems.length}개 항목을 성공적으로 불러왔습니다!`);
      } catch (err) {
        console.error("교재 DB 동기화 실패:", err);
        statsChip.innerHTML = `<span class="notion-live-dot" style="background:#f85149;"></span> 통신 오류`;
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem; color:#ff7b72;">
          ❌ 교재 데이터베이스를 불러오지 못했습니다.<br><small>${err.message}</small>
        </div>`;
      }
    }

    function parseCurriculumPage(page) {
      const p = page.properties || {};
      const title = (p["제목"]?.title || []).map(x => x.plain_text).join('').trim() || '무제';
      const subject = p["과목"]?.select?.name || '사회';
      const grade = p["학년"]?.select?.name || '5-2';
      const unit = (p["단원"]?.rich_text || []).map(x => x.plain_text).join('').trim() || '1단원';
      const zone = p["구역"]?.select?.name || '자료분석';
      const mediaUrl = p["미디어 URL"]?.url || '';
      const interactiveUrl = p["인터랙티브 URL"]?.url || '';
      const desc = (p["핵심 쓰임새/설명"]?.rich_text || []).map(x => x.plain_text).join('').trim();
      const quiz = (p["퀴즈 질문"]?.rich_text || []).map(x => x.plain_text).join('').trim();
      const choicesText = (p["보기 1~4"]?.rich_text || []).map(x => x.plain_text).join('').trim();
      const choices = choicesText ? choicesText.split('\n').map(s => s.trim()).filter(Boolean) : [];
      const ans = p["정답"]?.number ?? null;
      const explanation = (p["해설"]?.rich_text || []).map(x => x.plain_text).join('').trim();

      return {
        mode: 'curriculum',
        pageId: page.id,
        notionUrl: `https://app.notion.com/p/${page.id.replace(/-/g, '')}`,
        title,
        subject,
        grade,
        unit,
        zone,
        mediaUrl,
        interactiveUrl,
        desc,
        quiz,
        choices,
        choicesText,
        ans,
        explanation,
        _previewUrl: mediaUrl,
        _isModified: false,
        _compressedBlob: null,
        _fileName: ''
      };
    }

    // =========================================================
    // 📚 2. 용어사전 DB (VOCA) 데이터 fetch
    // =========================================================
    async function refreshVocaData() {
      const statsChip = document.getElementById('statsChip');
      statsChip.innerHTML = '<span class="notion-live-dot" style="background:#a371f7;"></span> 용어사전 DB 동기화 중...';
      
      const grid = document.getElementById('questionGrid');
      grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:3rem; color:#8b949e;">📡 노션 용어사전 DB(VOCA)에서 실시간 낱말 데이터를 가져오는 중입니다...</div>';

      try {
        const url = `${PROXY_URL}/v1/databases/${VOCA_DB_ID}/query`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
          body: JSON.stringify({ page_size: 100 })
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        allNotionItems = (data.results || []).map(parseVocaPage);
        updateUnitSelectOptions();
        renderQuestions();

        statsChip.innerHTML = `<span class="notion-live-dot" style="background:#a371f7;"></span> 용어 DB 연동됨 (${allNotionItems.length}개)`;
        showToast(`✅ 용어사전 DB에서 총 ${allNotionItems.length}개 낱말을 성공적으로 불러왔습니다!`);
      } catch (err) {
        console.error("용어사전 DB 동기화 실패:", err);
        statsChip.innerHTML = `<span class="notion-live-dot" style="background:#f85149;"></span> 통신 오류`;
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem; color:#ff7b72;">
          ❌ 용어사전 데이터베이스를 불러오지 못했습니다.<br><small>${err.message}</small>
        </div>`;
      }
    }

    function parseVocaPage(page) {
      const p = page.properties || {};
      const title = (p["단어"]?.title || []).map(x => x.plain_text).join('').trim() || '무제';
      
      // multi_select 과목 & 학년 파싱
      const subjectList = (p["과목"]?.multi_select || []).map(x => x.name);
      const subject = subjectList.length > 0 ? subjectList[0] : '사회';
      const gradeList = (p["학년"]?.multi_select || []).map(x => x.name);
      const grade = gradeList.length > 0 ? gradeList[0] : '5-1';
      
      const unit = (p["단원"]?.rich_text || []).map(x => x.plain_text).join('').trim() || '1단원';
      const meaning = (p["뜻풀이"]?.rich_text || []).map(x => x.plain_text).join('').trim();
      const desc = (p["상세설명"]?.rich_text || []).map(x => x.plain_text).join('').trim();
      const pos = (p["품사"]?.rich_text || []).map(x => x.plain_text).join('').trim();

      // files 속성 이미지 파싱
      const imgFiles = p["이미지파일"]?.files || [];
      let mediaUrl = '';
      if (imgFiles.length > 0) {
        mediaUrl = imgFiles[0].external?.url || imgFiles[0].file?.url || '';
      }

      return {
        mode: 'voca',
        pageId: page.id,
        notionUrl: `https://app.notion.com/p/${page.id.replace(/-/g, '')}`,
        title,
        subject,
        grade,
        unit,
        zone: '용어카드',
        meaning,
        desc,
        pos,
        mediaUrl,
        _previewUrl: mediaUrl,
        _isModified: false,
        _compressedBlob: null,
        _fileName: ''
      };
    }

    function updateUnitSelectOptions() {
      const unitSelect = document.getElementById('unitSelect');
      const subject = document.getElementById('subjectSelect').value;
      const grade = document.getElementById('gradeSelect').value;

      const units = new Set();
      allNotionItems.forEach(item => {
        if (subject === 'all' || item.subject === subject) {
          if (grade === 'all' || item.grade === grade) {
            if (item.unit) units.add(item.unit);
          }
        }
      });

      const prevVal = unitSelect.value;
      unitSelect.innerHTML = '<option value="all" selected>전체 단원</option>';
      Array.from(units).sort().forEach(u => {
        const opt = document.createElement('option');
        opt.value = u;
        opt.textContent = u;
        unitSelect.appendChild(opt);
      });
      if (units.has(prevVal)) {
        unitSelect.value = prevVal;
      }
    }

    function updateZoneSelectOptions() {
      const zoneSelect = document.getElementById('zoneSelect');
      if (!zoneSelect) return;
      const subject = document.getElementById('subjectSelect').value;
      const grade = document.getElementById('gradeSelect').value;

      const zones = new Set();
      allNotionItems.forEach(item => {
        if (subject === 'all' || item.subject === subject) {
          if (grade === 'all' || item.grade === grade) {
            if (item.zone) zones.add(item.zone);
          }
        }
      });

      const prevVal = zoneSelect.value;
      zoneSelect.innerHTML = '<option value="all" selected>전체 보기</option>';
      Array.from(zones).sort().forEach(z => {
        const opt = document.createElement('option');
        opt.value = z;
        opt.textContent = z;
        zoneSelect.appendChild(opt);
      });
      if (zones.has(prevVal)) {
        zoneSelect.value = prevVal;
      }
    }

    function onFilterChange() {
      updateUnitSelectOptions();
      updateZoneSelectOptions();
      renderQuestions();
    }

    function renderQuestions() {
      const grid = document.getElementById('questionGrid');
      const subject = document.getElementById('subjectSelect').value;
      const grade = document.getElementById('gradeSelect').value;
      const unit = document.getElementById('unitSelect').value;
      const zone = document.getElementById('zoneSelect').value;
      const statusFilter = document.getElementById('statusFilter').value;

      let filtered = allNotionItems.filter(item => {
        if (subject !== 'all' && item.subject !== subject) return false;
        if (grade !== 'all' && item.grade !== grade) return false;
        if (unit !== 'all' && item.unit !== unit) return false;
        if (currentMode === 'curriculum' && zone !== 'all' && item.zone !== zone) return false;

        const hasImg = !!(item._previewUrl || item.mediaUrl);
        if (statusFilter === 'no-img' && hasImg) return false;
        if (statusFilter === 'modified' && !item._isModified) return false;

        return true;
      });

      const statsChip = document.getElementById('statsChip');
      const dotColor = currentMode === 'curriculum' ? '#3fb950' : '#a371f7';
      const modeLabel = currentMode === 'curriculum' ? '교재 DB' : '용어사전 DB';
      statsChip.innerHTML = `<span class="notion-live-dot" style="background:${dotColor}; box-shadow:0 0 8px ${dotColor};"></span> ${modeLabel} (${filtered.length}개 표시 / 전체 ${allNotionItems.length}개)`;

      grid.innerHTML = '';
      if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:3rem; color:#8b949e;">선택된 조건에 해당하는 항목이 없습니다.</div>';
        return;
      }

      filtered.forEach((item, idx) => {
        const card = document.createElement('div');
        const hasImg = !!(item._previewUrl || item.mediaUrl);
        card.className = 'question-card' + (item._isModified ? ' modified' : '') + (!hasImg ? ' no-image-card' : '');

        let tagClass = 'tag-chart';
        if (item.zone === '지도탐방') tagClass = 'tag-map';
        else if (item.zone === '역사사료') tagClass = 'tag-history';
        else if (item.zone === '용어카드') tagClass = 'tag-voca';

        const displayUrl = item._previewUrl || item.mediaUrl;

        if (currentMode === 'curriculum') {
          // 🏛️ 교재 모드 카드 레이아웃
          card.innerHTML = `
            <div class="card-top">
              <span class="card-idx-badge">#${idx + 1}</span>
              <span class="card-type-tag ${tagClass}">[${item.grade}] ${item.zone}</span>
              ${item._isModified ? '<span style="font-size:0.75rem; color:#f0883e; font-weight:bold;">✏️ 수정됨</span>' : ''}
              <a href="${item.notionUrl}" target="_blank" rel="noopener" class="card-notion-link" title="노션에서 직접 열기">
                <span>🔗 노션</span>
              </a>
            </div>
            <div class="card-body">
              <div class="card-title">${item.title}</div>
              ${item.desc ? `<div class="card-desc">${item.desc}</div>` : ''}
              ${item.quiz ? `<div class="card-quiz">❓ ${item.quiz}</div>` : ''}

              <div class="img-preview-box ${!displayUrl ? 'no-img' : ''}" id="pbox_${item.pageId}" onclick="document.getElementById('file_${item.pageId}').click()">
                ${displayUrl ? `<img src="${displayUrl}" alt="${item.title}">` : `
                  <span>⚠️ 미디어 이미지 없음</span>
                  <span style="font-size:0.75rem; color:#8b949e;">클릭하거나 새 사진을 여기에 드래그 앤 드롭하세요</span>
                `}
                <div class="img-drop-overlay">
                  <span>📥 사진을 놓으면 자동 최적화 압축됩니다!</span>
                </div>
              </div>
              ${item._compressionInfo ? `<div class="compression-badge">${item._compressionInfo}</div>` : ''}

              <input type="file" id="file_${item.pageId}" style="display:none;" accept="image/*" onchange="handleFileSelect(event, '${item.pageId}')">

              <div class="card-img-form">
                <input type="text" class="card-img-input" id="input_${item.pageId}" value="${item.mediaUrl || ''}" placeholder="./images/... 또는 https://..." onkeydown="if(event.key==='Enter') applyPathInput('${item.pageId}')">
                <button type="button" class="btn-apply-img" onclick="applyPathInput('${item.pageId}')">경로적용</button>
              </div>

              <button type="button" class="card-details-toggle" onclick="toggleDrawer('${item.pageId}')">⚙️ 퀴즈/설명 편집 열기</button>
              <div class="card-edit-drawer" id="drawer_${item.pageId}">
                <div class="drawer-field">
                  <label>제목</label>
                  <input type="text" value="${item.title}" onchange="updateItemField('${item.pageId}', 'title', this.value)">
                </div>
                <div class="drawer-field">
                  <label>퀴즈 질문</label>
                  <input type="text" value="${item.quiz || ''}" onchange="updateItemField('${item.pageId}', 'quiz', this.value)">
                </div>
                <div class="drawer-field">
                  <label>보기 1~4 (줄바꿈 구분)</label>
                  <textarea onchange="updateItemField('${item.pageId}', 'choicesText', this.value)">${item.choicesText || ''}</textarea>
                </div>
                <div style="display:flex; gap:6px;">
                  <div class="drawer-field" style="width:80px;">
                    <label>정답 (1~4)</label>
                    <input type="number" min="1" max="4" value="${item.ans || 1}" onchange="updateItemField('${item.pageId}', 'ans', Number(this.value))">
                  </div>
                  <div class="drawer-field" style="flex:1;">
                    <label>인터랙티브 URL</label>
                    <input type="url" value="${item.interactiveUrl || ''}" onchange="updateItemField('${item.pageId}', 'interactiveUrl', this.value)">
                  </div>
                </div>
                <div class="drawer-field">
                  <label>해설</label>
                  <textarea onchange="updateItemField('${item.pageId}', 'explanation', this.value)">${item.explanation || ''}</textarea>
                </div>
              </div>
            </div>
          `;
        } else {
          // 📚 용어사전 모드 카드 레이아웃
          card.innerHTML = `
            <div class="card-top">
              <span class="card-idx-badge">#VOCA ${idx + 1}</span>
              <span class="card-type-tag tag-voca">[${item.subject} ${item.grade}] ${item.pos || '낱말'}</span>
              ${item._isModified ? '<span style="font-size:0.75rem; color:#f0883e; font-weight:bold;">✏️ 수정됨</span>' : ''}
              <a href="${item.notionUrl}" target="_blank" rel="noopener" class="card-notion-link" title="노션에서 직접 열기">
                <span>🔗 노션</span>
              </a>
            </div>
            <div class="card-body">
              <div class="card-title" style="color:#d2a8ff; font-family:'Jua', sans-serif; font-size:1.3rem;">${item.title}</div>
              ${item.meaning ? `<div class="card-meaning">📖 <strong>뜻풀이:</strong> ${item.meaning}</div>` : ''}
              ${item.desc ? `<div class="card-desc" style="font-size:0.85rem; color:#c9d1d9;">💡 ${item.desc}</div>` : ''}

              <div class="img-preview-box ${!displayUrl ? 'no-img' : ''}" id="pbox_${item.pageId}" onclick="document.getElementById('file_${item.pageId}').click()">
                ${displayUrl ? `<img src="${displayUrl}" alt="${item.title}">` : `
                  <span>📷 낱말 삽화 이미지 없음</span>
                  <span style="font-size:0.75rem; color:#8b949e;">클릭하거나 새 사진을 여기에 드래그 앤 드롭하세요</span>
                `}
                <div class="img-drop-overlay">
                  <span>📥 낱말 사진 자동 압축 등록!</span>
                </div>
              </div>
              ${item._compressionInfo ? `<div class="compression-badge">${item._compressionInfo}</div>` : ''}

              <input type="file" id="file_${item.pageId}" style="display:none;" accept="image/*" onchange="handleFileSelect(event, '${item.pageId}')">

              <div class="card-img-form">
                <input type="text" class="card-img-input" id="input_${item.pageId}" value="${item.mediaUrl || ''}" placeholder="이미지 CDN 링크 또는 파일 경로" onkeydown="if(event.key==='Enter') applyPathInput('${item.pageId}')">
                <button type="button" class="btn-apply-img" onclick="applyPathInput('${item.pageId}')">적용</button>
              </div>

              <button type="button" class="card-details-toggle" onclick="toggleDrawer('${item.pageId}')">⚙️ 뜻풀이/상세설명 편집 열기</button>
              <div class="card-edit-drawer" id="drawer_${item.pageId}">
                <div class="drawer-field">
                  <label>단어명</label>
                  <input type="text" value="${item.title}" onchange="updateItemField('${item.pageId}', 'title', this.value)">
                </div>
                <div class="drawer-field">
                  <label>뜻풀이</label>
                  <textarea onchange="updateItemField('${item.pageId}', 'meaning', this.value)">${item.meaning || ''}</textarea>
                </div>
                <div class="drawer-field">
                  <label>상세 설명 (실생활 비유, 힌트)</label>
                  <textarea onchange="updateItemField('${item.pageId}', 'desc', this.value)">${item.desc || ''}</textarea>
                </div>
                <div class="drawer-field">
                  <label>품사</label>
                  <input type="text" value="${item.pos || ''}" onchange="updateItemField('${item.pageId}', 'pos', this.value)">
                </div>
              </div>
            </div>
          `;
        }

        // 드래그 앤 드롭 이벤트 바인딩
        const pBox = card.querySelector(`#pbox_${item.pageId}`);
        card.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); pBox.classList.add('dragover'); });
        card.addEventListener('dragleave', (e) => { e.preventDefault(); e.stopPropagation(); pBox.classList.remove('dragover'); });
        card.addEventListener('drop', (e) => {
          e.preventDefault(); e.stopPropagation(); pBox.classList.remove('dragover');
          if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
            processImageFile(e.dataTransfer.files[0], item.pageId);
          }
        });

        grid.appendChild(card);
      });
    }

    window.addEventListener('dragover', e => e.preventDefault(), false);
    window.addEventListener('drop', e => e.preventDefault(), false);

