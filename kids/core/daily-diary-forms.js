// kids/core/daily-diary-forms.js - daily-diary.js 분리 2/4: 일기 폼·선택 카드·노션 전송·보상 (순서대로 로드)
// 🐰 민서 (1학년) 일기 폼 렌더러
function renderMinseoDiaryForm(todayYMD) {
    const { isParentMode } = getCurrentDiaryTarget();
    return `
        <!-- 1. 마음 날씨 -->
        <div>
            <div class="diary-sec-title">
                <span>🌤️ 1. 지금 나의 마음 날씨는 어떤가요?</span>
            </div>
            <div class="weather-grid" id="minseoWeatherGrid">
                <div class="choice-card selected" onclick="selectChoiceCard(this, 'minseoWeather')" data-val="☀️ 맑음">
                    <div style="font-size: 1.6rem;">☀️</div>
                    <div style="font-weight:bold; font-size:0.9rem;">맑고 따뜻</div>
                    <div style="font-size:0.75rem; opacity:0.8;">기분 좋아요</div>
                </div>
                <div class="choice-card" onclick="selectChoiceCard(this, 'minseoWeather')" data-val="💎 보석 반짝">
                    <div style="font-size: 1.6rem;">💎</div>
                    <div style="font-weight:bold; font-size:0.9rem;">보석 반짝</div>
                    <div style="font-size:0.75rem; opacity:0.8;">뿌듯·자랑</div>
                </div>
                <div class="choice-card" onclick="selectChoiceCard(this, 'minseoWeather')" data-val="⚡ 번개 찌지직">
                    <div style="font-size: 1.6rem;">⚡</div>
                    <div style="font-weight:bold; font-size:0.9rem;">번개 찌지직</div>
                    <div style="font-size:0.75rem; opacity:0.8;">깜짝 놀람</div>
                </div>
                <div class="choice-card" onclick="selectChoiceCard(this, 'minseoWeather')" data-val="🥶 얼음 꽁꽁">
                    <div style="font-size: 1.6rem;">🥶</div>
                    <div style="font-weight:bold; font-size:0.9rem;">얼음 꽁꽁</div>
                    <div style="font-size:0.75rem; opacity:0.8;">긴장·무서움</div>
                </div>
                <div class="choice-card" onclick="selectChoiceCard(this, 'minseoWeather')" data-val="🌋 화산 우르릉">
                    <div style="font-size: 1.6rem;">🌋</div>
                    <div style="font-weight:bold; font-size:0.9rem;">화산 우르릉</div>
                    <div style="font-size:0.75rem; opacity:0.8;">화나고 속상</div>
                </div>
            </div>
        </div>

        <!-- 2. 기분 풍선 -->
        <div>
            <div class="diary-sec-title">
                <span>🎈 2. 내 마음속 기분 풍선을 골라보세요! (여러 개 가능)</span>
            </div>
            <div class="balloon-tags" id="minseoBalloonGrid">
                <span class="balloon-tag selected" onclick="toggleBalloonTag(this)">🎈 신나요</span>
                <span class="balloon-tag selected" onclick="toggleBalloonTag(this)">🎈 뿌듯해요</span>
                <span class="balloon-tag" onclick="toggleBalloonTag(this)">🎈 행복해요</span>
                <span class="balloon-tag" onclick="toggleBalloonTag(this)">🎈 사랑해요</span>
                <span class="balloon-tag" onclick="toggleBalloonTag(this)">🎈 고마워요</span>
                <span class="balloon-tag" onclick="toggleBalloonTag(this)">🎈 설레어요</span>
                <span class="balloon-tag" onclick="toggleBalloonTag(this)">🎈 속상해요</span>
                <span class="balloon-tag" onclick="toggleBalloonTag(this)">🎈 답답해요</span>
            </div>
        </div>

        <!-- 3. 오늘 있었던 일 -->
        <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <div class="diary-sec-title" style="margin-bottom:0;">
                    <span>📝 3. 어떤 일이 있었나요?</span>
                </div>
                <button type="button" class="btn-voice" onclick="startDiaryVoiceInput('minseoEventInput', this)">
                    🎙️ 말로 하기 (음성 입력)
                </button>
            </div>
            <textarea id="minseoEventInput" class="diary-input" rows="2" placeholder="예: 친구랑 블록 놀이를 재미있게 했어요!"></textarea>
        </div>

        <!-- 4. 나-전달법 마법 주문 한 줄 -->
        <div>
            <div class="diary-sec-title">
                <span>🪄 4. 소곤소곤 '나-전달법' 마법 한 문장</span>
            </div>
            <div style="background:rgba(255,255,255,0.8); border:1.5px dashed #ff85a2; padding:14px; border-radius:16px; display:flex; flex-direction:column; gap:10px; font-size:0.95rem;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="font-weight:bold; color:#be185d; min-width:82px;">👉 그때 상황:</span>
                    <input type="text" id="minseoIMessageSit" class="diary-input" style="flex:1; min-width:160px; padding:8px 12px;" placeholder="어떤 상황이었나요? (예: 발표를 잘 끝마쳤을 때 / 친구랑 놀았어요)">
                </div>
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="font-weight:bold; color:#be185d; min-width:82px;">👉 내 마음은:</span>
                    <input type="text" id="minseoIMessageFeel" class="diary-input" style="flex:1; min-width:160px; padding:8px 12px;" placeholder="어떤 마음이 들었나요? (예: 보석처럼 반짝반짝 뿌듯했어요 / 신났어요)">
                </div>
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span style="font-weight:bold; color:#be185d; min-width:82px;">👉 앞으로는:</span>
                    <input type="text" id="minseoIMessageWish" class="diary-input" style="flex:1; min-width:160px; padding:8px 12px;" placeholder="나에게 해주는 말 (예: 계속 씩씩하게 도전할 거야 / 사이좋게 지내자)">
                </div>
            </div>
        </div>

        <button class="btn-submit-diary" onclick="submitMinseoDiary('${todayYMD}')">
            <span>${isParentMode ? '🌟 일기 완성하고 기록하기 (부모 검수)' : '🌟 일기 완성하고 별 도장 받기! (+5🍬)'}</span>
        </button>
    `;
}

