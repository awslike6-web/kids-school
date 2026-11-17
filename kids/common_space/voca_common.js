// 📚 용어사전방(Voca) 독립 실행형 제어 엔진
const WORKER_PROXY_URL = typeof PROXY_URL !== "undefined" ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";

// 🚀 코어 관제탑(window)이 세탁해 둔 글로벌 상태를 그대로 이어받습니다!
let currentUser = window.currentProfile || 'son';
let currentUserName = window.currentUserName || '민수';
let currentTheme = window.currentTheme || '마인크래프트';
window.currentSubject = "용어사전"; // 🚨 기본 전역 과목명 명시 (학습일지 및 통계용)

// 👦👧 아이별 보기 범위 (2026-11-17). 로비가 ?user=son|daughter 를 붙여 연다.
//   'own'  : 그 아이 낱말 + 공통 낱말만 불러온다. 학생 전환 버튼이 없어 다른 아이 낱말은 열 수 없다.
//   'mine' : 그 아이 낱말로 열리지만 「🌟 전체 학생」을 눌러 모두 볼 수 있다.
// 민서가 자라면 daughter 값을 'mine'으로 바꾸면 다시 모든 낱말과 연결된다(노션 자료는 그대로 있다).
// 부모(아빠·엄마 로그인)는 항상 전체 학생으로 연다.
const VOCA_STUDENT_SCOPE = { son: 'mine', daughter: 'own' };
const VOCA_STUDENT_NAMES = { son: '민수', minsu: '민수', daughter: '민서', minseo: '민서' };
const VOCA_STUDENT_KEYS = { minsu: 'son', minseo: 'daughter' };

function resolveVocaViewer(userParam, profile, isAdmin) {
  if (isAdmin) return null;
  const raw = String(userParam || profile || '').trim();
  const key = VOCA_STUDENT_KEYS[raw] || raw;
  const name = VOCA_STUDENT_NAMES[key];
  if (!name) return null;
  return { name, scope: VOCA_STUDENT_SCOPE[key] === 'own' ? 'own' : 'mine' };
}

function vocaWordForStudent(word, name) {
  const target = word.target || [];
  return target.includes(name) || target.includes('공통');
}

function readVocaUserParam() {
  try { return new URLSearchParams(window.location.search).get('user'); } catch (e) { return null; }
}

const VOCA_VIEWER = resolveVocaViewer(readVocaUserParam(), window.currentProfile, window.isAdmin === true);

let allDictionaryWords = [];
let selectedStudents = VOCA_VIEWER ? [VOCA_VIEWER.name] : [];
let selectedSubjects = []; 
let selectedGrades = [];   
let selectedUnit = ""; // 🔖 선택된 단원 (Select HTML 동적 배선용)
let MODAL_CHAT_HISTORY = [];
let isFairyVoiceOn = true; 

// 🏆 보상 시스템을 위한 진지하게 읽은 단어 카운터
let viewedWordsCount = 0; 
let wordStartTime = 0; 

function getVocaFairySystemPrompt(extraPrompt = '') {
    if (typeof buildFullAISystemPrompt === 'function') {
        return buildFullAISystemPrompt('용어방', extraPrompt);
    }
    return extraPrompt || "너는 용어사전방의 다정한 AI 도우미 코코야.";
}

// 🏰 엔진 시동 및 데이터 로딩 시작
window.addEventListener('load', async () => { 
  document.body.className = (currentTheme === '슬라임' || currentTheme === 'theme--slime') ? 'theme--slime' : 'theme--minecraft';
  document.getElementById('welcomeMsg').textContent = `${currentUserName}의 지식 도서관에 오신 것을 환영해요!`;
  
  if (typeof unlockFairySpeechEngine === 'function') {
      unlockFairySpeechEngine();
  }
  syncVoiceToggleBtnUi();

  if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = speechSynthesis.getVoices;
  }
  if (typeof initChatMemorySession === 'function') {
    await initChatMemorySession('용어방');
  }
  // 단어 창을 닫지 않고 페이지를 떠나도 코코와 나눈 말이 AI 대화 기억 보관소에 남도록 (chat-memory.js)
  if (typeof registerChatMemorySource === 'function') {
    registerChatMemorySource('voca-modal', () => ({ roomType: '용어방', messages: MODAL_CHAT_HISTORY, passage: null, unit: currentActiveWord?.word || '' }));
  }
  fetchLibraryData(); 
});


