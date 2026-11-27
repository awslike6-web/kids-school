// 🧚 요정 묶음 공식 순서를 kids/config.js(FAIRY_CORE_CHAIN)에서 읽어 시험끼리 나눠 쓴다 (리팩토링 묶음 C, 2026-11-27)
// - FAIRY_CORE_CHAIN: config.js에 적힌 그대로(?v= 포함) — vm 가짜 환경에 넣을 때
// - expandFairyChain(src): 동적 목록의 `...FAIRY_CORE_CHAIN`을 `'fairy-config.js?v=…', …,` 글자로 펼친다
//   → 예전처럼 목록에 이름이 글자로 있다고 보고 순서를 검사하는 시험(fairy-tts ①, 학습설정 ⑥)이 그대로 돈다
import fs from 'node:fs';

const configSrc = fs.readFileSync(new URL('../kids/config.js', import.meta.url), 'utf8');
const m = configSrc.match(/var\s+FAIRY_CORE_CHAIN\s*=\s*\[([\s\S]*?)\]/);
if (!m) throw new Error('kids/config.js에서 FAIRY_CORE_CHAIN을 찾지 못함');
export const FAIRY_CORE_CHAIN = [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map(x => x[1]);

export function expandFairyChain(src) {
    const names = FAIRY_CORE_CHAIN.map(n => `'${n}'`).join(', ') + ',';
    return src
        // core.js: ...(typeof FAIRY_CORE_CHAIN !== 'undefined' ? FAIRY_CORE_CHAIN : [갈음]) 모양 (뒤 쉼표까지)
        .replace(/\.\.\.\(\s*typeof\s+FAIRY_CORE_CHAIN[^?]*\?\s*FAIRY_CORE_CHAIN\s*:\s*\[[^\]]*\]\s*\)\s*,?/g, names)
        .replace(/\.\.\.FAIRY_CORE_CHAIN\b\s*,?/g, names);
}
