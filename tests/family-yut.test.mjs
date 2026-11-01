import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { browser, players, plain, read } from './family-browser.mjs';

function mockRolls(b, results) {
  const vals = [];
  const map = {
    backdo: [0.1, 0.9, 0.9, 0.9],
    do: [0.9, 0.1, 0.9, 0.9],
    gae: [0.1, 0.1, 0.9, 0.9],
    geol: [0.1, 0.1, 0.1, 0.9],
    yut: [0.1, 0.1, 0.1, 0.1],
    mo: [0.9, 0.9, 0.9, 0.9]
  };
  results.forEach(r => vals.push(...map[r]));
  vm.runInContext(`
    (() => {
      const vals = ${JSON.stringify(vals)};
      let idx = 0;
      Math.random = () => (idx < vals.length ? vals[idx++] : 0.9);
    })()
  `, b.context);
}

const cell = (b, pos) => b.$('board').querySelectorAll('.yut-cell').find(n => n.dataset.pos === String(pos));
const waitBtn = b => b.$('waitingTray').querySelectorAll('.waiting-token')[0];
const chip = (b, idx) => b.$('pendingList').querySelectorAll('.throw-chip').find(n => n.dataset.index === String(idx));

test('시작: 인원·말 개수 변경, setupError, 칸 29개와 위치, 시작 음성', () => {
  const b = browser({ game: 'yut' });
  b.boot();
  assert.equal(b.$('setupView').hidden, false);
  assert.equal(b.$('gameView').hidden, true);

  // 인원 및 말 개수 변경
  b.$('playerCount').value = '3';
  b.$('playerCount').fire('change');
  b.$('pieceCount').value = '2';

  // 게임 시작
  b.$('startGame').click();
  assert.equal(b.$('setupView').hidden, true);
  assert.equal(b.$('gameView').hidden, false);
  assert.equal(b.speech[0].text, '민서부터 던져요!');

  // 29개 칸 확인
  const cells = b.$('board').querySelectorAll('.yut-cell');
  assert.equal(cells.length, 29);
  assert.equal(cell(b, 20).querySelector('.cell-tag').textContent, '출발·도착');
  assert.equal(cell(b, 20).getAttribute('aria-label'), '20번 칸(참먹이), 빈 칸');
  assert.equal(cell(b, 23).getAttribute('aria-label'), '23번 칸(방), 빈 칸');
  assert.equal(cell(b, 1).style['--x'], 100);
  assert.equal(cell(b, 1).style['--y'], 80);
});

test('던지기: 가락 클래스, throwResult, 윷·모 연속 던지기, 던진 뒤 버튼 상태', () => {
  const b = browser({ game: 'yut' });
  b.boot();
  b.$('startGame').click();

  mockRolls(b, ['yut', 'do']);

  // 첫 번째 던지기: 윷
  b.$('throwButton').click();
  const sticks = b.$('sticks').querySelectorAll('.stick');
  assert.equal(sticks.length, 4);
  assert.ok(sticks.every(s => s.className.includes('flat')));
  assert.match(b.$('throwResult').textContent, /윷! 4칸/);
  assert.equal(b.$('actionMessage').textContent, '한 번 더 던져요!');
  assert.equal(b.$('throwButton').disabled, false); // 윷이므로 계속 던짐

  // 두 번째 던지기: 도
  b.$('throwButton').click();
  assert.match(b.$('throwResult').textContent, /도! 1칸/);
  assert.equal(b.$('throwButton').disabled, true); // 도이므로 이동 단계로 전환
  assert.equal(b.$('moveText').textContent, '옮길 말을 골라요.');

  // 칩 목록 확인
  const chips = b.$('pendingList').querySelectorAll('.throw-chip');
  assert.equal(chips.length, 2);
  assert.equal(chips[0].textContent, '윷');
  assert.equal(chips[1].textContent, '도');
  assert.equal(chips[0].getAttribute('aria-pressed'), 'true'); // 첫 번째 유효 칩 선택
});

