// 요정 코코 아바타: 사라진 외부 그림 주소를 쓰지 않고, 각 페이지의 상대 경로가 실제 파일을 가리키는지 확인한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const subjects = path.join(root, 'kids/subjects');
const DEAD_ICON = 'external-fairy-fairy-tale-pack-flat-linear-illy-cafe';

function htmlFiles(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return htmlFiles(full);
        return entry.name.endsWith('.html') ? [full] : [];
    });
}

test('요정 코코 그림은 사라진 외부 주소를 쓰지 않는다', () => {
    for (const file of htmlFiles(subjects)) {
        assert.ok(!fs.readFileSync(file, 'utf8').includes(DEAD_ICON), `옛 주소가 남음: ${file}`);
    }
});

test('요정 코코 그림 참조가 모두 실제 파일을 가리킨다', () => {
    const target = path.join(root, 'kids/assets/images/coco_fairy.webp');
    assert.ok(fs.existsSync(target), '그림 파일 없음');

    let references = 0;
    for (const file of htmlFiles(subjects)) {
        const html = fs.readFileSync(file, 'utf8');
        for (const match of html.matchAll(/src="([^"]*coco_fairy\.webp)"/g)) {
            references++;
            assert.ok(!match[1].startsWith('/') && !match[1].startsWith('http'), `상대 경로가 아님: ${file}`);
            assert.equal(path.resolve(path.dirname(file), match[1]), target, `잘못된 경로: ${file}`);
        }
    }
    assert.ok(references >= 18, `참조 수가 줄었음: ${references}`);
});