async function fetchLibraryData(forceRefresh = false) {
  const loadingEl = document.getElementById('loadingArea');
  const syncBtn = document.getElementById('vocaSyncBtn');
  try {
    if (forceRefresh) {
      if (loadingEl) {
        loadingEl.style.display = 'block';
        loadingEl.innerHTML = '';
      }
      if (syncBtn) {
        syncBtn.disabled = true;
        syncBtn.innerHTML = '⏳ 동기화 중...';
      }
    }

    // 💡 용어사전방은 전교생/가족 통합 도서관이므로 filterByStudent: false 로 전체 로드
    const records = await fetchVocaFromNotion({
      studentName: currentUserName.trim(),
      filterByStudent: false,
      forceRefresh: forceRefresh
    });

    allDictionaryWords = records.map(r => ({
      ...r,
      meaning: r.meaning || "뜻풀이 없음",
      subject: (r.subject && r.subject.length) ? r.subject : ["미분류"],
      target: (r.target && r.target.length) ? r.target : ["공통"]
    }));
    // 'own' 범위 아이는 자기·공통 낱말만 남긴다 (과목 칩·검색·딥링크까지 함께 좁혀진다)
    if (VOCA_VIEWER && VOCA_VIEWER.scope === 'own') {
      allDictionaryWords = allDictionaryWords.filter(w => vocaWordForStudent(w, VOCA_VIEWER.name));
    }

    if (loadingEl) loadingEl.style.display = 'none';
    buildFilterButtons();
    updateStatusAndFilter();

    // 🔗 딥링크 URL 쿼리 파라미터 수신 배선 (?subject=수학&search=...)
    handleDeepLinkParams();

    if (forceRefresh && syncBtn) {
      syncBtn.disabled = false;
      syncBtn.innerHTML = '✅ 동기화 완료!';
      setTimeout(() => { syncBtn.innerHTML = '🔄 최신 동기화'; }, 2000);
    }

  } catch (error) {
    console.error("데이터 로딩 실패:", error);
    if (loadingEl) loadingEl.innerHTML = `❌ 로딩 실패. 새로고침 해주세요.`;
    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.innerHTML = '🔄 재시도';
    }
  }
}

async function manualSyncVocaData() {
  if (typeof clearVocaCache === 'function') {
    clearVocaCache();
  }
  await fetchLibraryData(true);
}
window.manualSyncVocaData = manualSyncVocaData;

function buildFilterButtons() {
  const stuArea = document.getElementById('studentFilterArea');
  const subArea = document.getElementById('subjectFilterArea');
  const gradeArea = document.getElementById('gradeFilterArea');

  // 1. 학생 필터 빌드 ('own' 범위면 제목과 버튼을 숨긴다)
  const lockStudent = !!(VOCA_VIEWER && VOCA_VIEWER.scope === 'own');
  if (stuArea) {
    stuArea.style.display = lockStudent ? 'none' : '';
    const title = stuArea.previousElementSibling;
    if (title && title.classList.contains('section-title')) title.style.display = lockStudent ? 'none' : '';
  }
  if (stuArea && !lockStudent) {
    const students = [...new Set(allDictionaryWords.flatMap(w => w.target).filter(t => t && t !== '공통' && t !== '미분류'))];
    let stuHtml = `<button class="filter-btn ${selectedStudents.length === 0 ? 'active' : ''}" onclick="selectStudentAll(this)">🌟 전체 학생</button>`;
    students.forEach(stu => {
      const isAct = selectedStudents.includes(stu) ? 'active' : '';
      const icon = stu.includes('민수') ? '👦' : (stu.includes('민서') ? '👧' : '👤');
      stuHtml += `<button class="filter-btn ${isAct}" onclick="toggleStudent('${stu}', this)">${icon} ${stu}</button>`;
    });
    stuArea.innerHTML = stuHtml;
  }

  // 2. 과목 필터 빌드
  if (subArea) {
    const subjects = [...new Set(allDictionaryWords.flatMap(w => w.subject))];
    subArea.innerHTML = "";
    subjects.forEach(sub => { 
      const isAct = selectedSubjects.includes(sub) ? 'active' : '';
      subArea.innerHTML += `<button class="filter-btn ${isAct}" onclick="toggleSubject('${sub}', this)">📘 ${sub}</button>`; 
    });
  }

  // 3. 학년 필터 빌드
  if (gradeArea) {
    const grades = [...new Set(allDictionaryWords.flatMap(w => w.grades))].sort((a, b) => {
      const numA = parseInt(String(a).replace(/[^0-9]/g, '')) || 0;
      const numB = parseInt(String(b).replace(/[^0-9]/g, '')) || 0;
      return numA - numB;
    });
    gradeArea.innerHTML = "";
    grades.forEach(g => { 
      const isAct = selectedGrades.includes(g) ? 'active' : '';
      gradeArea.innerHTML += `<button class="filter-btn ${isAct}" onclick="toggleGrade('${g}', this)">🎒 ${g}</button>`; 
    });
  }
}

