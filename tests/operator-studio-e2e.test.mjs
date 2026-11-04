// 연산 스튜디오 4대 사칙연산 전체 탭 & 단계별 인터랙티브 E2E 시뮬레이션 검증
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = path.join(root, 'kids/subjects/math/js');

class MockElement {
  constructor(id = '', tagName = 'div') {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    const classes = new Set();
    this.classList = {
      add: (...tokens) => tokens.forEach(t => classes.add(t)),
      remove: (...tokens) => tokens.forEach(t => classes.delete(t)),
      contains: t => classes.has(t),
      toggle: (t, force) => {
        if (force === true) { classes.add(t); return true; }
        if (force === false) { classes.delete(t); return false; }
        if (classes.has(t)) { classes.delete(t); return false; }
        classes.add(t); return true;
      }
    };
    this.style = {};
    this.dataset = {};
    this._value = '';
    this._innerHTML = '';
    this._textContent = '';
    this.children = [];
    this.listeners = {};
    this.attributes = {};
  }
  get value() { return this._value; }
  set value(v) { this._value = String(v); }
  get textContent() { return this._textContent; }
  set textContent(v) { this._textContent = String(v); }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(v) {
    this._innerHTML = String(v);
    this._textContent = String(v).replace(/<[^>]*>/g, '');
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] ?? null; }
  addEventListener(event, fn) {
    (this.listeners[event] ??= []).push(fn);
  }
  click() {
    if (this.onclick) this.onclick();
    if (this.listeners.click) {
      this.listeners.click.forEach(fn => fn({ target: this, preventDefault() {} }));
    }
  }
}

function createStudioEnvironment() {
  const elements = {};
  function getEl(id) {
    if (!elements[id]) elements[id] = new MockElement(id);
    return elements[id];
  }

  // HTML에 존재하는 주요 정적 요소들 사전 생성
  const initialIds = [
    'numA', 'numB', 'opSymbol', 'studioViewport', 'fairySpeechText',
    'ttsToggleBtn', 'userProfileTag', 'stepTitle', 'stepDesc',
    'stepNextBtn', 'stepPrevBtn', 'stepProgressText', 'nlNextBtn', 'nlPrevBtn', 'nlProgressText'
  ];
  initialIds.forEach(id => getEl(id));

  // 추천 프리셋 컨테이너 mock
  const presetContainer = new MockElement('presetRow');
  const viewTabs = [
    new MockElement('tab-blocks', 'button'),
    new MockElement('tab-vertical', 'button'),
    new MockElement('tab-numberline', 'button'),
    new MockElement('tab-area', 'button')
  ];

  const consoleErrors = [];

  const sandbox = {
    window: {},
    console: {
      log: () => {},
      warn: () => {},
      error: (...args) => consoleErrors.push(args.join(' '))
    },
    localStorage: {
      getItem: () => null,
      setItem: () => {}
    },
    document: {
      getElementById: id => getEl(id),
      querySelector: sel => {
        if (sel === '.preset-row') return presetContainer;
        if (sel.includes('[data-tab="area"]') || sel.includes('area')) return viewTabs[3];
        return null;
      },
      querySelectorAll: sel => {
        if (sel.includes('.view-tab-btn')) return viewTabs;
        if (sel.includes('.op-tab-btn')) return [new MockElement(), new MockElement(), new MockElement(), new MockElement()];
        return [];
      },
      addEventListener() {}
    },
    alert: msg => { sandbox.__lastAlert = msg; },
    speakFairyTTS: (text) => { sandbox.__lastSpoken = text; },
    isSafeSfxEnabled: () => false
  };

  sandbox.window = sandbox;
  vm.createContext(sandbox);

  for (const file of ['math_operator_studio-plans.js', 'math_operator_studio-core.js', 'math_operator_studio-main.js']) {
    const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
    vm.runInContext(code, sandbox, { filename: file });
  }

  return {
    sandbox,
    getEl,
    consoleErrors,
    run: code => vm.runInContext(code, sandbox)
  };
}

test('E2E: 덧셈(add) 모드 전환 -> 프리셋 -> 4대 탭 순회 -> 세로셈 전 단계 클릭 인터랙티브', () => {
  const env = createStudioEnvironment();
  env.run(`
    switchOperation('add');
    loadPreset(48, 37);
  `);

  assert.equal(env.run('currentOp'), 'add');
  assert.equal(env.getEl('numA').value, '48');
  assert.equal(env.getEl('numB').value, '37');
  assert.equal(env.getEl('opSymbol').textContent, '+');

  // 1) 블록 뷰 확인 및 블록 단계 진행
  env.run(`switchViewTab('blocks');`);
  const vpBlocks = env.getEl('studioViewport').innerHTML;
  assert.ok(vpBlocks.includes('블록 모으기'), '블록 뷰 제목 포함');
  env.run(`changeBlockStep(1);`);
  env.run(`changeBlockStep(1);`); // 3단계(받아올림 합체)
  const vpBlocksStep3 = env.getEl('studioViewport').innerHTML;
  assert.ok(vpBlocksStep3.includes('변신') || vpBlocksStep3.includes('받아올림'), '받아올림 합체 안내 포함');

  // 2) 세로셈 뷰 & 전 단계 다음/이전 클릭
  env.run(`switchViewTab('vertical');`);
  const planLength = env.run('currentPlan.length');
  assert.ok(planLength > 1, '덧셈 플랜 생성됨');

  for (let i = 1; i <= planLength; i++) {
    assert.equal(env.run('tutorCurrentStep'), i);
    const vpHtml = env.getEl('studioViewport').innerHTML;
    assert.ok(vpHtml.includes('standard-vertical-table') || vpHtml.includes('vertical-stage-card'), '세로셈 렌더링 유지');
    if (i < planLength) env.run(`changeTutorStep(1);`);
  }
  for (let i = planLength; i > 1; i--) {
    env.run(`changeTutorStep(-1);`);
  }
  assert.equal(env.run('tutorCurrentStep'), 1);

  // 3) 수직선 뷰 & 점프 모델 확인
  env.run(`switchViewTab('numberline');`);
  assert.equal(env.run('currentViewTab'), 'numberline');
  const vpNl = env.getEl('studioViewport').innerHTML;
  assert.ok(vpNl.includes('수직선') && vpNl.includes('시작 수') && vpNl.includes('도착한 수'), '수직선 모델 시각화 확인');

  assert.equal(env.consoleErrors.length, 0, '콘솔 에러 0건');
});

