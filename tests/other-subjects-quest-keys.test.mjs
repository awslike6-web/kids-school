// 기타 과목(도덕·미술·보건) 퀘스트 키가 네 곳에서 같은지 (docs/other_subjects_spec.md §5-1)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { root, read } from './split-rules.mjs';

const require = createRequire(import.meta.url);
const KEYS = { moral: '도덕', art: '미술', health: '보건' };

test('quest-mastery SUBJECT_KO에 세 과목이 있고 출제 대상이다', () => {
    const QM = require(path.join(root, 'kids/subjects/quest/quest-mastery.js'));
    for (const [key, ko] of Object.entries(KEYS)) {
        assert.equal(QM.SUBJECT_KO[key], ko);
        assert.ok(QM.isEligibleSubject(key));
    }
});

test('용어사전방 버튼 표와 퀘스트 러너·문제은행의 키가 같다', () => {
    const voca = read('kids/common_space/voca_common.js');
    const runner = read('kids/subjects/quest/quest-runner.js');
    const bank = read('kids/subjects/quest/quest_data_minsu.js');
    for (const [key, ko] of Object.entries(KEYS)) {
        assert.ok(voca.includes(`'${ko}': '${key}'`), `voca ${ko}`);
        assert.ok(runner.includes(`${key}: "${ko}"`), `KOREAN_SUBJ_MAP ${key}`);
        assert.ok(new RegExp(`\\b${key}: \\{ title: "`).test(bank), `minsuMasterBank ${key}`);
    }
    assert.match(runner, /const VOCA_ONLY_SUBJECTS = \['moral', 'art', 'health'\]/);
});

test('기타 과목은 없는 과목방·수학 폴백으로 가지 않고 용어사전방으로 돌아간다', () => {
    const runner = read('kids/subjects/quest/quest-runner.js');
    assert.match(runner, /backToVoca \? vocaReturnUrl\(\) : `monster_lab\.html/);
    assert.match(runner, /backToVoca \? vocaReturnUrl\(\) : UI\.deepTrainingUrl/);
    assert.match(runner, /isVocaOnlySubject && !masteryRound\) \{[\s\S]{0,200}vocaReturnUrl\(\);\s*return;/);
});