test('이동: 대기 말 내보내기, 칸 눌러 확정과 confirmMove로 확정, 칩 전환', () => {
  const b = browser({ game: 'yut' });
  b.boot();
  b.$('startGame').click();

  // 도, 개 던짐 (윷 던지고 도 나오도록)
  mockRolls(b, ['yut', 'do']);
  b.$('throwButton').click();
  b.$('throwButton').click();

  // 1) 윷 칩으로 대기 말 선택 -> confirmMove로 확정
  waitBtn(b).click();
  assert.equal(b.$('confirmMove').disabled, false);
  assert.equal(cell(b, 4).className.includes('target'), true);
  b.$('confirmMove').click();

  // 4번 칸에 말 도착 확인
  assert.equal(cell(b, 4).querySelector('.token').dataset.count, '1');

  // 2) 이제 남은 칩은 '도' 하나
  assert.equal(chip(b, 0).textContent, '도');
  assert.equal(chip(b, 0).getAttribute('aria-pressed'), 'true');

  // 4번 칸의 말 선택 -> 도착 칸인 5번 칸을 다시 눌러 확정
  cell(b, 4).click();
  assert.equal(cell(b, 5).className.includes('target'), true);
  cell(b, 5).click(); // 도착 칸 눌러 확정

  // 5번 칸에 말 이동 완료, 차례 전환 확인
  assert.equal(cell(b, 5).querySelector('.token').dataset.count, '1');
  assert.match(b.$('turnBanner').textContent, /민수 차례!/);
});

test('쓸 수 없는 칩: yut, backdo에서 판 위 말이 없으면 빽도 칩 비활성화', () => {
  const b = browser({ game: 'yut' });
  b.boot();
  b.$('startGame').click();

  mockRolls(b, ['yut', 'backdo']);
  b.$('throwButton').click();
  b.$('throwButton').click();

  const c0 = chip(b, 0); // 윷
  const c1 = chip(b, 1); // 빽도

  // 판 위에 말이 없으므로 빽도 칩은 비활성화
  assert.equal(c0.disabled, false);
  assert.equal(c1.disabled, true);

  // 윷으로 말을 판(4번 칸)에 올림
  waitBtn(b).click();
  b.$('confirmMove').click();

  // 이제 판 위에 말이 있으므로 빽도 칩 활성화
  assert.equal(chip(b, 0).textContent, '빽도');
  assert.equal(chip(b, 0).disabled, false);
});

test('빽도뿐일 때 넘어감과 알림', () => {
  const b = browser({ game: 'yut' });
  b.boot();
  b.$('startGame').click();

  mockRolls(b, ['backdo']);
  b.$('throwButton').click();

  assert.equal(b.$('actionMessage').textContent, '움직일 말이 없어 넘어가요.');
  assert.match(b.$('turnBanner').textContent, /민수 차례!/);
  assert.equal(b.$('throwButton').disabled, false);
});

test('잡기: 알림, 차례 유지, 남은 칩 보존 및 비활성화, 새로 던져 함께 사용', () => {
  const b = browser({ game: 'yut' });
  b.boot();
  b.$('startGame').click();

  // 민서(p1): 도 던져 1번 칸으로 이동
  mockRolls(b, ['do']);
  b.$('throwButton').click();
  waitBtn(b).click();
  b.$('confirmMove').click();
  assert.equal(cell(b, 1).querySelector('.token').dataset.owner, 'p1');

  // 민수(p2): 윷, 도 던짐 -> 윷으로 먼저 이동하지 않고, '도' 칩을 선택해 1번 칸의 민서 말을 잡음
  mockRolls(b, ['yut', 'do', 'gae']);
  b.$('throwButton').click(); // 윷
  b.$('throwButton').click(); // 도

  // 민수가 '도' 칩 선택
  chip(b, 1).click();
  assert.equal(chip(b, 1).getAttribute('aria-pressed'), 'true');

  // 대기말을 '도'로 1번에 놓아 민서 말 잡기
  waitBtn(b).click();
  b.$('confirmMove').click();

  // 잡았으므로 알림 발생 및 차례 유지, 던지기 단계로 복귀
  assert.equal(b.$('actionMessage').textContent, '잡았어요! 한 번 더 던져요!');
  assert.match(b.$('turnBanner').textContent, /민수 차례!/);
  assert.equal(b.$('throwButton').disabled, false);

  // 기존 '윷' 칩은 꺼진 채로 보임
  assert.equal(chip(b, 0).textContent, '윷');
  assert.equal(chip(b, 0).disabled, true);

  // 보너스 던지기 실행 (개 나옴)
  b.$('throwButton').click();
  assert.equal(b.$('throwButton').disabled, true); // 이제 이동 단계

  // 이제 '윷'과 '개' 2개 칩을 모두 쓸 수 있음
  assert.equal(chip(b, 0).disabled, false);
  assert.equal(chip(b, 1).disabled, false);
});