// 🔖 4. 단원 드롭다운 동적 생성 (사용자가 학생/과목/학년을 변경할 때마다 자동 갱신)
function updateUnitSelectOptions() {
  const selectEl = document.getElementById('unitSelect');
  if (!selectEl) return;

  // 현재 활성화된 학생, 과목, 학년에 부합하는 단어들을 추출
  const matchedWords = allDictionaryWords.filter(w => {
    const studentMatch = selectedStudents.length === 0 || 
                         selectedStudents.some(stu => (w.target || []).includes(stu) || (w.target || []).includes("공통"));
    const subjectMatch = selectedSubjects.length === 0 || 
                         selectedSubjects.some(sub => (w.subject || []).includes(sub));
    const gradeMatch = selectedGrades.length === 0 || 
                       selectedGrades.some(g => (w.grades || []).includes(g));
    return studentMatch && subjectMatch && gradeMatch;
  });

  // 고유 단원 목록 추출
  const rawUnits = [...new Set(matchedWords.map(w => (w.stage || w.level || "").trim()).filter(u => u && u !== "미분류" && u !== "기본 단원"))];

  // 단원 목록 정렬 (L1~L10 우선, 숫자 우선, 한글 가나다순)
  rawUnits.sort((a, b) => {
    const matchLa = a.match(/^L(\d+)/i);
    const matchLb = b.match(/^L(\d+)/i);
    if (matchLa && matchLb) {
      return parseInt(matchLa[1], 10) - parseInt(matchLb[1], 10);
    }
    const numA = parseFloat(a.replace(/[^0-9.]/g, ''));
    const numB = parseFloat(b.replace(/[^0-9.]/g, ''));
    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
      return numA - numB;
    }
    return a.localeCompare(b, 'ko');
  });

  const prevVal = selectedUnit;
  let optionsHtml = `<option value="">📖 전체 단원 보기 (${rawUnits.length}개 단원)</option>`;
  rawUnits.forEach(u => {
    const count = matchedWords.filter(w => (w.stage || w.level || "").trim() === u).length;
    const isSelected = (u === prevVal) ? 'selected' : '';
    optionsHtml += `<option value="${u}" ${isSelected}>🔖 ${u} (${count}개)</option>`;
  });

  selectEl.innerHTML = optionsHtml;

  // 이전에 선택했던 단원이 현재 조건의 단원 목록에 없으면 리셋
  if (prevVal && !rawUnits.includes(prevVal)) {
    selectedUnit = "";
    selectEl.value = "";
  }
}

function handleUnitChange(val) {
  selectedUnit = (val || "").trim();
  updateStatusAndFilter(false); // 단원 변경 시에는 드롭다운 옵션 재생성 건너뜀
}

function resetUnitSelect() {
  selectedUnit = "";
  const selectEl = document.getElementById('unitSelect');
  if (selectEl) selectEl.value = "";
  updateStatusAndFilter(false);
}