test('E2E: 뺄셈(sub) 모드 전환 -> 받아내림 세로셈 전 단계 -> 음수 입력 에러리스 처리', () => {
  const env = createStudioEnvironment();
  env.run(`
    switchOperation('sub');
    loadPreset(82, 35);
  `);

  assert.equal(env.run('currentOp'), 'sub');
  assert.equal(env.getEl('opSymbol').textContent, '−');

  // 1) 블록 뷰 확인 및 블록 단계 진행
  env.run(`switchViewTab('blocks');`);
  env.run(`changeBlockStep(1);`); // 2단계 (받아내림 쪼개기)
  const vpBlocks = env.getEl('studioViewport').innerHTML;
  assert.ok(vpBlocks.includes('쪼갰어요') || vpBlocks.includes('받아내림'), '받아내림 풀림 안내 포함');

  // 2) 세로셈 뷰 & 단계별 클릭
  env.run(`switchViewTab('vertical');`);
  const planLength = env.run('currentPlan.length');
  for (let i = 1; i <= planLength; i++) {
    if (i < planLength) env.run(`changeTutorStep(1);`);
  }
  assert.equal(env.run('tutorCurrentStep'), planLength);

  // 3) 음수 뺄셈 에러리스 검증 (20 - 50)
  env.getEl('numA').value = '20';
  env.getEl('numB').value = '50';
  env.run(`startStudioCalculation();`);
  const vpNegative = env.getEl('studioViewport').innerHTML;
  assert.ok(vpNegative.includes('큰 수에서 작은 수') || vpNegative.includes('음수가 되어'), '에러리스 안내 화면 출력');

  assert.equal(env.consoleErrors.length, 0, '콘솔 에러 0건');
});

test('E2E: 곱셈(mul) 모드 전환 -> 부분곱 세로셈 전 단계 -> 넓이(area) 모델 뷰 확인', () => {
  const env = createStudioEnvironment();
  env.run(`
    switchOperation('mul');
    loadPreset(34, 12);
  `);

  assert.equal(env.run('currentOp'), 'mul');
  assert.equal(env.getEl('opSymbol').textContent, '×');

  // 1) 세로셈 단계 검증
  env.run(`switchViewTab('vertical');`);
  const planLength = env.run('currentPlan.length');
  for (let i = 1; i <= planLength; i++) {
    if (i < planLength) env.run(`changeTutorStep(1);`);
  }
  assert.equal(env.run('tutorCurrentStep'), planLength);

  // 2) 면적(넓이) 모델 뷰 확인
  env.run(`switchViewTab('area');`);
  const vpArea = env.getEl('studioViewport').innerHTML;
  assert.ok(vpArea.includes('area-rect-container') || vpArea.includes('area-box'), '면적 부분곱 그리드 렌더링');

  // 3) 수직선 뷰 확인
  env.run(`switchViewTab('numberline');`);
  const vpNl = env.getEl('studioViewport').innerHTML;
  assert.ok(vpNl.includes('수직선') && vpNl.includes('시작 수') && vpNl.includes('도착한 수'), '곱셈 수직선 시각화 확인');

  assert.equal(env.consoleErrors.length, 0, '콘솔 에러 0건');
});

test('E2E: 나눗셈(div) 기존 회귀 및 0으로 나누기 방어 확인', () => {
  const env = createStudioEnvironment();
  env.run(`
    switchOperation('div');
    loadPreset(74, 6);
  `);

  assert.equal(env.run('currentOp'), 'div');
  env.run(`switchViewTab('vertical');`);
  assert.equal(env.run('divisionPlan.length'), 7);

  // 0 나누기 입력 방어
  env.getEl('numB').value = '0';
  env.run(`startStudioCalculation();`);
  assert.equal(env.sandbox.__lastAlert, '0으로는 나눌 수 없어요!');
  assert.equal(env.getEl('numB').value, '1');

  assert.equal(env.consoleErrors.length, 0, '콘솔 에러 0건');
});

test('E2E: 모바일 375px 반응형 CSS 무넘침 계약 검증', () => {
  // CSS 파일에서 area-rect-container 및 area-box의 반응형 규격 검증
  const css = fs.readFileSync(path.join(root, 'kids/css/math_operator_studio.css'), 'utf8');
  assert.ok(css.includes('.area-rect-container'), '.area-rect-container 스타일 실존');
  assert.ok(css.includes('box-sizing: border-box') || css.includes('max-width: 100%'), '모바일 무넘침 방어 속성 포함');
});