// 🎮 민수 (5학년) 가볍고 편안한 일상 & 마음 로그 폼 렌더러
function renderMinsuDiaryForm(todayYMD) {
    const { isParentMode } = getCurrentDiaryTarget();
    return `
        <!-- 1. 오늘의 바이브 / 기분 -->
        <div>
            <div class="diary-sec-title">
                <span>😎 1. 지금 나의 기분 & 바이브는?</span>
            </div>
            <div class="energy-grid" id="minsuEnergyGrid">
                <div class="choice-card selected" onclick="selectChoiceCard(this, 'minsuEnergy')" data-val="😎 꿀잼·대만족">
                    <div style="font-size: 1.6rem;">😎</div>
                    <div style="font-weight:bold; font-size:0.9rem;">꿀잼·대만족</div>
                    <div style="font-size:0.75rem; opacity:0.8;">기분 최고!</div>
                </div>
                <div class="choice-card" onclick="selectChoiceCard(this, 'minsuEnergy')" data-val="🎮 신남·재밌음">
                    <div style="font-size: 1.6rem;">🎮</div>
                    <div style="font-weight:bold; font-size:0.9rem;">신남·재밌음</div>
                    <div style="font-size:0.75rem; opacity:0.8;">취미/친구랑 놂</div>
                </div>
                <div class="choice-card" onclick="selectChoiceCard(this, 'minsuEnergy')" data-val="🌿 무난·평화">
                    <div style="font-size: 1.6rem;">🌿</div>
                    <div style="font-weight:bold; font-size:0.9rem;">무난·평화</div>
                    <div style="font-size:0.75rem; opacity:0.8;">편안했던 하루</div>
                </div>
                <div class="choice-card" onclick="selectChoiceCard(this, 'minsuEnergy')" data-val="🥱 피곤·휴식">
                    <div style="font-size: 1.6rem;">🥱</div>
                    <div style="font-weight:bold; font-size:0.9rem;">피곤·휴식</div>
                    <div style="font-size:0.75rem; opacity:0.8;">뒹굴거리고 싶음</div>
                </div>
                <div class="choice-card" onclick="selectChoiceCard(this, 'minsuEnergy')" data-val="😤 조금 킹받음">
                    <div style="font-size: 1.6rem;">😤</div>
                    <div style="font-weight:bold; font-size:0.9rem;">조금 킹받음</div>
                    <div style="font-size:0.75rem; opacity:0.8;">맘대로 안 됨</div>
                </div>
            </div>
        </div>

        <!-- 2. 오늘 가장 기억에 남거나 재밌었던 일 -->
        <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <div class="diary-sec-title" style="margin-bottom:0;">
                    <span>🍕 2. 기억에 남거나 재밌었던 일 (일상/친구/놀이)</span>
                </div>
                <button type="button" class="btn-voice" onclick="startDiaryVoiceInput('minsuAccomplishInput', this)">
                    🎙️ 말로 하기
                </button>
            </div>
            <textarea id="minsuAccomplishInput" class="diary-input" rows="3" placeholder="예: 친구들이랑 축구하다가 웃긴 일이 있었음 / 맛있는 떡볶이를 먹음 / 숙제 빨리 끝내고 게임 편하게 함"></textarea>
        </div>

        <!-- 3. 오늘 나에게 던지는 가벼운 한 줄 톡 -->
        <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <div class="diary-sec-title" style="margin-bottom:0;">
                    <span>💬 3. 나에게 던지는 가벼운 한 줄 톡!</span>
                </div>
                <button type="button" class="btn-voice" onclick="startDiaryVoiceInput('minsuGoalInput', this)">
                    🎙️ 말로 하기
                </button>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
                <button type="button" class="quick-tag-btn" onclick="insertQuickTag('minsuGoalInput', '오늘 하루도 수고 많았다! 푹 쉬자!')">💬 오늘 하루 수고 많았다!</button>
                <button type="button" class="quick-tag-btn" onclick="insertQuickTag('minsuGoalInput', '오늘 꽤 알차게 보낸 것 같아 뿌듯함.')">💬 꽤 알차게 보냈음!</button>
                <button type="button" class="quick-tag-btn" onclick="insertQuickTag('minsuGoalInput', '내일은 더 재밌게 놀고 공부도 끝내야지~')">💬 내일 더 재밌게 놀아야지~</button>
                <button type="button" class="quick-tag-btn" onclick="insertQuickTag('minsuGoalInput', '맛있는 거 먹고 푹 자면 기분 풀릴 듯!')">💬 푹 자고 충전하자!</button>
            </div>
            <textarea id="minsuGoalInput" class="diary-input" rows="2" placeholder="직접 적거나 위의 버튼을 눌러보세요! (예: 오늘도 잘 놀고 공부도 잘 버텼다!)"></textarea>
        </div>

        <button class="btn-submit-diary" onclick="submitMinsuDiary('${todayYMD}')">
            <span>${isParentMode ? '🚀 오늘 기록 남기기 (부모 검수)' : '🚀 오늘 기록 남기기! (+5💎)'}</span>
        </button>
    `;
}

