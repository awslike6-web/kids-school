// 객관식 보기 화면 섞기 지킴이 (docs/quiz_choice_shuffle_spec.md §3 4단계, GEMINI.md §4-5)
// 보기를 그리는 코드(choices.map / options.forEach 등)가 있는 파일은 window.QuizChoices로 섞거나,
// 아래 허용 목록에 사유와 함께 있어야 한다. 새 단원 화면을 만들며 섞기를 빠뜨리면 여기서 실패한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PATTERN = /\b(?:choices|options)\s*\)?\s*\.\s*(?:map|forEach)\s*\(/;
const EXCLUDE = new Set(['kids/data', 'kids/deprecated_backup', 'node_modules']);
const ALLOWLIST = {
  'kids/core/quiz-flow-controller.js': '부품 자신',
  'kids/js/english_phonics.js': '오답을 무작위로 뽑아 보기 생성',
  'kids/js/english_voca.js': '오답을 무작위로 뽑아 보기 생성',
  'kids/js/korean_voca.js': '오답을 무작위로 뽑아 보기 생성',
  'kids/js/society_voca.js': '오답을 무작위로 뽑아 보기 생성',
  'kids/subjects/math/js/congruence_symmetry-quiz.js': '자체 Fisher-Yates ui.shuffle',
  'kids/subjects/math/js/clock_rules_logic.js': '수학 공통 MathQuizEngine.shuffleArray(Fisher-Yates)로 섞음',
  'kids/subjects/quest/quest-runner.js': '5분 퀘스트 엔진 withShuffledOptions가 섞음',
  'kids/subjects/quest/quest-ui-renderer.js': '5분 퀘스트 엔진 withShuffledOptions가 섞음',
  'kids/subjects/quest/quest_engine.js': 'withShuffledOptions 정의',
};

const toPosix = (p) => path.relative(ROOT, p).split(path.sep).join('/');

function collectTargets() {
  const files = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.html'))
    .map((d) => path.join(ROOT, d.name));
  const walk = (dir) => {
    for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, d.name);
      if (d.isDirectory()) {
        if (!EXCLUDE.has(toPosix(full))) walk(full);
      } else if (d.name.endsWith('.js') || d.name.endsWith('.html')) {
        files.push(full);
      }
    }
  };
  walk(path.join(ROOT, 'kids'));
  return files;
}

test('모든 객관식 화면은 QuizChoices로 보기를 섞는다 (아니면 허용 목록에 사유)', () => {
  const violations = collectTargets()
    .map((f) => ({ rel: toPosix(f), text: fs.readFileSync(f, 'utf8') }))
    .filter(({ rel, text }) => PATTERN.test(text) && !text.includes('QuizChoices') && !(rel in ALLOWLIST))
    .map(({ rel }) => rel);
  assert.equal(
    violations.length,
    0,
    `QuizChoices 미적용 파일:\n- ${violations.join('\n- ')}\nwindow.QuizChoices.arrange로 섞거나, 섞지 않아도 되는 까닭이 있으면 이 시험의 허용 목록에 사유와 함께 추가하세요.`,
  );
});

test('허용 목록의 파일이 실제로 있고 여전히 보기를 그린다 (낡은 항목 정리)', () => {
  const stale = Object.keys(ALLOWLIST).filter((rel) => {
    const full = path.join(ROOT, ...rel.split('/'));
    return !fs.existsSync(full) || !PATTERN.test(fs.readFileSync(full, 'utf8'));
  });
  assert.deepEqual(stale, [], `허용 목록에서 정리할 낡은 항목: ${stale.join(', ')}`);
});