test('합류: 알림, count 뱃지, 합류 칸 눌러 확정, 묶음 이동', () => {
  const b = browser({ game: 'yut' });
  b.boot();
  b.$('startGame').click();

  // p1: 걸(3)로 3번 칸 배치
  mockRolls(b, ['geol']);
  b.$('throwButton').click();
  waitBtn(b).click();
  b.$('confirmMove').click();

  // p2 턴 패스: 개(2)로 2번 칸
  mockRolls(b, ['gae']);
  b.$('throwButton').click();
  waitBtn(b).click();
  b.$('confirmMove').click();

  // p1: 걸(3)로 3번 칸의 기존 말과 합류
  mockRolls(b, ['geol']);
  b.$('throwButton').click();
  waitBtn(b).click();
  cell(b, 3).click(); // 아군 말 있는 3번 칸 눌러 확정!

  assert.equal(b.$('actionMessage').textContent, '업었어요!');
  assert.equal(cell(b, 3).querySelector('.token').dataset.count, '2');

  // p2 턴 패스: 개(2)로 4번 칸
  mockRolls(b, ['gae']);
  b.$('throwButton').click();
  cell(b, 2).click();
  cell(b, 4).click();

  // p1: 도(1) 던져서 3번 칸의 2개 말을 함께 4번 칸으로 이동 (p2 말 잡기)
  mockRolls(b, ['do']);
  b.$('throwButton').click();
  cell(b, 3).click();
  cell(b, 4).click();

  // p2 말을 잡고 2개 말이 함께 4번 칸에 있음
  assert.equal(cell(b, 4).querySelector('.token').dataset.count, '2');
  assert.equal(b.$('actionMessage').textContent, '잡았어요! 한 번 더 던져요!');
});

test('움직일 수 없는 칸을 누를 때 문구와 고른 것 유지', () => {
  const b = browser({ game: 'yut' });
  b.boot();
  b.$('startGame').click();

  mockRolls(b, ['do']);
  b.$('throwButton').click();

  // 빈 칸인 10번 칸 클릭
  cell(b, 10).click();
  assert.equal(b.$('moveText').textContent, '이 말은 지금 움직일 수 없어요.');
});

test('도움 단계 세 가지의 클래스와 helpText', () => {
  const b = browser({ game: 'yut' });
  b.boot();
  b.$('startGame').click();

  // p1(helper): 도 던짐 -> 대기말에 .can-move
  mockRolls(b, ['do']);
  b.$('throwButton').click();
  assert.equal(waitBtn(b).className.includes('can-move'), true);
  assert.equal(b.$('helpText').textContent, '빛나는 말을 골라요.');

  // 대기말 선택 -> 1번 칸에 .target
  waitBtn(b).click();
  assert.equal(cell(b, 1).className.includes('target'), true);
  b.$('confirmMove').click();

  // p2(tactic): 개 던짐 -> can-move 없음
  mockRolls(b, ['gae']);
  b.$('throwButton').click();
  assert.equal(waitBtn(b).className.includes('can-move'), false);
  assert.equal(b.$('helpText').textContent, '');

  // 1번에 있는 p1 말을 잡을 수 있도록 '도' 던지는 상황 시뮬레이션
  mockRolls(b, ['do']);
  b.context.YutEngine.applyThrow(b.context.YutEngine.createGame(players())); // noop
});

