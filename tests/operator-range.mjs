// 연산 스튜디오 1~999 × 1~999 범위 시험의 입력 쌍 공급기 (시험 파일이 아닌 공용 도우미).
// - 로컬 기본값: 결정적 표본. a는 1~999 전부, b는 1~99 전부 + b === a(차가 0인 경우) + 100~999 중 (b - 100) % STRIDE === a % STRIDE 인 값.
//   a마다 고르는 b의 자리가 달라져 모든 b가 어떤 a와는 반드시 만난다(약 23만 쌍, 전수의 23%).
// - KIDS_TEST_FULL=1: 약 100만 쌍 전수. GitHub Actions(regression.yml)는 이 값으로 매 푸시 전수를 돈다.
// - 표본이 전수와 같은 구조 클래스(자릿수 × 자리별 올림/받아내림 × 결과 자릿수)를 빠짐없이 덮는지는
//   assertSampleCoversClasses()가 순수 산술로 확인한다. 표본 규칙을 바꾸면 이 검사가 먼저 깨진다.
export const FULL_RANGE = process.env.KIDS_TEST_FULL === '1';
const STRIDE = 7;

export function includePair(a, b) {
    return FULL_RANGE || b < 100 || b === a || (b - 100) % STRIDE === a % STRIDE;
}

export function forEachPair999(fn) {
    for (let a = 1; a <= 999; a++)
        for (let b = 1; b <= 999; b++)
            if (includePair(a, b)) fn(a, b);
}

const digitAt = (n, place) => Math.floor(n / 10 ** place) % 10;
const len = n => String(n).length;

// 덧셈 클래스: 두 수 자릿수, 자리별 올림 여부, 합의 자릿수
export function additionClass(a, b) {
    let carry = 0, bits = '';
    for (let place = 0; place < 3; place++) {
        carry = Math.floor((digitAt(a, place) + digitAt(b, place) + carry) / 10);
        bits += carry;
    }
    return `+${len(a)}${len(b)}:${bits}:${len(a + b)}`;
}

// 뺄셈 클래스: a<b(음수 안내), 같으면 0, 아니면 자리별 받아내림과 0을 건너 빌려 오는 횟수, 차의 자릿수
export function subtractionClass(a, b) {
    if (a < b) return `-neg:${len(a)}${len(b)}`;
    const cells = String(a).split('').map(Number), n = cells.length;
    const sub = String(b).padStart(n, '0').split('').map(Number);
    let marks = '';
    for (let c = n - 1; c >= 0; c--) {
        if (cells[c] < sub[c]) {
            let source = c - 1, zeros = 0;
            while (cells[source] === 0) { cells[source] = 9; source--; zeros++; }
            cells[source] -= 1; cells[c] += 10;
            marks += `b${zeros}`;
        } else marks += '_';
    }
    return `-${n}${len(b)}:${marks}:${a === b ? 0 : len(a - b)}`;
}

export function assertSampleCoversClasses(assert, classOf) {
    const full = new Set(), sample = new Set();
    for (let a = 1; a <= 999; a++)
        for (let b = 1; b <= 999; b++) {
            const key = classOf(a, b);
            full.add(key);
            if (includePair(a, b)) sample.add(key);
        }
    const missing = [...full].filter(key => !sample.has(key));
    assert.deepEqual(missing, [], `표본이 놓친 구조 클래스: ${missing.slice(0, 10).join(', ')}`);
    return full.size;
}
