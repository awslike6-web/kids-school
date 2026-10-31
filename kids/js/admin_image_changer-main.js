    function toggleDrawer(pageId) {
      const drawer = document.getElementById(`drawer_${pageId}`);
      if (!drawer) return;
      drawer.style.display = drawer.style.display === 'flex' ? 'none' : 'flex';
    }

    function updateItemField(pageId, field, val) {
      const item = allNotionItems.find(x => x.pageId === pageId);
      if (!item) return;
      item[field] = val;
      item._isModified = true;
      modifiedItems.set(pageId, item);
      showToast(`✏️ '${item.title}' 내용이 수정되었습니다. [원클릭 배포]로 노션에 반영하세요!`);
    }

    function applyPathInput(pageId) {
      const item = allNotionItems.find(x => x.pageId === pageId);
      if (!item) return;
      const input = document.getElementById(`input_${pageId}`);
      const val = input.value.trim();
      item.mediaUrl = val;
      item._previewUrl = val;
      item._isModified = true;
      modifiedItems.set(pageId, item);
      renderQuestions();
      showToast(`✅ 이미지 경로가 적용되었습니다.`);
    }

    function handleFileSelect(e, pageId) {
      if (e.target.files && e.target.files[0]) {
        processImageFile(e.target.files[0], pageId);
      }
    }

    async function compressImageFile(file, maxWidth = 1600, quality = 0.85) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            canvas.toBlob((blob) => {
              const originKB = Math.round(file.size / 1024);
              const compressedKB = Math.round(blob.size / 1024);
              resolve({
                blob,
                dataUrl: canvas.toDataURL(mimeType, quality),
                info: `⚡ 자동 최적화: ${originKB}KB ➔ ${compressedKB}KB (${width}x${height})`
              });
            }, mimeType, quality);
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      });
    }

    async function processImageFile(file, pageId) {
      const item = allNotionItems.find(x => x.pageId === pageId);
      if (!item) return;

      const compResult = await compressImageFile(file);
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
      
      let autoRelPath = '';
      if (currentMode === 'curriculum') {
        const unitNum = (item.unit.match(/\d+/) || ['1'])[0];
        autoRelPath = `./images/minsu/${item.grade}/${unitNum}/${cleanFileName}`;
      } else {
        autoRelPath = `./images/voca/${item.grade}/${cleanFileName}`;
      }

      item._compressedBlob = compResult.blob;
      item._previewUrl = compResult.dataUrl;
      item._compressionInfo = compResult.info;
      item._fileName = cleanFileName;
      item.mediaUrl = autoRelPath;
      item._isModified = true;
      modifiedItems.set(pageId, item);

      renderQuestions();
      showToast(`📸 [${file.name}] 압축 완료! ${compResult.info}`);
    }

    // =========================================================
    // 🚀 GitHub 원클릭 업로드 & 노션 DB 실시간 PATCH (통합 엔진)
    // =========================================================
    function openTokenModal() {
      document.getElementById('githubTokenInput').value = localStorage.getItem('kids_github_token') || '';
      document.getElementById('tokenModal').style.display = 'flex';
    }
    function closeTokenModal() { document.getElementById('tokenModal').style.display = 'none'; }
    function saveGithubToken() {
      let t = document.getElementById('githubTokenInput').value.trim().replace(/^Bearer\s+/i, '');
      if (!t) return alert('GitHub 토큰을 입력해주세요.');
      localStorage.setItem('kids_github_token', t);
      closeTokenModal();
      showToast('🔑 GitHub 토큰이 저장되었습니다!');
    }

    function openPushModal() {
      document.getElementById('pushModalTitle').textContent = '🚀 GitHub & 노션 동시 배포 진행 중...';
      document.getElementById('pushLogBox').innerHTML = '▶️ 배포 프로세스 시작...';
      document.getElementById('pushModalActions').style.display = 'none';
      document.getElementById('pushModal').style.display = 'flex';
    }
    function closePushModal() { document.getElementById('pushModal').style.display = 'none'; }
    function logPush(msg, isError = false) {
      const box = document.getElementById('pushLogBox');
      const p = document.createElement('div');
      p.style.color = isError ? '#ff7b72' : '#7ee787';
      p.textContent = msg;
      box.appendChild(p);
      box.scrollTop = box.scrollHeight;
    }

    async function blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    async function getFileSha(path, token) {
      try {
        const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${GITHUB_BRANCH}`;
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github+json' }
        });
        if (res.status === 200) {
          const data = await res.json();
          return data.sha;
        }
      } catch (e) {}
      return null;
    }

    async function putFileToGithub(path, contentBase64, message, token) {
      const sha = await getFileSha(path, token);
      const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`;
      const body = { message, content: contentBase64, branch: GITHUB_BRANCH };
      if (sha) body.sha = sha;

      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || `HTTP ${res.status}`);
      }
      return await res.json();
    }

    async function updateNotionItem(item) {
      const url = `${PROXY_URL}/v1/pages/${item.pageId}`;
      const rt = (txt) => txt ? [{ type: "text", text: { content: String(txt).slice(0, 2000) } }] : [];

      let properties = {};
      if (currentMode === 'curriculum') {
        // 교재 마스터 DB 속성
        properties = {
          "제목": { title: rt(item.title) },
          "미디어 URL": { url: item.mediaUrl || null },
          "인터랙티브 URL": { url: item.interactiveUrl || null },
          "핵심 쓰임새/설명": { rich_text: rt(item.desc) },
          "퀴즈 질문": { rich_text: rt(item.quiz) },
          "보기 1~4": { rich_text: rt(item.choicesText) },
          "해설": { rich_text: rt(item.explanation) }
        };
        if (item.ans !== null && item.ans !== undefined) {
          properties["정답"] = { number: Number(item.ans) };
        }
      } else {
        // 용어사전 DB (VOCA) 속성
        properties = {
          "단어": { title: rt(item.title) },
          "뜻풀이": { rich_text: rt(item.meaning) },
          "상세설명": { rich_text: rt(item.desc) },
          "품사": { rich_text: rt(item.pos) }
        };
        // 이미지파일 속성은 files 타입
        if (item._rawCdnUrl || item.mediaUrl) {
          const finalUrl = item._rawCdnUrl || item.mediaUrl;
          const fileName = item._fileName || "voca_image.png";
          properties["이미지파일"] = {
            files: [{
              name: fileName,
              type: "external",
              external: { url: finalUrl }
            }]
          };
        }
      }

      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ properties })
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`노션 업데이트 실패: ${err}`);
      }
      return await res.json();
    }

    async function startGithubPush() {
      const itemsToPush = Array.from(modifiedItems.values()).filter(x => x._isModified);
      if (itemsToPush.length === 0) {
        return alert('수정되거나 새로 등록된 항목이 없습니다.');
      }

      const token = localStorage.getItem('kids_github_token');
      if (!token) {
        openTokenModal();
        return;
      }

      openPushModal();

      try {
        logPush(`📡 [${currentMode === 'curriculum' ? '교재 모드' : '용어사전 모드'}] GitHub 및 노션 연결 확인... (총 ${itemsToPush.length}개)`);

        for (let i = 0; i < itemsToPush.length; i++) {
          const item = itemsToPush[i];
          logPush(`\n[${i + 1}/${itemsToPush.length}] 처리 중: [${item.title}]`);

          if (item._compressedBlob) {
            const subjectFolder = item.subject === '사회' ? 'kids/subjects/society' : (item.subject === '과학' ? 'kids/subjects/science' : (item.subject === '영어' ? 'kids/subjects/english' : 'kids/subjects/korean'));
            let cleanRel = item.mediaUrl.replace('./', '').replace(/^images\//, '');
            const targetPath = `${subjectFolder}/images/${cleanRel}`;

            logPush(`  🖼️ 이미지 깃허브 푸시: ${targetPath}`);
            const b64 = await blobToBase64(item._compressedBlob);
            await putFileToGithub(targetPath, b64, `feat(image): ${currentMode === 'curriculum' ? '교재 사료' : '용어사전 낱말'} 이미지 업로드 (${cleanRel})`, token);

            const rawCdnUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${targetPath}`;
            item._rawCdnUrl = rawCdnUrl;
            item.mediaUrl = rawCdnUrl;
            item._previewUrl = rawCdnUrl;
            logPush(`  ✅ 깃허브 업로드 성공! (CDN: ${cleanRel})`);
          }

          logPush(`  📝 노션 DB 실시간 업데이트 중...`);
          await updateNotionItem(item);
          logPush(`  ✅ 노션 DB 갱신 성공!`);

          item._isModified = false;
        }

        modifiedItems.clear();

        // 🧹 공부방 및 5분 퀘스트 로컬 캐시 즉각 무효화 (실시간 반영 보장)
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && (k.includes('VOCA_CACHE') || k.includes('CURRICULUM_CACHE') || k.startsWith('MINMIN_VOCA_CACHE_'))) {
              localStorage.removeItem(k);
            }
          }
        } catch (e) {}

        logPush('\n🎉 [배포 완료] 깃허브 푸시와 노션 DB가 100% 동시 최신화되었습니다! (로컬 캐시 갱신)');
        document.getElementById('pushModalTitle').textContent = '🎉 배포 성공 완료!';
        document.getElementById('pushModalActions').style.display = 'flex';
        showToast('🚀 깃허브와 노션에 실시간 반영이 완료되었습니다!');
        renderQuestions();
      } catch (err) {
        logPush(`\n❌ 오류 발생: ${err.message}`, true);
        document.getElementById('pushModalTitle').textContent = '⚠️ 배포 중 오류 발생';
        document.getElementById('pushModalActions').style.display = 'flex';
      }
    }

    // =========================================================
    // ➕ 새 항목 등록 모달 (모드 연동)
    // =========================================================
    function openAddModal() {
      const modal = document.getElementById('addModal');
      const titleLabel = document.getElementById('addTitleLabel');
      const zoneField = document.getElementById('newZoneField');
      const curriculumFields = document.getElementById('curriculumFields');
      const vocaFields = document.getElementById('vocaFields');

      if (currentMode === 'curriculum') {
        document.getElementById('addModalTitle').textContent = '➕ 새 교재·사료 노션 DB 등록';
        titleLabel.textContent = '사료/문제 제목 *';
        zoneField.style.display = 'flex';
        curriculumFields.style.display = 'block';
        vocaFields.style.display = 'none';
      } else {
        document.getElementById('addModalTitle').textContent = '➕ 새 낱말 노션 VOCA DB 등록';
        titleLabel.textContent = '새 단어명 *';
        zoneField.style.display = 'none';
        curriculumFields.style.display = 'none';
        vocaFields.style.display = 'block';
      }

      modal.style.display = 'flex';
    }
    function closeAddModal() { document.getElementById('addModal').style.display = 'none'; }

    async function submitNewItem() {
      const title = document.getElementById('newTitle').value.trim();
      if (!title) return alert('제목(단어명)을 입력해주세요.');

      const subject = document.getElementById('newSubject').value;
      const grade = document.getElementById('newGrade').value;
      const unit = document.getElementById('newUnit').value.trim() || '1단원';
      const rt = (txt) => txt ? [{ type: "text", text: { content: String(txt).slice(0, 2000) } }] : [];

      let payload = {};

      if (currentMode === 'curriculum') {
        const zone = document.getElementById('newZone').value;
        const desc = document.getElementById('newDesc').value.trim();
        const quiz = document.getElementById('newQuiz').value.trim();
        const choicesText = document.getElementById('newChoices').value.trim();
        const ans = Number(document.getElementById('newAns').value) || 1;
        const interactiveUrl = document.getElementById('newInteractive').value.trim();
        const explanation = document.getElementById('newExplanation').value.trim();

        payload = {
          parent: { database_id: CURRICULUM_DB_ID },
          properties: {
            "제목": { title: rt(title) },
            "과목": { select: { name: subject } },
            "학년": { select: { name: grade } },
            "단원": { rich_text: rt(unit) },
            "구역": { select: { name: zone } },
            "핵심 쓰임새/설명": { rich_text: rt(desc) },
            "퀴즈 질문": { rich_text: rt(quiz) },
            "보기 1~4": { rich_text: rt(choicesText) },
            "정답": { number: ans },
            "해설": { rich_text: rt(explanation) },
            "인터랙티브 URL": { url: interactiveUrl || null }
          }
        };
      } else {
        // 용어사전 모드
        const meaning = document.getElementById('newVocaMeaning').value.trim();
        const desc = document.getElementById('newVocaDetail').value.trim();
        const pos = document.getElementById('newVocaPos').value.trim();

        payload = {
          parent: { database_id: VOCA_DB_ID },
          properties: {
            "단어": { title: rt(title) },
            "과목": { multi_select: [{ name: subject }] },
            "학년": { multi_select: [{ name: grade }] },
            "단원": { rich_text: rt(unit) },
            "뜻풀이": { rich_text: rt(meaning) },
            "상세설명": { rich_text: rt(desc) },
            "품사": { rich_text: rt(pos) }
          }
        };
      }

      try {
        const res = await fetch(`${PROXY_URL}/v1/pages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(await res.text());
        
        closeAddModal();

        // 🧹 공부방 및 5분 퀘스트 로컬 캐시 즉각 무효화
        try {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && (k.includes('VOCA_CACHE') || k.includes('CURRICULUM_CACHE') || k.startsWith('MINMIN_VOCA_CACHE_'))) {
              localStorage.removeItem(k);
            }
          }
        } catch (e) {}

        showToast(`🎉 [${title}] 새 항목이 노션 DB에 성공적으로 등록되었습니다!`);
        refreshCurrentModeData();
      } catch (err) {
        alert(`생성 실패: ${err.message}`);
      }
    }

    function showToast(msg) {
      const t = document.getElementById('toastMsg');
      t.textContent = msg;
      t.style.display = 'block';
      setTimeout(() => { t.style.display = 'none'; }, 2500);
    }
  