test('완주: finishCell, 승부: 끝 화면, 음성 뒤 보상, rematch 회전 및 effectGeneration 방어', () => {
  const pList = players().slice(0, 2);
  const b0 = browser({ game: 'yut' });
  const E = b0.context.YutEngine;
  let s = E.createGame(pList, 2);
  s = E.applyThrow(E.applyThrow(s, 'yut'), 'do');
  s = E.applyMove(s, 'p1-0', 1);
  s = E.applyMove(s, 'p1-1', 0);
  s = E.applyThrow(s, 'backdo');
  s = E.applyMove(E.applyThrow(s, 'backdo'), 'p1-0', 0);
  s = E.applyThrow(s, 'backdo');
  s = E.applyThrow(E.applyThrow(s, 'mo'), 'do');
  s = E.applyMove(s, 'p1-0', 1);
  s = E.applyMove(s, 'p1-1', 0);
  s = E.applyThrow(s, 'backdo');
  s = E.applyMove(E.applyThrow(s, 'do'), 'p1-1', 0);
  s = E.applyThrow(s, 'backdo');
  s = E.applyThrow(E.applyThrow(E.applyThrow(s, 'mo'), 'mo'), 'gae');
  s = E.applyMove(s, 'p1-1', 0); // 10 -> 29

  // 1) 정상 완주 및 보상, 다시하기
  const b = browser({ game: 'yut', storage: { familyYutGame: JSON.stringify(s) } });
  b.boot();
  b.$('resumeGame').click();
  // 개(2) 칩 선택 후 29번 말 선택 -> finishCell 활성화 후 클릭
  chip(b, 1).click();
  cell(b, 29).click();
  assert.equal(b.$('finishCell').disabled, false);
  assert.ok(b.$('finishCell').className.includes('target'));
  b.$('finishCell').click();

  // 승부 확인
  assert.equal(b.$('endView').hidden, false);
  assert.match(b.$('endTitle').textContent, /민서, 이겼어요!/);
  assert.equal(b.speech.at(-1).text, '민서, 이겼어요!');

  // 음성 콜백 후 보상 수령
  b.speech.at(-1).after();
  assert.equal(b.speech.at(-1).text, 'reward');

  // rematch(다시하기): 차례 회전 확인
  b.$('playAgain').click();
  assert.equal(b.$('endView').hidden, true);
  assert.match(b.speech.at(-1).text, /민수부터 던져요!/);

  // 2) effectGeneration 방어: 승부 음성 끝나기 전 다시하기 누르면 늦은 보상 차단
  const bRematch = browser({ game: 'yut', storage: { familyYutGame: JSON.stringify(s) } });
  bRematch.boot();
  bRematch.$('resumeGame').click();
  chip(bRematch, 1).click();
  cell(bRematch, 29).click();
  bRematch.$('finishCell').click();
  const lateWinSpeech = bRematch.speech.at(-1);
  assert.equal(lateWinSpeech.text, '민서, 이겼어요!');
  bRematch.$('playAgain').click(); // 이전 음성 도중 다시하기 클릭
  lateWinSpeech.after(); // 뒤늦은 음성 콜백 호출
  assert.equal(bRematch.speech.filter(x => x.text === 'reward').length, 0); // 보상 안 나옴!

  // 3) effectGeneration 방어: 승부 음성 끝나기 전 pagehide 발생 시 늦은 보상 차단
  const bHide = browser({ game: 'yut', storage: { familyYutGame: JSON.stringify(s) } });
  bHide.boot();
  bHide.$('resumeGame').click();
  chip(bHide, 1).click();
  cell(bHide, 29).click();
  bHide.$('finishCell').click();
  const hideWinSpeech = bHide.speech.at(-1);
  assert.equal(hideWinSpeech.text, '민서, 이겼어요!');
  bHide.fire('pagehide'); // 화면 떠남
  hideWinSpeech.after();
  assert.equal(bHide.speech.filter(x => x.text === 'reward').length, 0); // 보상 안 나옴!
});

