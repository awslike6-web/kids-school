// kids/js/parent_dashboard_render.js - parent_dashboard.js 분리 2/2: 데이터 로드·위젯·이벤트 등록 (순서대로 로드)
// 노션에서 실시간 통합 인벤토리 & 학습일지 & VOCA 데이터 로드
async function loadDashboardData() {
  try {
    // 3대 노션 DB 병렬 쿼리 (CORS 호환 표준 헤더 및 브라우저 캐시 바이패스)
    const apiHeaders = {
      "Content-Type": "application/json"
    };
    const [invRes, logsRes, vocaRes, diaryRes] = await Promise.all([
      fetch(`${PROXY_URL}/v1/databases/${INVENTORY_DB_ID}/query`, {
        method: "POST",
        headers: apiHeaders,
        cache: "no-store",
        body: JSON.stringify({ page_size: 10 })
      }),
      fetch(`${PROXY_URL}/v1/databases/${STUDY_LOG_DB_ID}/query`, {
        method: "POST",
        headers: apiHeaders,
        cache: "no-store",
        body: JSON.stringify({ page_size: 50, sorts: [{ property: "입장", direction: "descending" }] })
      }).catch((e) => {
        console.warn("학습일지 DB 쿼리 예외 (진행 계속):", e);
        return null;
      }),
      fetch(`${PROXY_URL}/v1/databases/${VOCA_DB_ID}/query`, {
        method: "POST",
        headers: apiHeaders,
        cache: "no-store",
        body: JSON.stringify({ page_size: 100 })
      }).catch((e) => {
        console.warn("VOCA DB 쿼리 예외 (진행 계속):", e);
        return null;
      }),
      fetch(`${PROXY_URL}/v1/databases/${DIARY_DB_ID}/query`, {
        method: "POST",
        headers: apiHeaders,
        cache: "no-store",
        body: JSON.stringify({
          page_size: 100,
          filter: { property: "구분", select: { equals: "작품" } }
        })
      }).catch((e) => {
        console.warn("갤러리/다이어리 DB 쿼리 예외 (진행 계속):", e);
        return null;
      })
    ]);

    if (!invRes || !invRes.ok) {
      const errDetail = invRes ? await invRes.text().catch(() => "텍스트 읽기 실패") : "응답 객체 없음";
      throw new Error(`인벤토리 DB 네트워크 응답 오류 (${invRes ? invRes.status : 'null'}): ${errDetail}`);
    }
    const invData = await invRes.json();
    const logsData = logsRes && logsRes.ok ? await logsRes.json() : { results: [] };
    const vocaData = vocaRes && vocaRes.ok ? await vocaRes.json() : { results: [] };
    const diaryData = diaryRes && diaryRes.ok ? await diaryRes.json() : { results: [] };

    const studyLogs = logsData.results || [];
    const vocaList = (vocaData.results || []).map(parseVocaPage);
    const diaryList = diaryData.results || [];

    // ⏰ [스크린타임 클라우드 동기화] 노션에 저장된 오늘 학습일지 소요시간을 트래커에 즉시 반영
    if (typeof window.ScreenTimeTracker !== 'undefined' && typeof window.ScreenTimeTracker.syncFromStudyLogs === 'function') {
        window.ScreenTimeTracker.syncFromStudyLogs(studyLogs, '민수');
        window.ScreenTimeTracker.syncFromStudyLogs(studyLogs, '민서');
    }

    if (invData.results && invData.results.length > 0) {
      invData.results.forEach(page => {
        const props = page.properties;
        const name = props["이름"]?.title[0]?.plain_text;
        
        if (name === "민수" || name === "민서") {
          const prefix = name === "민수" ? "ms" : "ds";
          const isMinseo = name === "민서";
          
          // ⏰ [스크린타임 보상 & 승인 클라우드 동기화] 노션 인벤토리 DB 데이터 트래커 반영
          if (typeof window.ScreenTimeTracker !== 'undefined' && typeof window.ScreenTimeTracker.syncFromInventoryProps === 'function') {
            window.ScreenTimeTracker.syncFromInventoryProps(props, name);
          }

          // 로컬 상태 보존
          memoryState[name].pageId = page.id;
          memoryState[name].ticketCount = props["소원권 개수"]?.number || 0;
          localStorage.setItem(`MINMIN_INVENTORY_PAGE_ID_${name}`, page.id);

          // 💾 [학습설정 원본 캐시 보존] 타 모듈(퀴즈 플로우 등)과의 덮어쓰기 방지
          const settingRaw = props["학습설정"]?.rich_text || props["학습설정"];
          let jsonText = '';
          if (typeof settingRaw === 'string') jsonText = settingRaw;
          else if (Array.isArray(settingRaw)) jsonText = settingRaw.map(t => t.plain_text || t.text?.content || '').join('');
          else if (settingRaw?.rich_text && Array.isArray(settingRaw.rich_text)) jsonText = settingRaw.rich_text.map(t => t.plain_text || t.text?.content || '').join('');
          if (jsonText && jsonText.trim()) {
            localStorage.setItem(`MINMIN_CLOUD_SETTINGS_${name}`, jsonText);
            const childKey = name === "민수" ? "minsu" : "minseo";
            localStorage.setItem(`MINMIN_LAST_CLOUD_SETTINGS_${childKey}`, jsonText);
          }

          // 1. 과목별 성장 마스터 바인딩 (민수 vs 민서 이원화)
          if (isMinseo) {
            // 👧 민서: 초1 맞춤 3대 교과 (국어, 수학, 하루) + 3대 활동 (창의, 습관, 어휘)
            const korRealEl = document.getElementById("ds-kor-real");
            const mathEl = document.getElementById("ds-math");
            const haruEl = document.getElementById("ds-haru");
            const artEl = document.getElementById("ds-art");
            const habitEl = document.getElementById("ds-habit");
            const korVocaEl = document.getElementById("ds-kor");

            const korRealLv = props["국어 레벨"]?.number || 1;
            const mathLv = props["수학 레벨"]?.number || 1;
            const haruLv = props["하루 레벨"]?.number || props["사회 레벨"]?.number || 1;
            const korVocaLv = props["용어 레벨"]?.number || 1;

            if (korRealEl) { korRealEl.textContent = "Lv." + korRealLv; korRealEl.classList.remove("loading-shimmer"); }
            if (mathEl) { mathEl.textContent = "Lv." + mathLv; mathEl.classList.remove("loading-shimmer"); }
            if (haruEl) { haruEl.textContent = "Lv." + haruLv; haruEl.classList.remove("loading-shimmer"); }
            if (korVocaEl) { korVocaEl.textContent = "Lv." + korVocaLv; korVocaEl.classList.remove("loading-shimmer"); }

            // 창의·예술: 노션 성장 갤러리 DB 3dfa2711... 기반 실시간 작품 수 카운트 (SSOT 단일 원천)
            let minseoArtCount = 0;
            if (Array.isArray(diaryList) && diaryList.length > 0) {
              minseoArtCount = diaryList.filter(item => {
                const author = item.properties?.["주인공"]?.select?.name;
                return author === '민서' || author === '공동';
              }).length;
            }
            if (minseoArtCount === 0) {
              if (typeof DEFAULT_GALLERY_DATA !== 'undefined' && Array.isArray(DEFAULT_GALLERY_DATA)) {
                minseoArtCount = DEFAULT_GALLERY_DATA.filter(item => item.author === '민서' || item.author === '공동').length;
              } else {
                try {
                  const localGal = JSON.parse(localStorage.getItem('MY_STUDY_ROOM_GALLERY_DATA') || '[]');
                  minseoArtCount = localGal.filter(item => item.author === '민서' || item.author === '공동').length;
                } catch (e) {}
              }
            }
            if (artEl) { artEl.textContent = minseoArtCount + "작품"; artEl.classList.remove("loading-shimmer"); }

            // 착한 습관: 노션 인벤토리 DB 학습설정(piggyBank) 기반 실시간 코인 연동 (SSOT 단일 원천)
            const cloudCoins = extractPiggyCoins(props["학습설정"], 'minseo');
            const minseoCoins = cloudCoins !== null ? cloudCoins : parseInt(localStorage.getItem("haru_piggy_coins_minseo") || "0");
            if (cloudCoins !== null) {
              try { localStorage.setItem("haru_piggy_coins_minseo", String(cloudCoins)); } catch (_) {}
            }
            if (habitEl) { habitEl.textContent = minseoCoins + "/20코인"; habitEl.classList.remove("loading-shimmer"); }
          } else {
            // 👦 민수: 5대 정규 교과 + 용어사전
            const mathEl = document.getElementById("ms-math");
            const engEl = document.getElementById("ms-eng");
            const korEl = document.getElementById("ms-kor");
            const korRealEl = document.getElementById("ms-kor-real");
            const sciEl = document.getElementById("ms-sci");
            const socEl = document.getElementById("ms-soc");

            const mathLv = props["수학 레벨"]?.number || 1;
            const engLv = props["영어 레벨"]?.number || 1;
            const korVocaLv = props["용어 레벨"]?.number || 1;
            const korRealLv = props["국어 레벨"]?.number || 1;
            const sciLv = props["과학 레벨"]?.number || 1;
            const socLv = props["사회 레벨"]?.number || 1;

            if (mathEl) { mathEl.textContent = "Lv." + mathLv; mathEl.classList.remove("loading-shimmer"); }
            if (engEl) { engEl.textContent = "Lv." + engLv; engEl.classList.remove("loading-shimmer"); }
            if (korEl) { korEl.textContent = "Lv." + korVocaLv; korEl.classList.remove("loading-shimmer"); }
            if (korRealEl) { korRealEl.textContent = "Lv." + korRealLv; korRealEl.classList.remove("loading-shimmer"); }
            if (sciEl) { sciEl.textContent = "Lv." + sciLv; sciEl.classList.remove("loading-shimmer"); }
            if (socEl) { socEl.textContent = "Lv." + socLv; socEl.classList.remove("loading-shimmer"); }
          }

          // 2. 인벤토리 주입 (다이아 / 하리보 / 소원권)
          const diaEl = document.getElementById(prefix + "-dia");
          const slimeEl = document.getElementById(prefix + "-slime");
          const ticketEl = document.getElementById(prefix + "-ticket");

          if (diaEl) {
            diaEl.textContent = (props["다이아몬드 개수"]?.number || 0) + "개";
            diaEl.classList.remove("loading-shimmer");
          }

          if (slimeEl) {
            slimeEl.textContent = (typeof getDaughterRewardCount === 'function'
              ? getDaughterRewardCount(props)
              : (props["하리보 젤리 개수"]?.number || props["슬라임 파츠 개수"]?.number || 0)) + "개";
            slimeEl.classList.remove("loading-shimmer");
          }

          if (ticketEl) {
            ticketEl.textContent = memoryState[name].ticketCount + "장";
            ticketEl.classList.remove("loading-shimmer");
          }

          // 2. 연속 학습 Streak 계산 & UI 주입
          const streak = calcStreak(studyLogs, name);
          const streakValEl = document.getElementById(prefix + "-streak-val");
          if (streakValEl) streakValEl.textContent = streak;
          
          const streakProgEl = document.getElementById(prefix + "-streak-progress-num");
          if (streakProgEl) streakProgEl.textContent = streak + " / 7일";
          const streakFillEl = document.getElementById(prefix + "-streak-fill");
          if (streakFillEl) streakFillEl.style.width = Math.min(Math.round((streak / 7) * 100), 100) + "%";

          // 3. 완공률 계산 & UI 주입
          const completion = calcCompletion(vocaList, name);
          const compNumEl = document.getElementById(prefix + "-completion-num");
          if (compNumEl) compNumEl.textContent = completion + "%";
          const compFillEl = document.getElementById(prefix + "-completion-fill");
          if (compFillEl) compFillEl.style.width = completion + "%";

          // 4. 망각곡선 신호등 렌더링
          const trafficItems = buildTrafficLights(vocaList, name);
          renderTrafficUI(prefix + "-traffic-list", trafficItems);

          // 5. 과목/성장 레이더 차트 렌더링 (민수: 5대 교과 / 민서: 초1 맞춤 5각 밸런스)
          const radarScores = buildRadarScores(props, vocaList, name, studyLogs, diaryList);
          const radarLabels = isMinseo ? SUBJECTS_MINSEO : SUBJECTS_MINSU;
          const radarTitle = isMinseo ? "민서 맞춤 성장 밸런스" : "민수 과목 밸런스";
          renderRadarChart(prefix + "-radar-chart", radarTitle, radarScores, isMinseo, radarLabels);

          // 6. 스크린타임 스마트 정산기 위젯 렌더링
          renderScreenTimeWidget(name);

          // 7. 데일리 습관 & 부모 칭찬 코칭 카드 렌더링 (민수 / 민서 공통 지원)
          renderHaruParentCoaching(studyLogs, name);

          // 8. 닥터 코코 실시간 안심 알림 위젯 렌더링 (민수 / 민서 공통 지원)
          renderSafetyAlertWidget(studyLogs, name);
        }
      });
    }
  } catch (error) {
    console.error("데이터 로드 에러:", error);
    document.querySelectorAll(".loading-shimmer").forEach(el => {
      el.textContent = "연결실패";
      el.style.color = "#ff6b6b";
      el.classList.remove("loading-shimmer");
    });
    // 네트워크 실패 시 로컬 캐시 데이터 폴백 렌더링
    renderHaruParentCoaching([], "민수");
    renderHaruParentCoaching([], "민서");
    renderSafetyAlertWidget([], "민수");
    renderSafetyAlertWidget([], "민서");
  } finally {
    // 트래커 데이터 로컬 렌더링 보장 (화면 타이머 위젯)
    renderScreenTimeWidget("민수");
    renderScreenTimeWidget("민서");
  }
}