function selectStudentAll(btnEl) {
  selectedStudents = [];
  if (document.getElementById('studentFilterArea')) {
    document.querySelectorAll('#studentFilterArea .filter-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }
  updateStatusAndFilter(true);
}

function toggleStudent(student, btnEl) {
  const allBtn = document.querySelector('#studentFilterArea .filter-btn:first-child');
  if (allBtn) allBtn.classList.remove('active');
  
  btnEl.classList.toggle('active'); 
  if (selectedStudents.includes(student)) {
    selectedStudents = selectedStudents.filter(s => s !== student);
  } else {
    selectedStudents.push(student);
  }
  if (selectedStudents.length === 0 && allBtn) {
    allBtn.classList.add('active');
  }
  updateStatusAndFilter(true);
}

function toggleSubject(subject, btnEl) {
  btnEl.classList.toggle('active'); 
  if (selectedSubjects.includes(subject)) {
    selectedSubjects = selectedSubjects.filter(s => s !== subject);
  } else {
    selectedSubjects.push(subject);
  }
  updateStatusAndFilter(true);
}

function toggleGrade(grade, btnEl) {
  btnEl.classList.toggle('active'); 
  if (selectedGrades.includes(grade)) {
    selectedGrades = selectedGrades.filter(g => g !== grade);
  } else {
    selectedGrades.push(grade);
  }
  updateStatusAndFilter(true);
}

function handleSearch() {
  updateStatusAndFilter(false);
}

function updateStatusAndFilter(rebuildUnits = true) {
  if (rebuildUnits) {
    updateUnitSelectOptions();
  }

  const searchText = document.getElementById('searchInput').value.trim();
  let msgParts = [];
  if (selectedStudents.length > 0) msgParts.push(`👤 [${selectedStudents.join(', ')}]`);
  if (selectedSubjects.length > 0) msgParts.push(`📘 [${selectedSubjects.join(', ')}]`);
  if (selectedGrades.length > 0) msgParts.push(`🎒 [${selectedGrades.join(', ')}]`);
  if (selectedUnit) msgParts.push(`🔖 [단원: ${selectedUnit}]`);
  if (searchText) msgParts.push(`🔍 "${searchText}"`);
  
  const statusMsg = document.getElementById('statusMsg');
  const fairyRoom = document.getElementById('fairyRoom');

  const filtered = allDictionaryWords.filter(w => {
    const textMatch = searchText === "" || 
                      (w.word && w.word.toLowerCase().includes(searchText.toLowerCase())) || 
                      (w.meaning && w.meaning.toLowerCase().includes(searchText.toLowerCase()));
    const subjectMatch = selectedSubjects.length === 0 || 
                         selectedSubjects.some(sub => (w.subject || []).includes(sub));
    const gradeMatch = selectedGrades.length === 0 || 
                       selectedGrades.some(g => (w.grades || []).includes(g));
    const studentMatch = selectedStudents.length === 0 || 
                         selectedStudents.some(stu => (w.target || []).includes(stu) || (w.target || []).includes("공통"));
    const wUnit = (w.stage || w.level || "").trim();
    const unitMatch = !selectedUnit || (wUnit === selectedUnit);
    return textMatch && subjectMatch && gradeMatch && studentMatch && unitMatch;
  });

  if (fairyRoom) fairyRoom.style.display = 'block';

  if (msgParts.length === 0) {
    statusMsg.textContent = `📚 김s 전체 지식 도서관 (총 ${filtered.length}개 단어·문장)`;
  } else {
    statusMsg.textContent = `${msgParts.join(' + ')} 검색 결과 (총 ${filtered.length}개)`;
  }

  renderCatalogSections(filtered);
  updateUnitQuestButton();
  updateUnitVideo();
}

function renderCatalogSections(wordsToRender) {
  const container = document.getElementById('librarySectionsContainer');
  const emptyMsg = document.getElementById('emptySearchMsg');
  const savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  container.innerHTML = "";
  if (wordsToRender.length === 0) {
    emptyMsg.style.display = 'block';
    requestAnimationFrame(() => window.scrollTo(0, savedScrollY));
    return;
  }
  emptyMsg.style.display = 'none';
  const sectionsMap = {};
  wordsToRender.forEach(w => {
    const stageName = w.stage || "기본 단원";
    if (!sectionsMap[stageName]) sectionsMap[stageName] = [];
    sectionsMap[stageName].push(w);
  });
  // ➡️ 단원명 자연수 정렬 (1단원 -> 2단원 -> 10단원, 1회 -> 2회 -> 10회)
  Object.keys(sectionsMap).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })).forEach(stageName => {
    const sectionData = sectionsMap[stageName];
    // ➡️ 각 단원 내에서도 문항 번호(1번 -> 10번) 오름차순 정렬
    sectionData.sort((a, b) => {
      const getNum = (item) => {
        if (!item) return 9999;
        const m1 = String(item.meaning || '').match(/(\d+)\s*번/);
        if (m1) return parseInt(m1[1], 10);
        const m2 = String(item.word || '').match(/^(\d+)[\.\s]/);
        if (m2) return parseInt(m2[1], 10);
        return 9999;
      };
      const numA = getNum(a);
      const numB = getNum(b);
      if (numA !== 9999 || numB !== 9999) {
        if (numA !== numB) return numA - numB;
      }
      return (a.word || '').localeCompare(b.word || '', 'ko');
    });

    const sectionDiv = document.createElement('div'); sectionDiv.className = 'stage-section';
    const header = document.createElement('div'); header.className = 'stage-header';
    header.textContent = isNaN(stageName) ? stageName : `${stageName}단원`;
    sectionDiv.appendChild(header);
    const grid = document.createElement('div'); grid.className = 'catalog-grid';
    sectionData.forEach(w => {
      let badgesHtml = '';
      if (w.grades.length > 0) badgesHtml += `<span class="badge grade">${w.grades[0]}</span>`;
      if (w.pos) badgesHtml += `<span class="badge pos">${w.pos}</span>`;
      const crownHtml = w.isAchieved ? `<div class="master-crown">👑</div>` : '';
      const masterClass = w.isAchieved ? 'mastered' : '';
      const card = document.createElement('div'); card.className = `word-card ${masterClass}`;
      card.innerHTML = `${crownHtml}<div class="badge-area">${badgesHtml}</div><div class="word-title">${w.word}</div>`;
      card.onclick = () => openModal(w); grid.appendChild(card);
    });
    sectionDiv.appendChild(grid); container.appendChild(sectionDiv);
  });
  requestAnimationFrame(() => window.scrollTo(0, savedScrollY));
}