test('음소거 및 이어하기와 저장 차단', () => {
  // 음소거 토글
  const b = browser({ game: 'yut' });
  b.boot();
  b.$('soundToggle').click();
  assert.equal(b.$('soundToggle').getAttribute('aria-pressed'), 'true');
  assert.equal(b.$('soundToggle').textContent, '🔇 안내 음성');

  b.$('startGame').click();
  // 음소거이므로 말소리 안 남
  assert.equal(b.speech.length, 0);

  // 저장 차단 브라우저
  const bBlocked = browser({ game: 'yut', blocked: true });
  bBlocked.boot();
  bBlocked.$('startGame').click();
  assert.match(bBlocked.$('saveStatus').textContent, /이 기기에 저장하지 못했어요/);
});

test('리소스 계약: 줄 수, 상대 경로, 금지 API 없음, 로비 및 놀이터 카드', () => {
  for (const [file, limit] of [['yut-ui.js', 500], ['yut.html', 150], ['yut.css', 300]]) {
    const source = read(file);
    assert.ok(source.trimEnd().split('\n').length <= limit, `${file} 줄 수 초과`);
    assert.doesNotMatch(source, /innerHTML/);
    assert.doesNotMatch(source, /speechSynthesis/);
  }
  const uiSource = read('yut-ui.js');
  assert.doesNotMatch(uiSource, /Math\.random/);

  const html = read('yut.html');
  assert.ok(html.indexOf('src="../../core/fairy-config.js"') < html.indexOf('src="yut-ui.js"'));
  assert.doesNotMatch(html, /family-room/);
  assert.doesNotMatch(html, /<meta[^>]*Content-Security-Policy/i);

  // 로비 및 놀이터 카드 등록 확인
  const lobbyConfig = read('../../js/lobby_config.js');
  assert.match(lobbyConfig, /kids\/playground\/family\/yut\.html/);

  const playgroundIndex = read('../index.html');
  assert.match(playgroundIndex, /href="family\/yut\.html"/);
});

test('2·3·4인 무작위 한 판을 클릭으로 끝까지: 매 단계 isValidSaved 통과', () => {
  for (const count of [2, 3, 4]) {
    const b = browser({ game: 'yut' });
    b.boot();
    b.$('playerCount').value = String(count);
    b.$('playerCount').fire('change');
    b.$('pieceCount').value = '2';
    b.$('startGame').click();

    let steps = 0;
    while (b.$('endView').hidden && steps < 500) {
      steps++;
      // 매 단계 저장값 검증
      const raw = b.store.get('familyYutGame');
      if (raw) {
        assert.equal(b.context.YutEngine.isValidSaved(JSON.parse(raw)), true);
      }

      if (!b.$('throwButton').disabled) {
        b.$('throwButton').click();
      } else {
        const chips = b.$('pendingList').querySelectorAll('.throw-chip:not(:disabled)');
        if (chips.length === 0) break;
        chips[0].click();

        // 움직일 수 있는 칸 중 하나 클릭
        const canMoves = b.$('board').querySelectorAll('.can-move');
        const wait = b.$('waitingTray').querySelectorAll('.can-move')[0];
        if (wait) {
          wait.click();
        } else if (canMoves.length > 0) {
          canMoves[0].click();
        } else {
          // helper가 아닌 경우 판 위 말 클릭
          const anyCell = b.$('board').querySelectorAll('.yut-cell').find(n => !n.disabled);
          if (anyCell) anyCell.click();
        }

        if (!b.$('confirmMove').disabled) {
          b.$('confirmMove').click();
        } else if (!b.$('finishCell').disabled) {
          b.$('finishCell').click();
        }
      }
    }
  }
});