// 4. 인터랙티브 컴포넌트 헬퍼
function selectChoiceCard(card, groupName) {
    const parent = card.parentElement;
    parent.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
}

function toggleBalloonTag(tag) {
    tag.classList.toggle('selected');
}

// 4-0. AI 대화록 및 일상 기록 DB 관계형 자동 연동 헬퍼
const AI_LOG_DB_ID = "392a27115b6880dba5eede7ff33a22b9";

async function getOrCreateAiDailyLog(dateStr) {
    const proxyUrl = typeof PROXY_URL !== 'undefined' ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
    const targetDate = dateStr || getKstTodayYMD();

    try {
        // 1. 해당 생성일 레코드 검색
        const qResp = await fetch(`${proxyUrl}/v1/databases/${AI_LOG_DB_ID}/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
            body: JSON.stringify({
                filter: {
                    property: "생성일",
                    date: {
                        equals: targetDate
                    }
                },
                page_size: 1
            })
        });

        if (qResp.ok) {
            const qData = await qResp.json();
            if (qData.results && qData.results.length > 0) {
                console.log(`🔗 [AI 대화록 DB] 당일(${targetDate}) 기존 레코드 발견: ${qData.results[0].id}`);
                return qData.results[0].id;
            }
        }

        // 2. 해당 일자 레코드가 없으면 신규 생성
        console.log(`✨ [AI 대화록 DB] 당일(${targetDate}) 레코드가 없어 자동 생성합니다.`);
        const createResp = await fetch(`${proxyUrl}/v1/pages`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
            body: JSON.stringify({
                parent: { database_id: AI_LOG_DB_ID },
                properties: {
                    "이름": {
                        title: [{ text: { content: `${targetDate} 일상 기록` } }]
                    },
                    "생성일": {
                        date: { start: targetDate }
                    },
                    "카테고리": {
                        multi_select: [{ name: "일상/가족" }]
                    }
                }
            })
        });

        if (createResp.ok) {
            const newPage = await createResp.json();
            console.log(`🎉 [AI 대화록 DB] 신규 당일 카드 자동 생성 성공! Page ID: ${newPage.id}`);
            return newPage.id;
        } else {
            const errText = await createResp.text();
            console.warn("AI 대화록 신규 카드 생성 실패:", errText);
        }
    } catch (e) {
        console.warn("AI 대화록 DB 연동 중 오류:", e);
    }
    return null;
}

// 4-1. 노션 성장 갤러리 & 마음일기 DB 직통 일기 저장 헬퍼 (구분, 주인공, 작가의 한마디 및 AI 대화록 관계형 연동)
async function sendDiaryLogToNotionDirect(entry) {
    const proxyUrl = typeof PROXY_URL !== 'undefined' ? PROXY_URL : (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.WORKER_PROXY_URL ? APP_CONFIG.WORKER_PROXY_URL : "https://minmin-notion.awslike6.workers.dev");
    const dbId = typeof DIARY_DB_ID !== 'undefined' ? DIARY_DB_ID : (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.DIARY_DB_ID ? APP_CONFIG.DIARY_DB_ID : "3dfa27115b688010a85be385f91d64ee");

    const { isParentMode } = getCurrentDiaryTarget();
    const isParentSelf = (entry.childName === '아빠' || entry.childName === '엄마' || entry.isParentSelfDiary);

    let studentName = '부모관리자';
    if (!isParentMode && !isParentSelf) {
        studentName = entry.childName;
    }

    // 신규 DB '구분' 옵션: ['특별한 날', '일기', '종이일기', '마음일기', '작품']
    let categoryName = '일기';
    if (entry.childName === '민서') {
        categoryName = (entry.type === '종이일기') ? '종이일기' : '마음일기';
    } else if (entry.type === '종이일기') {
        categoryName = '종이일기';
    } else {
        categoryName = '일기';
    }

    let titleText = "";
    if (isParentSelf) {
        titleText = `${entry.childName}_${entry.date} (${entry.timeStr || ''})`;
    } else if (isParentMode) {
        titleText = `부모관리자_${entry.date} (${entry.childName} ${categoryName})`;
    } else {
        titleText = `${entry.childName}_${entry.date} (${entry.timeStr || ''})`;
    }

    let weatherAndMood = "";
    let pureContent = "";
    let iMessageText = "";

    if (entry.childName === '민서') {
        const moodList = (entry.moods || []).join(', ');
        weatherAndMood = entry.weather ? (entry.weather + (moodList ? ` [${moodList}]` : '')) : moodList;
        pureContent = entry.content || '';
        iMessageText = entry.iMessage || '';
    } else if (isParentSelf) {
        weatherAndMood = entry.weather || entry.energy || '☕ 평온·차분';
        pureContent = entry.content || '';
        iMessageText = entry.iMessage || entry.goal || '';
    } else {
        weatherAndMood = entry.energy || '😎 꿀잼·대만족';
        pureContent = entry.accomplish || '';
        iMessageText = entry.goal || '';
    }

    if (isParentMode && !isParentSelf) {
        pureContent = `[부모관리자 검수] ` + pureContent;
    }

    // 일기 전문 텍스트 조합 (작가의 한마디/일기본문 용)
    let fullDiaryBody = "";
    if (entry.childName === '민서') {
        if (weatherAndMood) fullDiaryBody += `[날씨/감정: ${weatherAndMood}]\n`;
        fullDiaryBody += pureContent.trim();
        if (iMessageText) fullDiaryBody += `\n\n[나-전달법]: ${iMessageText.trim()}`;
    } else {
        if (weatherAndMood) fullDiaryBody += `[오늘의 기분: ${weatherAndMood}]\n`;
        fullDiaryBody += pureContent.trim();
        if (iMessageText) fullDiaryBody += `\n\n[나에게 한마디]: ${iMessageText.trim()}`;
    }

    // 일기 제목
    const diarySubjectTitle = entry.title || (weatherAndMood ? weatherAndMood.trim() : (entry.childName === '민서' ? '오늘의 마음일기' : '오늘의 일기'));

    // 💡 AI 대화록 및 일상 기록 DB 관계형 자동 연동 ID 조회/생성
    const aiLogPageId = await getOrCreateAiDailyLog(entry.date);

    // 신규 노션 DB 스키마 완벽 매핑
    const payload = {
        parent: { database_id: dbId },
        properties: {
            "식별ID": {
                title: [{ text: { content: titleText } }]
            },
            "구분": {
                select: { name: categoryName }
            },
            "주인공": {
                select: { name: studentName }
            },
            "날짜": {
                date: { start: entry.date || getKstTodayYMD() }
            },
            "제목": {
                rich_text: [{ text: { content: diarySubjectTitle } }]
            },
            "작가의 한마디/일기본문": {
                rich_text: [{ text: { content: fullDiaryBody.trim() || "기록 완료" } }]
            }
        },
        children: [
            {
                object: "block",
                type: "paragraph",
                paragraph: {
                    rich_text: [{ type: "text", text: { content: pureContent.trim() || "기록 내용 없음" } }]
                }
            }
        ]
    };

    if (iMessageText.trim()) {
        payload.children.push({
            object: "block",
            type: "callout",
            callout: {
                icon: { type: "emoji", emoji: entry.childName === '민서' ? "💖" : (isParentSelf ? "☕" : "⭐") },
                rich_text: [{ type: "text", text: { content: `💬 ${entry.childName === '민서' ? '나-전달법' : '오늘의 다짐/한마디'}: ${iMessageText.trim()}` } }]
            }
        });
    }

    // AI 대화록 관계형 속성 주입
    if (aiLogPageId) {
        payload.properties["AI 대화록 및 일상 기록 DB"] = {
            relation: [{ id: aiLogPageId }]
        };
    }

    try {
        const resp = await fetch(`${proxyUrl}/v1/pages`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
            body: JSON.stringify(payload)
        });
        if (resp.ok) {
            const data = await resp.json();
            console.log(`🎉 [노션 직통] 성장 갤러리 & 마음일기 등록 성공! (구분: ${categoryName}, 주인공: ${studentName}, AI연동: ${aiLogPageId ? '성공' : '없음'}) Page ID: ${data.id}`);
            if (entry.id) {
                bindNotionPageIdToEntry(entry.id, data.id);
            }
            return data.id;
        } else {
            const errText = await resp.text();
            console.warn("노션 마음일기 직통 전송 실패:", errText);
        }
    } catch (e) {
        console.warn("노션 마음일기 통신 오류:", e);
    }
    return null;
}

// 4-2. 노션 인벤토리 DB 직통 보상 지급 헬퍼
async function dispenseDiaryRewardDirect(childName, amount = 5) {
    const { isParentMode } = getCurrentDiaryTarget();
    if (isParentMode) {
        console.log(`🛠️ [부모관리자 모드] 부모 프로필이므로 노션 인벤토리 보상 지급을 건너뜁니다.`);
        return false;
    }

    const proxyUrl = typeof PROXY_URL !== 'undefined' ? PROXY_URL : "https://minmin-notion.awslike6.workers.dev";
    const invDbId = typeof INVENTORY_DB_ID !== 'undefined' ? INVENTORY_DB_ID : "374a27115b688042bb61e6a102242e12";

    try {
        // 1. 해당 학생 페이지 쿼리
        const qResp = await fetch(`${proxyUrl}/v1/databases/${invDbId}/query`, {
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
        if (childName === '민서') {
            // 민서는 오직 하리보 젤리만 받음!
            const curHaribo = props["하리보 젤리 개수"]?.number || 0;
            patchProps["하리보 젤리 개수"] = { number: curHaribo + amount };
        } else {
            // 민수는 오직 다이아몬드만 받음!
            const curDia = props["다이아몬드 개수"]?.number || 0;
            patchProps["다이아몬드 개수"] = { number: curDia + amount };
        }

        // 2. 패치 전송
        const pResp = await fetch(`${proxyUrl}/v1/pages/${pageId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
            body: JSON.stringify({ properties: patchProps })
        });

        if (pResp.ok) {
            const rewardName = childName === '민서' ? `하리보 젤리 +${amount}개 🍬` : `다이아몬드 +${amount}개 💎`;
            console.log(`💎 [노션 인벤토리] ${childName}에게 ${rewardName} 지급 성공!`);
            // 화면에 인벤토리 컴포넌트가 있다면 새로고침
            if (typeof fetchInventory === 'function') {
                fetchInventory();
            }
            return true;
        }
    } catch (e) {
        console.warn("노션 인벤토리 보상 직통 지급 오류:", e);
    }
    return false;
}