// 🧮 수학 세로 분수 (Vertical Fraction) 및 특수 기호 포맷터
function formatMathExpressions(text) {
  if (!text) return "";
// [1] 세로 분수 치환: 단독 분수 패턴 (\d+)/(\d+) [단, 날짜/URL/경로 등 제외]
  let formatted = String(text).replace(/(?<![0-9a-zA-Z\/\-\:])(\d+)\s*\/\s*(\d+)(?![0-9a-zA-Z\/\-\:])/g, (match, num, den) => {
    return `<span class="inline-frac"><span class="num">${num}</span><span class="bar"></span><span class="den">${den}</span></span>`;
  });
  return formatted;
}

// 📐 상세설명(심화) 본문 포맷터 (수식/공식 하이라이트 카드 박스 배선)
function formatDetailContext(rawText, isMath = false) {
  if (!rawText) return "";
  const lines = String(rawText).split("\n");
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return "";
    const formattedLine = formatMathExpressions(trimmed);
    
    // 수학 과목이거나 공식/계산 관련 줄인 경우 하이라이트 박스 처리
    const isFormulaLine = isMath && (
      trimmed.startsWith("• 공식:") || 
      trimmed.startsWith("공식:") ||
      trimmed.includes("➔") ||
      trimmed.includes("=") ||
      trimmed.includes("×") ||
      trimmed.includes("÷") ||
      trimmed.includes("≥") ||
      trimmed.includes("≤") ||
      /^[1-3]등:/.test(trimmed)
    );

    if (isFormulaLine) {
      return `<div class="math-formula-box">${formattedLine}</div>`;
    }
    return `<div style="margin: 4px 0;">${formattedLine}</div>`;
  });

  return processedLines.filter(l => l).join("");
}

// 🔗 딥링크 URL 쿼리 파라미터 수신 배선 (?subject=수학&search=사다리꼴 등)
function handleDeepLinkParams() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const targetSubj = urlParams.get('subject');
    const targetGrade = urlParams.get('grade');
    const targetUnit = urlParams.get('unit');
    const targetSearch = urlParams.get('search') || urlParams.get('word');

    let hasParam = false;

    if (targetSubj) {
      selectedSubjects = [targetSubj.trim()];
      hasParam = true;
    }
    if (targetGrade) {
      selectedGrades = [targetGrade.trim()];
      hasParam = true;
    }
    if (targetUnit) {
      selectedUnit = targetUnit.trim();
      hasParam = true;
    }
    if (targetSearch) {
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.value = targetSearch.trim();
      hasParam = true;
    }

    if (hasParam) {
      buildFilterButtons();
      updateStatusAndFilter(true);

      if (targetSearch) {
        const cleanSearch = targetSearch.trim().toLowerCase();
        const matched = allDictionaryWords.find(w => {
          const wName = (w.word || '').toLowerCase();
          return wName === cleanSearch || wName.startsWith(cleanSearch) || wName.includes(cleanSearch);
        });
        if (matched) {
          setTimeout(() => {
            openModal(matched);
          }, 250);
        }
      }
    }
  } catch (err) {
    console.warn("[DeepLink] 쿼리 파라미터 처리 오류:", err);
  }
}


// 📚→⚔️ 기타 과목 단원 5분 퀘스트 버튼 (docs/other_subjects_spec.md §5). 초안: 안티그래비티 Hydrogen, 검토: Claude
const VOCA_QUEST_SUBJECTS = { '도덕': 'moral', '미술': 'art', '보건': 'health' };

