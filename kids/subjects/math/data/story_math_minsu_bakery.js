// ========================================================
// 🍰 민수와 민서의 수학 멀티버스 대모험 데이터 모듈 (story_math_minsu_bakery.js)
// 초등 5학년 2학기 수학 2단원 : 분수의 곱셈 (전 단원 완전 정복)
// ========================================================
window.STORY_BOOK = {
  id: "math_minsu_bakery",
  title: "민수와 민서의 수학 멀티버스 대모험 : 분수 마법 베이커리",
  icon: "🍰",
  themeColor: "#d97706",
  themeColorDark: "#b45309",
  backUrl: "math_storybook_library.html",
  backLabel: "🔙 수학 동화 도서관",
  imgBase: "images/minsu/5-2/2/storybook_bakery/",
  version: "20260916_bakery",
  pages: [
    {
      page: 1,
      tag: "🌟 표지 : 분수 마법 베이커리",
      spreadImg: "math_bakery_spread_p1.jpg",
      illImg: "math_bakery_ill_p1.jpg",
      textHtml: `
        <div class="webtoon-passage" style="text-align: center; padding: 12px 0;">
          <h2 style="font-family: 'Jua', sans-serif; font-size: 1.5rem; color: #b45309; margin-bottom: 8px;">민수와 민서의 수학 멀티버스 대모험</h2>
          <p style="color: #d97706; font-size: 1.15rem; font-family: 'Jua', sans-serif; margin-bottom: 6px;">★ 분수 마법 베이커리 ★</p>
          <p style="color: #78716c; font-size: 0.95rem; font-family: 'Jua', sans-serif; margin-bottom: 14px;">글쓴이 : –언제나처럼</p>
          <p style="font-size: 1.05rem; line-height: 1.6; color: #44403c;">
            민수의 책상 위에서 팡! 하고 열린 황금빛 마법 포털!<br>
            <b>민수</b>와 <b>민서</b>가 요정 <b>코코</b>를 도와<br>
            마법에 걸린 <b>'달콤 베이커리'</b>를 구하는 신나는 분수 곱셈 대모험!
          </p>
          <div class="webtoon-dialogue" style="margin-top: 14px; text-align: center;">
            "걱정 마, 코코! 내가 분수 마법으로 해결해 줄게!"
          </div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_p1.mp3"
    },
    {
      page: 2,
      tag: "🍕 1장 : 달콤한 딸기 피자 (진분수 × 자연수)",
      spreadImg: "math_bakery_spread_p2.jpg",
      illImg: "math_bakery_ill_p2.jpg",
      textHtml: `
        <div class="webtoon-passage">
          베이커리에 도착하자 오븐에서 
          <span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span> 크기의 
          딸기 피자 조각들이 튀어나왔어요.<br>
          <div class="webtoon-dialogue">"오빠, <span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span> 조각 2개를 모으면 전체의 얼마큼이 되는 거야?"</div>
          민서가 묻자 민수가 씩씩하게 대답했어요.<br>
          <div class="webtoon-dialogue">"분모 3은 크기니까 그대로 두고, 분자 1과 개수 2를 곱하면 돼! 그럼 <span class="inline-frac"><span>2</span><span class="bar">/</span><span>3</span></span>판이지!"</div>
        </div>
        <div class="math-rule-box">
          <div class="rule-badge">💡 민수의 한 줄 공식</div>
          <div class="rule-title">"분모는 침대에 누워 쉬고, 분자랑 자연수만 곱해요!"</div>
          <div class="rule-formula">
            <span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span> 
            × 2 = 
            <span class="inline-frac"><span>2</span><span class="bar">/</span><span>3</span></span>
          </div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_p2.mp3"
    },
    {
      page: 3,
      tag: "🐸 2장 : 수직선 징검다리 (가분수 탈출!)",
      spreadImg: "math_bakery_spread_p3.jpg",
      illImg: "math_bakery_ill_p3.jpg",
      textHtml: `
        <div class="webtoon-passage">
          다음은 구름 위의 징검다리였어요. 다리를 건너려면 
          <span class="inline-frac"><span>2</span><span class="bar">/</span><span>5</span></span>만큼씩 
          딱 3번 점프해야 했죠.<br>
          <div class="webtoon-dialogue">"자, 깡충깡충 세 번! 분자 2와 3을 곱하니 <span class="inline-frac"><span>6</span><span class="bar">/</span><span>5</span></span>이네?"</div>
          민수가 수직선 위를 날아오르며 외쳤어요.<br>
          <div class="webtoon-dialogue">"분자가 더 큰 가분수는 무거우니까, 온전한 1을 밖으로 꺼내서 대분수 1<span class="inline-frac"><span>1</span><span class="bar">/</span><span>5</span></span>로 바꾸자!"</div>
        </div>
        <div class="math-rule-box">
          <div class="rule-badge">💡 민수의 한 줄 공식</div>
          <div class="rule-title">"무거운 가분수는 온전한 1을 쏙 뽑아 대분수로 변신!"</div>
          <div class="rule-formula">
            <span class="inline-frac"><span>2</span><span class="bar">/</span><span>5</span></span> 
            × 3 = 
            <span class="inline-frac"><span>6</span><span class="bar">/</span><span>5</span></span> 
            = 1<span class="inline-frac"><span>1</span><span class="bar">/</span><span>5</span></span>
          </div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_p3.mp3"
    },
    {
      page: 4,
      tag: "🧪 3장 : 물약 항아리와 가분수 투구 (대분수 × 자연수)",
      spreadImg: "math_bakery_spread_p4.jpg",
      illImg: "math_bakery_ill_p4.jpg",
      textHtml: `
        <div class="webtoon-passage">
          마법 항아리에 물약을 1<span class="inline-frac"><span>2</span><span class="bar">/</span><span>3</span></span>병씩 2번 채워야 하는 미션이 나타났어요.<br>
          <div class="webtoon-dialogue">"오빠, 대분수는 너무 뚱뚱해서 계산하기 복잡해 보여."</div>
          민서가 걱정스럽게 말하자 민수가 웃으며 대답했어요.<br>
          <div class="webtoon-dialogue">"걱정 마! 대분수에게 가분수 투구를 씌워 <span class="inline-frac"><span>5</span><span class="bar">/</span><span>3</span></span>로 바꾸면 계산이 훨씬 쉬워진단다!"</div>
        </div>
        <div class="math-rule-box">
          <div class="rule-badge">💡 민수의 한 줄 공식</div>
          <div class="rule-title">"대분수는 날씬한 가분수로 싹 바꾸고 곱하면 끝!"</div>
          <div class="rule-formula">
            1<span class="inline-frac"><span>2</span><span class="bar">/</span><span>3</span></span> × 2 
            = <span class="inline-frac"><span>5</span><span class="bar">/</span><span>3</span></span> × 2 
            = <span class="inline-frac"><span>10</span><span class="bar">/</span><span>3</span></span> 
            = 3<span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span>
          </div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_p4.mp3"
    },
    {
      page: 5,
      tag: "🧶 4장 : 요술 무지개 털실 (자연수 × 진분수)",
      spreadImg: "math_bakery_spread_p5.jpg",
      illImg: "math_bakery_ill_p5.jpg",
      textHtml: `
        <div class="webtoon-passage">
          이번엔 시계 공방에 걸린 6미터짜리 요술 무지개 털실을 잘라야 했어요.<br>
          <div class="webtoon-dialogue">"민서야, 이 털실의 <span class="inline-frac"><span>2</span><span class="bar">/</span><span>3</span></span>만큼만 잘라줄래?"</div>
          코코가 가위를 건네자 민서가 씩씩하게 잘라냈어요.<br>
          <div class="webtoon-dialogue">"6미터를 3도막으로 나눈 것 중 2도막이니까... 정답은 4미터야!"</div>
        </div>
        <div class="math-rule-box">
          <div class="rule-badge">💡 민수의 한 줄 공식</div>
          <div class="rule-title">"'전체의 몇 분의 몇'은 분모로 나누고 분자만큼 곱하기!"</div>
          <div class="rule-formula">
            6 × <span class="inline-frac"><span>2</span><span class="bar">/</span><span>3</span></span> 
            = 4 (미터)
          </div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_p5.mp3"
    },
    {
      page: 6,
      tag: "🗿 5장 : 점토 거인의 주문 (자연수 × 대분수)",
      spreadImg: "math_bakery_spread_p6.jpg",
      illImg: "math_bakery_ill_p6.jpg",
      textHtml: `
        <div class="webtoon-passage">
          거대한 점토 거인이 나타나 3킬로그램 찰흙의 1<span class="inline-frac"><span>3</span><span class="bar">/</span><span>4</span></span>배를 만들어 달라고 주문했어요.<br>
          <div class="webtoon-dialogue">"거인 아저씨, 잠시만요! 1<span class="inline-frac"><span>3</span><span class="bar">/</span><span>4</span></span>을 가분수 <span class="inline-frac"><span>7</span><span class="bar">/</span><span>4</span></span>로 바꾸면... <span class="inline-frac"><span>21</span><span class="bar">/</span><span>4</span></span> 킬로그램이네요!"</div>
          민수가 계산을 마치자 찰흙이 뭉쳐져 5<span class="inline-frac"><span>1</span><span class="bar">/</span><span>4</span></span> 킬로그램의 멋진 조각상이 되었어요.
        </div>
        <div class="math-rule-box">
          <div class="rule-badge">💡 민수의 한 줄 공식</div>
          <div class="rule-title">"자연수 곱하기 대분수도 가분수로 바꾸어 분자끼리 곱해요!"</div>
          <div class="rule-formula">
            3 × 1<span class="inline-frac"><span>3</span><span class="bar">/</span><span>4</span></span> 
            = 3 × <span class="inline-frac"><span>7</span><span class="bar">/</span><span>4</span></span> 
            = 5<span class="inline-frac"><span>1</span><span class="bar">/</span><span>4</span></span> (kg)
          </div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_p6.mp3"
    },
    {
      page: 7,
      tag: "💎 6장 : 차원의 크리스털 창문 (단위분수 × 단위분수)",
      spreadImg: "math_bakery_spread_p7.jpg",
      illImg: "math_bakery_ill_p7.jpg",
      textHtml: `
        <div class="webtoon-passage">
          굳게 닫힌 크리스털 창문을 열려면 
          <span class="inline-frac"><span>1</span><span class="bar">/</span><span>2</span></span>의 
          <span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span>만큼 색을 칠해야 했어요.<br>
          <div class="webtoon-dialogue">"가로로 반을 자르고 세로로 3도막을 내면... 창문이 모두 6칸으로 나뉘어, 오빠!"</div>
          민수와 민서가 손을 맞대자 겹쳐진 1칸이 영롱한 에메랄드빛으로 빛나며 문이 열렸어요.
        </div>
        <div class="math-rule-box">
          <div class="rule-badge">💡 민수의 한 줄 공식</div>
          <div class="rule-title">"분모끼리 슝! 분자끼리 착! 조각의 조각을 구해요!"</div>
          <div class="rule-formula">
            <span class="inline-frac"><span>1</span><span class="bar">/</span><span>2</span></span> 
            × 
            <span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span> 
            = 
            <span class="inline-frac"><span>1</span><span class="bar">/</span><span>6</span></span>
          </div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_p7.mp3"
    },
    {
      page: 8,
      tag: "✂️ 7장 : 마법 가위와 대각선 약분술 (진분수 × 진분수)",
      spreadImg: "math_bakery_spread_p8.jpg",
      illImg: "math_bakery_ill_p8.jpg",
      textHtml: `
        <div class="webtoon-passage">
          길을 막은 숫자 넝쿨에 어려운 곱셈 암호가 나타나자 민수가 마법 가위를 들었어요.<br>
          <div class="webtoon-dialogue">"숫자가 너무 커서 계산하기 힘들 땐, 대각선에 있는 숫자끼리 미리 약분을 하는 거야!"</div>
          민수가 4와 2를 싹둑 자르자, 복잡했던 분수가 순식간에 간단한 
          <span class="inline-frac"><span>3</span><span class="bar">/</span><span>14</span></span>으로 변했어요.
        </div>
        <div class="math-rule-box">
          <div class="rule-badge">💡 민수의 한 줄 공식</div>
          <div class="rule-title">"곱하기 전에 대각선 친구를 똑같은 수로 미리 싹둑!"</div>
          <div class="rule-formula">
            <span class="inline-frac"><span>3</span><span class="bar">/</span><span>4</span></span> 
            × 
            <span class="inline-frac"><span>2</span><span class="bar">/</span><span>7</span></span> 
            = 
            <span class="inline-frac"><span>3</span><span class="bar">/</span><span>14</span></span>
          </div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_p8.mp3"
    },
    {
      page: 9,
      tag: "📜 8장 : 황금 융단 마법진의 암호 (대분수 × 대분수)",
      spreadImg: "math_bakery_spread_p9.jpg",
      illImg: "math_bakery_ill_p9.jpg",
      textHtml: `
        <div class="webtoon-passage">
          마지막 보스 방 바닥에는 거대한 황금 융단 마법진이 펼쳐져 있었어요.<br>
          <div class="webtoon-dialogue">"가로 2<span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span>, 세로 1<span class="inline-frac"><span>1</span><span class="bar">/</span><span>5</span></span>! 둘 다 가분수로 바꾸고 약분까지 하면 정답은?"</div>
          <div class="webtoon-dialogue">"2<span class="inline-frac"><span>4</span><span class="bar">/</span><span>5</span></span>!" 민수와 민서가 외치자 황금 융단이 하늘로 떠올랐어요.</div>
        </div>
        <div class="math-rule-box">
          <div class="rule-badge">💡 민수의 한 줄 공식</div>
          <div class="rule-title">"대분수 곱셈은 둘 다 가분수로! 미리 약분하면 보스 격파!"</div>
          <div class="rule-formula">
            2<span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span> 
            × 1<span class="inline-frac"><span>1</span><span class="bar">/</span><span>5</span></span> 
            = 2<span class="inline-frac"><span>4</span><span class="bar">/</span><span>5</span></span>
          </div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_p9.mp3"
    },
    {
      page: 10,
      tag: "🏅 9장 : 분수의 달인 황금 메달",
      spreadImg: "math_bakery_spread_p10.jpg",
      illImg: "math_bakery_ill_p10.jpg",
      textHtml: `
        <div class="webtoon-passage">
          모든 미션을 성공하자 코코가 민수에게 반짝이는 '분수 마스터' 메달을 걸어주었어요.<br>
          <div class="webtoon-dialogue">"축하해! 너희 덕분에 베이커리가 다시 달콤한 냄새로 가득해졌어!"</div>
          민수는 활짝 웃으며 생각했어요.<br>
          <div class="webtoon-dialogue">'분수의 곱셈, 원리만 알면 정말 쉽고 재미있어!'</div>
        </div>
        <div class="math-rule-box">
          <div class="rule-badge">💡 마스터의 마지막 비밀</div>
          <div class="rule-title">"1보다 큰 수를 곱하면 쑥쑥 커지고, 작은 분수를 곱하면 알맞게 작아져요!"</div>
          <div class="rule-formula" style="font-size: 1.25rem; color: #b45309;">
            🌟 분수 곱셈 마스터 완벽 달성! 🌟
          </div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_p10.mp3"
    },
    {
      page: 11,
      tag: "🎉 에필로그 : 달콤 베이커리의 축하 파티",
      spreadImg: "math_bakery_spread_p11.jpg",
      illImg: "math_bakery_ill_p11.jpg",
      textHtml: `
        <div class="webtoon-passage" style="text-align: center;">
          달콤한 냄새가 솔솔 풍기는 베이커리에서 신나는 축하 파티가 열렸어요!<br>
          요정들이 구워준 딸기 컵케이크를 먹으며 민서가 방긋 웃었어요.<br>
          <div class="webtoon-dialogue" style="text-align: center;">"오빠, 다음 수학 모험도 같이 가자!"</div>
          두 남매는 기분 좋은 발걸음으로 따뜻한 공부방으로 돌아왔답니다.
        </div>
        <div class="math-rule-box" style="text-align: center; border-color: #059669; background: #ecfdf5;">
          <div class="rule-badge" style="background: #059669;">🎉 완독 보상 지급 완료</div>
          <div class="rule-title" style="color: #065f46;">수학 경험치 +10 EXP & 보석 +3 💎 획득!</div>
          <div class="rule-formula" style="font-size: 1.15rem; color: #047857;">
            민수·민서의 다음 수학 모험을 기대해 주세요!
          </div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_p11.mp3"
    }
  ]
};