// 가디언 부모 관리 화면의 자녀별 진입 링크
// 시간 관리와 인증은 가디언 전용 서버에서 수행합니다.
function renderScreenTimeWidget(childName) {
  const prefix = childName === "민서" ? "ds" : "ms";
  const child = childName === "민서" ? "minseo" : "minsu";
  const link = document.getElementById(prefix + "-guardian-parent-link");
  if (link) link.href = "https://kids-screen-guardian.awslike6.workers.dev/parent#" + child;
}

// 🌱 [데일리 루틴 & 하루] 생활 습관 & 부모 칭찬 코칭 카드 렌더링 (민수/민서 공통)
function renderHaruParentCoaching(studyLogs = [], childName = "민서") {
  const isMinsu = childName === "민수";
  const childKey = isMinsu ? "minsu" : "minseo";
  const prefix = isMinsu ? "ms" : "ds";

  const boxEl = document.getElementById(prefix + "-haru-coaching-box");
  if (!boxEl) return;

  const todayStr = getTodayDateStr();
  const isDoneLocal = localStorage.getItem("haru_checkin_done_" + todayStr + "_" + childKey) === "true";
  let coins = parseInt(localStorage.getItem("haru_piggy_coins_" + childKey) || "0");
  let habitName = localStorage.getItem("haru_today_habit_" + childKey) || "";
  let workoutName = localStorage.getItem("haru_today_workout_" + childKey) || "";
  let moodName = localStorage.getItem("haru_today_mood_" + childKey) || "";
  let isDone = isDoneLocal;

  // 노션 학습일지 DB 데이터가 전달된 경우 원격 부모 디바이스 폴백 지원
  if (Array.isArray(studyLogs) && studyLogs.length > 0) {
    const todayHaruLog = studyLogs.find(log => {
      const child = log.properties["학생"]?.select?.name;
      const subj = log.properties["과목"]?.rich_text?.[0]?.plain_text || log.properties["과목"]?.select?.name || "";
      const date = log.properties["입장"]?.date?.start || log.properties["날짜"]?.date?.start || "";
      const title = log.properties["ID"]?.title?.[0]?.plain_text || log.properties["제목"]?.title?.[0]?.plain_text || "";
      const matchesChild = child === childName;
      const matchesSubj = subj.includes("하루") || subj.includes("루틴") || title.includes("하루") || title.includes("루틴");
      const matchesDate = (date && date.startsWith(todayStr)) || title.includes(todayStr);
      return matchesChild && matchesSubj && matchesDate;
    });

    if (todayHaruLog) {
      isDone = true;
      const content = todayHaruLog.properties["오답리포트"]?.rich_text?.[0]?.plain_text || todayHaruLog.properties["학습내용"]?.rich_text?.[0]?.plain_text || "";
      const habitMatch = content.match(/착한\s*습관:\s*([^\n\r]+)/);
      const workoutMatch = content.match(/(?:튼튼운동|건강운동):\s*([^\n\r]+)/);
      const moodMatch = content.match(/마음\s*날씨:\s*([^\(\[\n\r]+)/);

      if (habitMatch && habitMatch[1] && !habitName) habitName = habitMatch[1].trim();
      if (workoutMatch && workoutMatch[1] && !workoutName) workoutName = workoutMatch[1].trim();
      if (moodMatch && moodMatch[1] && !moodName) moodName = moodMatch[1].trim();

      if (!moodName) {
        const moodProp = todayHaruLog.properties["감정날씨"]?.rich_text?.[0]?.plain_text;
        if (moodProp) moodName = moodProp.trim();
      }

      // 로컬 스토리지에 동기화 캐시 (부모 디바이스 새로고침 및 로컬 보존)
      try {
        localStorage.setItem("haru_checkin_done_" + todayStr + "_" + childKey, "true");
        if (habitName) localStorage.setItem("haru_today_habit_" + childKey, habitName);
        if (workoutName) localStorage.setItem("haru_today_workout_" + childKey, workoutName);
        if (moodName) localStorage.setItem("haru_today_mood_" + childKey, moodName);
      } catch(_) {}
    }
  }

  // 이미 화면이 완료 상태로 렌더링되어 있다면 빈 배열 호출 시 다운그레이드 방지
  if (!isDone && (!studyLogs || studyLogs.length === 0)) {
    const currentBadge = document.getElementById(prefix + "-haru-today-badge");
    if (currentBadge && currentBadge.textContent.includes("완료")) {
      return;
    }
  }

  // 엘리먼트 참조
  const badgeEl = document.getElementById(prefix + "-haru-today-badge");
  const habitValEl = document.getElementById(isMinsu ? "ms-coach-habit-val" : "coach-habit-val");
  const workoutValEl = document.getElementById(isMinsu ? "ms-coach-workout-val" : "coach-workout-val");
  const moodValEl = document.getElementById(isMinsu ? "ms-coach-mood-val" : "coach-mood-val");
  const piggyTextEl = document.getElementById(isMinsu ? "ms-coach-piggy-progress-text" : "coach-piggy-progress-text");
  const piggyBarEl = document.getElementById(isMinsu ? "ms-coach-piggy-progress-bar" : "coach-piggy-progress-bar");
  const praiseScriptEl = document.getElementById(isMinsu ? "ms-coach-praise-script" : "coach-praise-script");

  // 20칸 저금통 진행률
  const pct = Math.min(Math.round((coins / 20) * 100), 100);
  if (piggyTextEl) piggyTextEl.textContent = `${coins} / 20개 (${pct}%)`;
  if (piggyBarEl) piggyBarEl.style.width = `${pct}%`;

  const { isAdmin } = getUserAuth();

  if (isDone) {
    if (badgeEl) {
      badgeEl.textContent = "체크인 완료 🎉";
      badgeEl.style.background = "#dcfce7";
      badgeEl.style.color = "#15803d";
    }
    if (habitValEl) habitValEl.textContent = habitName || "실천 완료 ✨";
    if (workoutValEl) workoutValEl.textContent = workoutName || "실천 완료 ✨";
    if (moodValEl) moodValEl.textContent = moodName || "기록 완료 ✨";

    // 💡 맞춤형 칭찬 큐시트 생성
    let habitPraise = "";
    if (isMinsu) {
      // 👦 민수 전용: 의젓한 5학년 자기주도성 & 배려심 강화 칭찬
      if (habitName.includes("신발")) {
        habitPraise = "👟 <b>[현관 신발 정리]:</b> \"현관 신발을 가지런히 정돈해 둔 민수의 멋진 배려심을 칭찬해 주세요! 든든한 5학년 형아의 품격이 느껴져요.\"";
      } else if (habitName.includes("가방") || habitName.includes("알림장") || habitName.includes("준비물") || habitName.includes("책")) {
        habitPraise = "🎒 <b>[수업 준비물 스스로 챙기기]:</b> \"5학년 수업 준비물과 책가방을 스스로 꼼꼼히 챙기다니 정말 자기주도적인 멋진 모습입니다!\"";
      } else if (habitName.includes("손") || habitName.includes("양치")) {
        habitPraise = "🫧 <b>[청결 & 위생 관리]:</b> \"위생 습관을 잊지 않고 스스로 깔끔하게 실천하는 민수의 관리 태도가 아주 훌륭해요!\"";
      } else if (habitName.includes("정리") || habitName.includes("방") || habitName.includes("책상")) {
        habitPraise = "📚 <b>[책상 & 방 정리정돈]:</b> \"자신의 공부방과 책상을 스스로 단정하게 정리한 민수의 책임감을 크게 인정해 주세요!\"";
      } else if (habitName.includes("인사")) {
        habitPraise = "🌸 <b>[의젓한 예절 인사]:</b> \"가족과 이웃에게 먼저 의젓하고 정중하게 인사하는 민수의 태도가 정말 멋져요!\"";
      } else if (habitName.includes("도움") || habitName.includes("돕기")) {
        habitPraise = "💖 <b>[가족 배려와 도움]:</b> \"가족을 위해 먼저 손을 내밀고 도와준 민수의 듬직하고 따뜻한 마음씨가 큰 힘이 됩니다!\"";
      } else {
        habitPraise = `✨ <b>[자기주도 실천]:</b> \"오늘 스스로 <b>[${habitName || '착한 습관'}]</b>을(를) 멋지게 실천한 민수의 노력을 인정하고 하이파이브를 나눠주세요!\"`;
      }
    } else {
      // 👧 민서 전용: 아기자기 1학년 자신감 & 사랑 듬뿍 칭찬
      if (habitName.includes("신발")) {
        habitPraise = "👟 <b>[신발 정리]:</b> \"현관에 신발을 예쁘게 정리해 줘서 집이 훨씬 밝아졌네! 민서의 배려 덕분에 엄마·아빠 기분이 참 좋다!\"";
      } else if (habitName.includes("가방") || habitName.includes("알림장")) {
        habitPraise = "🎒 <b>[스스로 챙기기]:</b> \"학교 가방과 알림장을 똑소리 나게 스스로 챙기다니 정말 의젓한 1학년 언니가 다 됐네!\"";
      } else if (habitName.includes("손") || habitName.includes("양치")) {
        habitPraise = "🫧 <b>[청결 습관]:</b> \"스스로 깨끗하게 손 씻고 양치질하는 민서 모습이 반짝반짝 빛나고 정말 멋져!\"";
      } else if (habitName.includes("장난감") || habitName.includes("방") || habitName.includes("정리")) {
        habitPraise = "🧸 <b>[제자리 정리]:</b> \"놀던 물건을 스스로 쏙쏙 제자리에 정리해 줘서 방이 깨끗해졌어! 민서는 정리 마법사야!\"";
      } else if (habitName.includes("인사")) {
        habitPraise = "🌸 <b>[밝은 인사]:</b> \"예쁜 목소리로 먼저 밝게 인사해 줘서 온 가족의 마음이 사르르 녹아내려!\"";
      } else if (habitName.includes("도움") || habitName.includes("돕기")) {
        habitPraise = "💖 <b>[가족 돕기]:</b> \"엄마·아빠를 먼저 도와주려고 나선 민서의 착하고 따뜻한 마음씨가 정말 큰 힘이 돼!\"";
      } else {
        habitPraise = `✨ <b>[착한 실천]:</b> \"오늘 스스로 <b>[${habitName || '착한 습관'}]</b>을(를) 멋지게 실천한 민서의 노력을 꼭 안아주며 칭찬해 주세요!\"`;
      }
    }

    let workoutPraise = workoutName ? `<br>💪 <b>[건강 운동]:</b> 오늘 <b>[${workoutName}]</b>까지 씩씩하게 실천하여 체력도 쑥쑥 길렀어요!` : "";

    let moodPraise = "";
    if (moodName.includes("기쁨") || moodName.includes("행복")) {
      moodPraise = `<br>☀️ <b>[햇살 마음 대화]:</b> \"오늘 ${childName} 마음이 햇살처럼 환해서 기뻐! 오늘 있었던 제일 즐거운 일이나 성취감을 엄마·아빠한테 들려줄래?\"`;
    } else if (moodName.includes("즐거움") || moodName.includes("신남")) {
      moodPraise = `<br>🌈 <b>[무지개 마음 대화]:</b> \"오늘 신나는 일이 가득했구나! 어떤 재미난 모험이 있었는지 함께 들려줘!\"`;
    } else if (moodName.includes("슬픔") || moodName.includes("속상")) {
      moodPraise = `<br>🌧️ <b>[비구름 공감 대화]:</b> \"마음에 비구름이 살짝 지나갔네. 속상한 일 있었어? 엄마 아빠는 항상 ${childName} 편이야, 든든하게 응원해 줄게.\"`;
    } else if (moodName.includes("화남") || moodName.includes("짜증")) {
      moodPraise = `<br>⚡ <b>[번개 진정 대화]:</b> \"마음속에 화나고 답답한 바람이 불었구나. 괜찮아, 그럴 때도 있어. 심호흡 한번 하고 편안히 쉬자.\"`;
    } else if (moodName.includes("피곤") || moodName.includes("지침")) {
      moodPraise = `<br>🌫️ <b>[안개 위로 대화]:</b> \"오늘 학교에서 열심히 배우고 활동하느라 피곤했지? 정말 고생 많았어, 오늘은 푹 쉬자!\"`;
    } else if (moodName.includes("평온") || moodName.includes("보통")) {
      moodPraise = `<br>🌱 <b>[새싹 안정 대화]:</b> \"차분하고 평온하게 하루를 잘 보냈네! 오늘 하루도 무탈하게 잘 자라줘서 고마워.\"`;
    }

    let milestonePraise = "";
    if (coins >= 20) {
      milestonePraise = `
        <div style="margin-top: 8px; padding: 6px 10px; background: #fef9c3; border-radius: 8px; border: 1px solid #fde047; font-weight: bold; color: #854d0e;">
          🎊 <b>[20칸 저금통 완주 특급 알림]:</b> 마이룸에 <b>[🏆 황금 돼지 트로피]</b>가 수여되었습니다! 이번 주말 <b>[가족 소원권]</b>을 무엇으로 함께 즐길지 ${childName}와 신나게 대화해 보세요!
        </div>
      `;
    }

    if (praiseScriptEl) {
      praiseScriptEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div>${habitPraise}</div>
          ${workoutPraise ? `<div>${workoutPraise}</div>` : ""}
          ${moodPraise ? `<div>${moodPraise}</div>` : ""}
          ${milestonePraise}
        </div>
      `;
    }
  } else {
    // 오늘 미체크인 상태
    if (badgeEl) {
      badgeEl.textContent = "오늘 미완료 ⏳";
      badgeEl.style.background = "#fef3c7";
      badgeEl.style.color = "#b45309";
    }
    if (habitValEl) habitValEl.textContent = "미실천";
    if (workoutValEl) workoutValEl.textContent = "미실천";
    if (moodValEl) moodValEl.textContent = "미실천";

    if (praiseScriptEl) {
      const roomLink = isMinsu ? "[🌱 데일리 루틴 & 저금통]" : "[🌱 슬기로운 하루 탐험관]";
      const curIcon = isMinsu ? "다이아 💎" : "젤리 🍬";
      if (isAdmin) {
        praiseScriptEl.innerHTML = `
          <div style="color: #64748b; font-size: 0.88rem;">
            <span>${childName}가 아직 오늘 하루 체크인을 하지 않았어요.</span><br>
            <span style="color: #d97706; font-weight: bold; margin-top: 4px; display: inline-block;">
              💬 다정한 말 건네기 팁: "${childName}야, 오늘 학교 잘 다녀왔어? 오늘 실천한 착한 습관 저금통에 넣고 ${curIcon} 챙겨볼까?" 하고 <b>${roomLink}</b> 30초 체크인을 가볍게 권유해 보세요!
            </span>
          </div>
        `;
      } else {
        praiseScriptEl.innerHTML = `
          <div style="color: #64748b; font-size: 0.88rem;">
            <span>오늘 착한 습관과 운동을 실천하고 마음 날씨를 골라보세요!</span><br>
            <span style="color: #2563eb; font-weight: bold; margin-top: 4px; display: inline-block;">
              👉 <b>${roomLink}</b>에서 30초 체크인하고 땡그랑 황금 코인과 ${curIcon}을 받아보자! ✨
            </span>
          </div>
        `;
      }
    }
  }
}

// 🚨 [닥터 코코 안심 알림] 실시간 안전/응급처치 위젯 렌더링
function renderSafetyAlertWidget(studyLogs = [], childName = "민서") {
  const isMinsu = childName === "민수";
  const childKey = isMinsu ? "minsu" : "minseo";
  const prefix = isMinsu ? "ms" : "ds";

  const alertBox = document.getElementById(prefix + "-safety-alert-box");
  const timeBadge = document.getElementById(prefix + "-safety-time-badge");
  const contentEl = document.getElementById(prefix + "-safety-alert-content");
  if (!alertBox || !contentEl) return;

  const todayStr = getTodayDateStr();
  let latestLog = null;

  // 1. 로컬스토리지 최신 기록 확인
  const localSaved = localStorage.getItem("haru_last_safety_consultation_" + childKey);
  if (localSaved) {
    try {
      const parsed = JSON.parse(localSaved);
      if (parsed.date === todayStr) {
        latestLog = parsed;
      }
    } catch(e) {}
  }

  // 2. 노션 학습일지 DB 데이터에서 오늘 발생한 닥터 코코 상담 확인 (원격 폴백)
  if (!latestLog && Array.isArray(studyLogs) && studyLogs.length > 0) {
    const remoteLog = studyLogs.find(log => {
      const child = log.properties["학생"]?.select?.name;
      const date = log.properties["입장"]?.date?.start || log.properties["날짜"]?.date?.start || "";
      const title = log.properties["ID"]?.title?.[0]?.plain_text || log.properties["제목"]?.title?.[0]?.plain_text || "";
      const content = log.properties["오답리포트"]?.rich_text?.[0]?.plain_text || log.properties["학습내용"]?.rich_text?.[0]?.plain_text || "";
      const matchesChild = child === childName;
      const isSafety = title.includes("닥터 코코") || content.includes("닥터 코코") || content.includes("응급상담");
      const matchesDate = (date && date.startsWith(todayStr)) || title.includes(todayStr);
      return matchesChild && isSafety && matchesDate;
    });

    if (remoteLog) {
      const titleText = remoteLog.properties["ID"]?.title?.[0]?.plain_text || remoteLog.properties["제목"]?.title?.[0]?.plain_text || "";
      const contentText = remoteLog.properties["오답리포트"]?.rich_text?.[0]?.plain_text || remoteLog.properties["학습내용"]?.rich_text?.[0]?.plain_text || "";
      const symptomMatch = titleText.match(/\[🚨 닥터 코코 상담\]\s*(.+)/) || contentText.match(/증상:\s*([^\n\r]+)/);
      const sayMatch = contentText.match(/처치안내:\s*([^\n\r]+)/);
      const timeMatch = contentText.match(/시간:\s*([^\n\r]+)/);

      latestLog = {
        title: symptomMatch ? (symptomMatch[1] || symptomMatch[0]).trim() : "응급 상담",
        icon: "🩺",
        time: timeMatch ? timeMatch[1].trim() : "오늘",
        cocoSay: sayMatch ? sayMatch[1].trim() : "단계별 응급처치 안내를 확인했습니다."
      };
    }
  }

  // 3. UI 렌더링
  if (latestLog) {
    alertBox.style.display = "block";
    alertBox.style.borderColor = "#ff4757";
    alertBox.style.background = "linear-gradient(135deg, rgba(255, 71, 87, 0.08), rgba(255, 107, 129, 0.12))";

    if (timeBadge) {
      timeBadge.innerText = `${latestLog.time || '오늘'} 상담 발생 🚨`;
      timeBadge.style.background = "#ffeaa7";
      timeBadge.style.color = "#d63031";
    }

    contentEl.style.borderColor = "#ffccd2";
    contentEl.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
        <span style="font-size:1.4rem;">${latestLog.icon || '🩹'}</span>
        <span style="font-weight:bold; color:#d63031; font-size:0.98rem;">${latestLog.title}</span>
      </div>
      <div style="font-size:0.88rem; color:#4b5563; line-height:1.45; background:#f9fafb; padding:8px 10px; border-radius:10px; margin-bottom:8px; border-left:3px solid #0984e3;">
        <b>닥터 코코 안내:</b> "${latestLog.cocoSay || '깨끗이 소독하고 치료를 완료하세요.'}"
      </div>
      <div style="font-size:0.8rem; color:#15803d; font-weight:bold; display:flex; align-items:center; gap:4px;">
        <span>💡</span> <span><b>부모 안심 코칭:</b> 귀가 후 상처 부위가 덧나지 않았는지 다정하게 한 번 더 살펴봐 주세요.</span>
      </div>
    `;
  } else {
    // 오늘 상담 내역이 없는 경우: 정상 안심 상태
    alertBox.style.display = "block";
    alertBox.style.borderColor = "#86efac";
    alertBox.style.background = "linear-gradient(135deg, rgba(240, 253, 244, 0.6), rgba(220, 252, 231, 0.6))";
    
    if (timeBadge) {
      timeBadge.innerText = "안전 상태 양호 🛡️";
      timeBadge.style.background = "#dcfce7";
      timeBadge.style.color = "#15803d";
    }

    contentEl.style.borderColor = "#bbf7d0";
    contentEl.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; color:#166534; font-size:0.88rem;">
        <span style="font-size:1.2rem;">🛡️</span>
        <span>오늘 다치거나 응급처치를 상담한 내역이 없이 건강하고 안전하게 하루를 보내고 있어요!</span>
      </div>
    `;
  }
}

// 기동 처리
window.addEventListener('DOMContentLoaded', () => {
  makeBgFloats();
  setupAuthUI();
  loadDashboardData();
});

// 🔄 [실시간 기기 간 동기화] 스마트폰 등 타 기기 승인 후 PC 창 복귀 시 자동 갱신
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    loadDashboardData();
  }
});
window.addEventListener('focus', () => {
  loadDashboardData();
});