// 단원 조건을 만족하면 퀘스트 링크 정보 반환
function buildUnitQuestLink(words, unit, viewer, profile) {
  if (!unit) return null;
  if (viewer ? viewer.name === '민서' : profile === 'daughter') return null;

  const matched = words.filter((w) => (w.stage || '').trim() === unit);
  if (matched.length < 3) return null;

  const subjects = new Set();
  for (const w of matched) {
    for (const s of (w.subject || [])) subjects.add(s);
  }
  if (subjects.size !== 1) return null;

  const subjectKo = [...subjects][0];
  const key = VOCA_QUEST_SUBJECTS[subjectKo];
  if (!key) return null;

  const href = '../../quest_runner.html?subject=' + key + '&user=minsu&unit=' + encodeURIComponent(unit) + '&from=voca';
  return { href, count: matched.length, subjectKo };
}

// 현재 필터 기준으로 단원 퀘스트 버튼 표시 갱신
function updateUnitQuestButton() {
  const hasAny = (list, selected) => selected.length === 0 || (list || []).some((v) => selected.includes(v));
  const words = allDictionaryWords.filter((w) => {
    const okStudent = selectedStudents.length === 0 || (w.target || []).some((t) => t === '공통' || selectedStudents.includes(t));
    return okStudent && hasAny(w.subject, selectedSubjects) && hasAny(w.grades, selectedGrades);
  });

  const link = buildUnitQuestLink(words, selectedUnit, VOCA_VIEWER, currentUser);
  let btn = document.getElementById('unitQuestBtn');
  if (!btn) {
    const area = document.getElementById('unitFilterArea');
    if (!area) return;
    btn = document.createElement('a');
    btn.id = 'unitQuestBtn';
    btn.className = 'unit-quest-btn';
    area.appendChild(btn);
  }

  if (!link) {
    btn.style.display = 'none';
    return;
  }
  btn.href = link.href;
  btn.textContent = '⚔️ 이 단원 5분 퀘스트 (' + link.count + '개)';
  btn.style.display = '';
}

// 🎬 기타 과목 단원 영상 (docs/other_subjects_spec.md §6). 초안: 안티그래비티 Hydrogen, 검토: Claude
function vocaUnitVideoKey(subjectKo, unit) {
  return 'kids/common_space/voca.html?' + new URLSearchParams([['subject', subjectKo], ['unit', unit]]).toString();
}
function unitVideoSubject(words, unit) {
  if (!unit) return null;
  const subjects = [];
  for (const w of words) {
    if ((w.stage || '').trim() !== unit) continue;
    for (const s of (w.subject || [])) {
      if (!subjects.includes(s)) subjects.push(s);
      if (subjects.length > 1) return null;
    }
  }
  return subjects.length === 1 && typeof VOCA_QUEST_SUBJECTS[subjects[0]] === 'string' ? subjects[0] : null;
}
function updateUnitVideo() {
  const words = allDictionaryWords.filter((w) =>
    (!selectedStudents.length || (w.target || []).some((t) => t === '공통' || selectedStudents.includes(t))) &&
    (!selectedSubjects.length || (w.subject || []).some((s) => selectedSubjects.includes(s))) &&
    (!selectedGrades.length || (w.grades || []).some((g) => selectedGrades.includes(g)))
  );
  const subjectKo = unitVideoSubject(words, selectedUnit);
  const key = subjectKo ? vocaUnitVideoKey(subjectKo, selectedUnit) : '';
  let area = document.getElementById('unitVideoArea');
  if (!area && !key) return;
  if (!area) {
    const filterArea = document.getElementById('unitFilterArea');
    if (!filterArea) return;
    area = document.createElement('div');
    area.className = 'video-unit';
    area.id = 'unitVideoArea';
    filterArea.insertAdjacentElement('afterend', area);
  }
  if (area.dataset.videoKey === key) return;
  // 기타 과목 단원이 아니거나 부품이 없으면 비우고 숨김. 영상 0개일 때 숨기기는 부품(mount)이 한다
  if (!key || !window.VideoUnit) { area.replaceChildren(); area.hidden = true; area.dataset.videoKey = key; return; }
  const next = document.createElement('div');
  next.className = 'video-unit';
  next.id = 'unitVideoArea';
  next.dataset.videoKey = key;
  area.replaceWith(next);
  window.VideoUnit.mount(next, key).catch(() => {});
}
