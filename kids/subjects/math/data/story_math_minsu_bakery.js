// ========================================================
// 🍰 민수와 민서의 수학 멀티버스 대모험 데이터 모듈 (story_math_minsu_bakery.js)
// 초등 5학년 2학기 수학 2단원 : 분수의 곱셈 (전 단원 완전 정복)
// 11개 페이지 1:1 정렬 (Page 1: 표지, Page 2: 포털, Page 3: 피자 ~ Page 11: 축하파티)
// ========================================================
window.STORY_BOOK = {
  id: "math_minsu_bakery",
  title: "민수와 민서의 수학 멀티버스 대모험 : 분수 마법 베이커리",
  icon: "🍰",
  themeColor: "#d97706",
  themeColorDark: "#b45309",
  backUrl: "math_storybook_library.html",
  backLabel: "🔙 수학 동화 도서관",
  imgBase: "https://raw.githubusercontent.com/awslike6-web/kids-archive/main/assets/storybook/math/minsu/5-2/2/",
  version: "20260916_bakery_v2",
  pages: [
    {
      page: 1,
      tag: "🌟 표지 : 분수 마법 베이커리",
      spreadImg: "math_bakery_spread_p1.jpg",
      illImg: "math_bakery_ill_p1.jpg",
      textHtml: `
        <div class="webtoon-passage" style="text-align: center; padding: 14px 0;">
          <h2 style="font-family: 'Jua', sans-serif; font-size: 1.55rem; color: #b45309; margin-bottom: 8px;">민수와 민서의 수학 멀티버스 대모험</h2>
          <p style="color: #d97706; font-size: 1.2rem; font-family: 'Jua', sans-serif; margin-bottom: 6px;">★ 분수 마법 베이커리 ★</p>
          <p style="color: #78716c; font-size: 0.95rem; font-family: 'Jua', sans-serif; margin-bottom: 16px;">초등 5-2 수학 2단원 : 분수의 곱셈</p>
          <p style="font-size: 1.05rem; line-height: 1.65; color: #44403c;">
            책상 위에서 열린 황금빛 마법 포털!<br>
            민수와 요정 코코가 함께 떠나는<br>
            차원의 <b>'달콤 베이커리'</b> 구출 작전!<br><br>
            신나는 분수의 곱셈 마법으로<br>
            베이커리의 모든 문제를 해결해 보자!
          </p>
        </div>
        <div class="math-rule-box" style="text-align: center;">
          <div class="rule-badge">📖 모험 안내</div>
          <div class="rule-title">책장을 넘겨 흥미진진한 분수 마법을 시작하세요!</div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_01.mp3"
    },
    {
      page: 2,
      tag: "🌀 1장 : 포털과 코코의 부름 (프롤로그)",
      spreadImg: "math_bakery_spread_p2.jpg",
      illImg: "math_bakery_ill_p2.jpg",
      textHtml: `
        <div class="webtoon-passage">
          민수의 책상 위에서 팡! 하고 황금빛 포털이 열리더니 요정 코코가 날아왔어요.<br>
          <div class="webtoon-dialogue">"민수야, 큰일이야! 차원의 달콤 베이커리가 마법에 걸려 엉망이 됐어!"</div>
          민수는 씩씩하게 대답했어요.<br>
          <div class="webtoon-dialogue">"걱정 마, 코코! 내가 분수 마법으로 해결해 줄게!"</div>
        </div>
        <div class="math-rule-box">
          <div class="rule-badge">💡 민수의 한 줄 공식</div>
          <div class="rule-title">"똑같이 나눈 조각들을 모으면, 신나는 분수 모험 시작!"</div>
          <div class="rule-formula" style="font-size: 1.15rem; color: #b45309; text-align: center;">
            🌟 차원의 달콤 베이커리로 출발! 🌟
          </div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_02.mp3"
    },
    {
      page: 3,
      tag: "🍕 2장 : 달콤한 딸기 피자 (진분수 × 자연수)",
      spreadImg: "math_bakery_spread_p3.jpg",
      illImg: "math_bakery_ill_p3.jpg",
      textHtml: `
        <div class="webtoon-passage">
          베이커리에 도착하자 다람쥐 손님들이 외쳤어요.<br>
          <div class="webtoon-dialogue">"3분의 1조각짜리 딸기 피자 2판을 주세요!"</div>
          민수는 머리를 긁적였어요.<br>
          <div class="webtoon-dialogue">"어라? <span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span> 조각이 2개면 전부 얼마지?"</div>
          코코가 반짝이는 분수 지팡이를 건네며 말했어요.<br>
          <div class="webtoon-dialogue">"민수야, 자연수는 분자에만 곱하는 거야!"</div>
          민수가 지팡이를 휘두르자 딸기 조각들이 날아올라 착착 붙었어요.<br>
          <div class="webtoon-dialogue">"<span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span> 곱하기 2는 <span class="inline-frac"><span>2</span><span class="bar">/</span><span>3</span></span>! 맛있는 피자 완성!"</div>
        </div>
        <div class="math-rule-box">
          <div class="rule-badge">💡 민수의 한 줄 공식</div>
          <div class="rule-title">"분모는 침대에 누워 쉬고, 분자랑 자연수만 곱해요!"</div>
          <div class="rule-formula">
            <span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span> 
            × 2 = 
            <span class="inline-frac"><span>1 × 2</span><span class="bar">/</span><span>3</span></span>
            = <span class="inline-frac"><span>2</span><span class="bar">/</span><span>3</span></span>
          </div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_03.mp3"
    },
    {
      page: 4,
      tag: "🐸 3장 : 수직선 징검다리 (가분수 탈출!)",
      spreadImg: "math_bakery_spread_p4.jpg",
      illImg: "math_bakery_ill_p4.jpg",
      textHtml: `
        <div class="webtoon-passage">
          강을 건너려는데 다리가 끊어져 있었어요. 강물 위에는 <span class="inline-frac"><span>2</span><span class="bar">/</span><span>5</span></span> 크기의 마법 징검다리가 동동 떠 있었지요.<br>
          <div class="webtoon-dialogue">"민수야, 저 징검다리를 세 번 연속으로 점프해야 해!"</div>
          민수는 점프를 준비하며 계산했어요.<br>
          <div class="webtoon-dialogue">"<span class="inline-frac"><span>2</span><span class="bar">/</span><span>5</span></span> 곱하기 3은 분자에 3을 곱하니까 <span class="inline-frac"><span>6</span><span class="bar">/</span><span>5</span></span>!"</div>
          <div class="webtoon-dialogue">"<span class="inline-frac"><span>6</span><span class="bar">/</span><span>5</span></span>은 가분수니까 대분수로 바꾸면 1<span class="inline-frac"><span>1</span><span class="bar">/</span><span>5</span></span>이야!"</div>
          민수가 폴짝폴짝폴짝 뛰자 발밑에서 무지개다리가 번쩍 뻗어 나왔어요.
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
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_04.mp3"
    },
    {
      page: 5,
      tag: "🧪 4장 : 물약 항아리와 가분수 투구 (대분수 × 자연수)",
      spreadImg: "math_bakery_spread_p5.jpg",
      illImg: "math_bakery_ill_p5.jpg",
      textHtml: `
        <div class="webtoon-passage">
          주방 문 앞을 거대한 마법 솥이 막고 있었어요. 솥에는 '1<span class="inline-frac"><span>2</span><span class="bar">/</span><span>3</span></span> 리터 마법 물약 2병을 채우시오'라고 적혀 있었지요.<br>
          <div class="webtoon-dialogue">"대분수는 계산하기 복잡한데..."</div>
          민수가 망설이자 코코가 속삭였어요.<br>
          <div class="webtoon-dialogue">"가분수 변신 투구를 써봐! 1<span class="inline-frac"><span>2</span><span class="bar">/</span><span>3</span></span>는 <span class="inline-frac"><span>5</span><span class="bar">/</span><span>3</span></span>로 변신할 수 있어!"</div>
          민수는 투구를 쓰고 힘차게 외쳤어요.<br>
          <div class="webtoon-dialogue">"<span class="inline-frac"><span>5</span><span class="bar">/</span><span>3</span></span> 곱하기 2는 <span class="inline-frac"><span>10</span><span class="bar">/</span><span>3</span></span>! 대분수로 바꾸면 3<span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span> 리터!"</div>
          솥에서 보글보글 황금 거품이 일며 주방 문이 활짝 열렸어요.
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
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_05.mp3"
    },
    {
      page: 6,
      tag: "🧶 5장 : 요술 무지개 털실 (자연수 × 진분수)",
      spreadImg: "math_bakery_spread_p6.jpg",
      illImg: "math_bakery_ill_p6.jpg",
      textHtml: `
        <div class="webtoon-passage">
          선물 상자를 묶어야 하는데 마법 리본 털실이 엉켜 있었어요.<br>
          <div class="webtoon-dialogue">"길이가 6미터인 무지개 털실의 <span class="inline-frac"><span>2</span><span class="bar">/</span><span>3</span></span>만큼 잘라야 해!"</div>
          코코가 자를 들고 허둥대자 민수는 침착하게 생각했어요.<br>
          <div class="webtoon-dialogue">"6의 <span class="inline-frac"><span>2</span><span class="bar">/</span><span>3</span></span>는 6 곱하기 <span class="inline-frac"><span>2</span><span class="bar">/</span><span>3</span></span>야!"</div>
          <div class="webtoon-dialogue">"자연수 6과 분모 3을 약분하면 2가 남고, 2 곱하기 2는 4!"</div>
          민수가 가위로 4미터를 싹둑 자르자, 리본이 스스로 날아가 상자를 예쁘게 묶었어요.
        </div>
        <div class="math-rule-box">
          <div class="rule-badge">💡 민수의 한 줄 공식</div>
          <div class="rule-title">"'전체의 몇 분의 몇'은 분모로 나누고 분자만큼 곱하기!"</div>
          <div class="rule-formula">
            6 × <span class="inline-frac"><span>2</span><span class="bar">/</span><span>3</span></span> 
            = <span class="inline-frac"><span>2 × 2</span><span class="bar">/</span><span>1</span></span>
            = 4 (미터)
          </div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_06.mp3"
    },
    {
      page: 7,
      tag: "🗿 6장 : 점토 거인의 주문 (자연수 × 대분수)",
      spreadImg: "math_bakery_spread_p7.jpg",
      illImg: "math_bakery_ill_p7.jpg",
      textHtml: `
        <div class="webtoon-passage">
          쿠키 오븐 앞에는 거대한 점토 거인이 팔짱을 끼고 서 있었어요.<br>
          <div class="webtoon-dialogue">"내 특제 쿠키를 구우려면 마법 반죽 1<span class="inline-frac"><span>3</span><span class="bar">/</span><span>4</span></span> 덩어리가 3개 필요하다 쿵!"</div>
          민수는 공식을 떠올렸어요.<br>
          <div class="webtoon-dialogue">"1<span class="inline-frac"><span>3</span><span class="bar">/</span><span>4</span></span>은 가분수 <span class="inline-frac"><span>7</span><span class="bar">/</span><span>4</span></span>! 3 곱하기 <span class="inline-frac"><span>7</span><span class="bar">/</span><span>4</span></span>은 <span class="inline-frac"><span>21</span><span class="bar">/</span><span>4</span></span>이니까 5<span class="inline-frac"><span>1</span><span class="bar">/</span><span>4</span></span> 덩어리예요!"</div>
          점토 거인이 박수를 치며 함박웃음을 지었어요.<br>
          <div class="webtoon-dialogue">"정답이다 쿵! 오븐아, 맛있게 구워져라!"</div>
        </div>
        <div class="math-rule-box">
          <div class="rule-badge">💡 민수의 한 줄 공식</div>
          <div class="rule-title">"자연수 곱하기 대분수도 가분수로 바꾸어 분자끼리 곱해요!"</div>
          <div class="rule-formula">
            3 × 1<span class="inline-frac"><span>3</span><span class="bar">/</span><span>4</span></span> 
            = 3 × <span class="inline-frac"><span>7</span><span class="bar">/</span><span>4</span></span> 
            = <span class="inline-frac"><span>21</span><span class="bar">/</span><span>4</span></span> 
            = 5<span class="inline-frac"><span>1</span><span class="bar">/</span><span>4</span></span>
          </div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_07.mp3"
    },
    {
      page: 8,
      tag: "💎 7장 : 차원의 크리스털 창문 (단위분수 × 단위분수)",
      spreadImg: "math_bakery_spread_p8.jpg",
      illImg: "math_bakery_ill_p8.jpg",
      textHtml: `
        <div class="webtoon-passage">
          빛을 잃은 어두운 홀에 도착했어요. 천장에는 마법 빛을 통과시키는 크리스털 창문이 있었어요.<br>
          <div class="webtoon-dialogue">"가로 <span class="inline-frac"><span>1</span><span class="bar">/</span><span>2</span></span>, 세로 <span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span> 크기의 빛 조각을 겹쳐야 어둠이 걷혀!"</div>
          민수는 두 손으로 투명한 빛의 유리를 포갰어요.<br>
          <div class="webtoon-dialogue">"분수 곱하기 분수는 분모는 분모끼리! 분자는 분자끼리!"</div>
          <div class="webtoon-dialogue">"2 곱하기 3은 6, 1 곱하기 1은 1! 답은 <span class="inline-frac"><span>1</span><span class="bar">/</span><span>6</span></span>이야!"</div>
          창문에서 눈부신 여섯 빛깔 무지개 햇살이 쏟아져 내렸어요.
        </div>
        <div class="math-rule-box">
          <div class="rule-badge">💡 민수의 한 줄 공식</div>
          <div class="rule-title">"분모끼리 슝! 분자끼리 착! 조각의 조각을 구해요!"</div>
          <div class="rule-formula">
            <span class="inline-frac"><span>1</span><span class="bar">/</span><span>2</span></span> 
            × 
            <span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span> 
            = 
            <span class="inline-frac"><span>1 × 1</span><span class="bar">/</span><span>2 × 3</span></span>
            = 
            <span class="inline-frac"><span>1</span><span class="bar">/</span><span>6</span></span>
          </div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_08.mp3"
    },
    {
      page: 9,
      tag: "✂️ 8장 : 마법 가위와 번개 약분술 (진분수 × 진분수)",
      spreadImg: "math_bakery_spread_p9.jpg",
      illImg: "math_bakery_ill_p9.jpg",
      textHtml: `
        <div class="webtoon-passage">
          갑자기 숫자들이 거대해지며 길을 막았어요.<br>
          <div class="webtoon-dialogue">"<span class="inline-frac"><span>3</span><span class="bar">/</span><span>4</span></span> 곱하기 <span class="inline-frac"><span>2</span><span class="bar">/</span><span>7</span></span>를 계산하지 못하면 지나갈 수 없다!"</div>
          숫자들이 너무 커 보였지만 민수의 눈이 반짝였어요.<br>
          <div class="webtoon-dialogue">"계산하기 전에 대각선끼리 먼저 나누는 거야! 번개 약분술!"</div>
          민수가 마법 가위를 부딪히자 분모 4와 분자 2가 2로 약분되었어요.<br>
          <div class="webtoon-dialogue">"분모는 2×7=14! 분자는 3×1=3! 정답은 <span class="inline-frac"><span>3</span><span class="bar">/</span><span>14</span></span>!"</div>
          거대했던 숫자 문이 사르르 녹아내렸어요.
        </div>
        <div class="math-rule-box">
          <div class="rule-badge">💡 민수의 한 줄 공식</div>
          <div class="rule-title">"곱하기 전에 대각선 친구를 똑같은 수로 미리 싹둑!"</div>
          <div class="rule-formula">
            <span class="inline-frac"><span>3</span><span class="bar">/</span><span>4</span></span> 
            × 
            <span class="inline-frac"><span>2</span><span class="bar">/</span><span>7</span></span> 
            = 
            <span class="inline-frac"><span>3 × 1</span><span class="bar">/</span><span>2 × 7</span></span> 
            = 
            <span class="inline-frac"><span>3</span><span class="bar">/</span><span>14</span></span>
          </div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_09.mp3"
    },
    {
      page: 10,
      tag: "📜 9장 : 황금 융단 마법진 (대분수 × 대분수)",
      spreadImg: "math_bakery_spread_p10.jpg",
      illImg: "math_bakery_ill_p10.jpg",
      textHtml: `
        <div class="webtoon-passage">
          마지막 관문인 마법 케이크 탑 꼭대기에는 거대한 황금 융단이 펼쳐져 있었어요.<br>
          <div class="webtoon-dialogue">"가로 2<span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span>미터, 세로 1<span class="inline-frac"><span>1</span><span class="bar">/</span><span>5</span></span>미터인 융단의 넓이를 구해야 해!"</div>
          민수는 마지막 집중력을 발휘했어요.<br>
          <div class="webtoon-dialogue">"대분수끼리의 곱셈도 둘 다 가분수로 바꾸면 끝! <span class="inline-frac"><span>7</span><span class="bar">/</span><span>3</span></span> 곱하기 <span class="inline-frac"><span>6</span><span class="bar">/</span><span>5</span></span>!"</div>
          <div class="webtoon-dialogue">"분모 3과 분자 6을 3으로 약분하면 분모는 5, 분자는 14! 정답은 2<span class="inline-frac"><span>4</span><span class="bar">/</span><span>5</span></span> 제곱미터!"</div>
          눈부신 황금빛이 온 방을 가득 채웠어요.
        </div>
        <div class="math-rule-box">
          <div class="rule-badge">💡 민수의 한 줄 공식</div>
          <div class="rule-title">"대분수 곱셈은 둘 다 가분수로! 미리 약분하면 보스 격파!"</div>
          <div class="rule-formula">
            2<span class="inline-frac"><span>1</span><span class="bar">/</span><span>3</span></span> 
            × 1<span class="inline-frac"><span>1</span><span class="bar">/</span><span>5</span></span> 
            = <span class="inline-frac"><span>7</span><span class="bar">/</span><span>3</span></span> × <span class="inline-frac"><span>6</span><span class="bar">/</span><span>5</span></span>
            = <span class="inline-frac"><span>14</span><span class="bar">/</span><span>5</span></span>
            = 2<span class="inline-frac"><span>4</span><span class="bar">/</span><span>5</span></span> (㎡)
          </div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_10.mp3"
    },
    {
      page: 11,
      tag: "🏅 10장 : 분수 마스터 메달 & 축하 파티",
      spreadImg: "math_bakery_spread_p11.jpg",
      illImg: "math_bakery_ill_p11.jpg",
      textHtml: `
        <div class="webtoon-passage">
          쿠구구궁! 베이커리의 모든 마법 장치가 정상으로 돌아왔어요.<br>
          달콤한 빵 냄새가 가득 퍼지고, 요정들과 동물 손님들이 환호성을 질렀어요.<br>
          <div class="webtoon-dialogue">"와아! 민수가 베이커리를 구했다!"</div>
          코코가 민수의 목에 반짝이는 '분수 마스터 황금 메달'을 걸어주었어요.<br>
          민수는 활짝 웃으며 말했어요.<br>
          <div class="webtoon-dialogue">"분수의 곱셈, 원리만 알면 정말 쉽고 재미있어!"</div>
          민수와 코코는 달콤한 딸기 생크림 케이크를 나누어 먹었답니다.
        </div>
        <div class="math-rule-box" style="border-color: #059669; background: #ecfdf5;">
          <div class="rule-badge" style="background: #059669;">🎉 분수 곱셈 마스터 달성</div>
          <div class="rule-title" style="color: #065f46;">자연수는 분자에만! 분수는 분모끼리 분자끼리! 약분은 미리미리!</div>
          <div class="rule-formula" style="font-size: 1.15rem; color: #047857; text-align: center;">
            수학 경험치 +10 EXP & 보석 +3 💎 획득!
          </div>
        </div>
      `,
      audio: "../../assets/audio/storybook/math_minsu_bakery/math_bakery_11.mp3"
    }
  ]
};
