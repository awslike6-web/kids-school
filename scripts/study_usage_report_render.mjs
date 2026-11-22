// 실사용 리포트 마크다운 출력부 (docs/study_usage_report_spec.md §2). 집계는 study_usage_report.mjs,
// 이 파일은 집계 결과(report)를 글로만 바꾼다. 본 파일이 800줄을 넘어 나눔(2026-11-23).

// 본 파일의 CHILDREN과 같다(서로 불러오면 순환 참조라 한 줄 복사, 시험이 둘이 같은지 본다)
export const CHILDREN = ['민수', '민서'];
const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const PREFIXES = ['v', 'c', 'r', 's', 'g']; // 문항키 접두어 (docs/learning_record_spec.md §3)

// 백분율 포맷
function fmtPct(rate) {
  return `${Math.round(rate * 1000) / 10}%`;
}
// 시도가 없으면 비율 대신 '-' (0%는 「늘 틀림」으로 읽힌다)
function fmtRate(rate, tries) {
  return tries > 0 ? fmtPct(rate) : '-';
}

// 마크다운 리포트 렌더링
export function renderMarkdown(report) {
  const lines = [];
  const meta = report.meta ?? {};
  const err = report.errors ?? {};
  const keyNames = report.keyNames ?? {};

  lines.push(`# 학습 사용 리포트 (${meta.since ?? ''} ~ ${meta.until ?? ''})`);
  lines.push('');
  const infoParts = [
    `대상: ${meta.child ?? CHILDREN.join(', ')}`,
    `측정 행: ${meta.activityCount ?? 0}건`,
    `일지 행: ${meta.dailyCount ?? 0}건`,
    `관리자 제외: ${meta.adminSkipped ?? 0}건`,
    `범위 외 제외: ${meta.outOfRange ?? 0}건`,
  ];
  if (meta.brokenLogs) infoParts.push(`깨진 문항기록: ${meta.brokenLogs}건`);
  lines.push(infoParts.join(' · '));
  lines.push('');

  lines.push('## 사용 시간·빈도');
  if (err.log) {
    lines.push('조회 실패');
  } else {
    for (const [child, u] of Object.entries(report.usage ?? {})) {
      const avg = u.days > 0 ? Math.round((u.totalMin / u.days) * 10) / 10 : 0;
      lines.push(`### ${child}`);
      lines.push(`- 공부한 날: ${u.days}일 / 총 ${u.totalMin}분 (공부일 평균 ${avg}분)`);
      const wd = WEEKDAY_NAMES.map((name, idx) => `${name} ${u.weekday[idx] ?? 0}분`).join(', ');
      lines.push(`- 요일 분포: ${wd}`);
      lines.push('');
      lines.push('| 과목 | 시간(분) | 측정 행 |');
      lines.push('| :--- | ---: | ---: |');
      for (const [subj, s] of Object.entries(u.subjects ?? {})) {
        lines.push(`| ${subj} | ${s.min} | ${s.rows} |`);
      }
      lines.push('');
      lines.push('※ 과목별은 참고값(과목 겹침·분 버림으로 전체 합과 다를 수 있음)');
      if (u.zeroSubjects?.length) {
        lines.push(`- 0분 과목: ${u.zeroSubjects.join(', ')}`);
      }
      lines.push('');
    }
  }

  lines.push('## 문항 기록 요약');
  if (err.log) {
    lines.push('조회 실패');
  } else {
    for (const [child, subjMap] of Object.entries(report.items ?? {})) {
      lines.push(`### ${child}`);
      // 문항기록이 아직 없는 과목(일지 행만 있음)은 표에서 뺀다 — 0·0·0%가 「늘 틀림」으로 읽히지 않게
      const withItems = Object.entries(subjMap).filter(([, s]) => s.items > 0);
      if (!withItems.length) {
        lines.push('- 아직 문항 기록이 없어요.', '');
        continue;
      }
      lines.push('| 과목 | 문항 | 시도 | 첫 시도 정답률 | 힌트 비율 | 출처(v/c/r/s/g) |');
      lines.push('| :--- | ---: | ---: | ---: | ---: | :--- |');
      for (const [subj, s] of withItems) {
        const src = PREFIXES.map((p) => `${p}:${s.prefixes[p] ?? 0}`).join(' ');
        lines.push(
          `| ${subj} | ${s.items} | ${s.tries} | ${fmtRate(s.firstTryRate, s.tries)} | ${fmtRate(s.hintRate, s.tries)} | ${src} |`
        );
      }
      lines.push('');
    }
  }

  lines.push('## 막힌 문항');
  if (err.log) {
    lines.push('조회 실패');
  } else {
    for (const [child, subjMap] of Object.entries(report.stuck ?? {})) {
      lines.push(`### ${child}`);
      if (!Object.values(subjMap).some((list) => list.length)) lines.push('- 없음', '');
      for (const [subj, list] of Object.entries(subjMap)) {
        if (!list.length) continue;
        lines.push(`#### ${subj}`);
        lines.push('| 문항 | 시도 | 틀림 | 힌트 | 최근 오답 |');
        lines.push('| :--- | ---: | ---: | ---: | :--- |');
        for (const row of list) {
          const label = keyNames[row.key] ?? row.key;
          // 보기 글자 안에 쉼표가 있을 수 있어(예 「일찍, 이른」) 하나씩 「」로 묶는다
          const picks = row.picks.length ? row.picks.map((p) => `「${p}」`).join(' ') : '-';
          lines.push(`| ${label} | ${row.t} | ${row.w} | ${row.h} | ${picks} |`);
        }
        lines.push('');
      }
    }
  }

  lines.push('## 수학 유형');
  if (err.log) {
    lines.push('조회 실패');
  } else {
    for (const [child, rows] of Object.entries(report.mathTypes ?? {})) {
      lines.push(`### ${child}`);
      if (!rows.length) {
        lines.push('기록 없음');
      } else {
        lines.push('| 유형 | 첫 시도 정답률 | 맞힘/시도 |');
        lines.push('| :--- | ---: | ---: |');
        for (const r of rows) {
          const ok = r.tries - r.wrong;
          lines.push(`| ${r.type} | ${fmtPct(r.rate)} | ${ok}/${r.tries} |`);
        }
      }
      lines.push('');
    }
  }

  lines.push('## 3·3·3 정착');
  if (meta.fast) {
    lines.push('`--fast` 옵션으로 생략됨');
  } else if (err.voca) {
    lines.push('조회 실패');
  } else {
    for (const [bucket, subjMap] of Object.entries(report.mastery ?? {})) {
      const title = bucket === '공통' ? '공통(누구 것인지 구분 불가)' : bucket;
      lines.push(`### ${title}`);
      lines.push('| 과목 | 단어 수 | Lv1 | Lv2 | Lv3 | 은메달 | 금메달 | 녹슨 왕관 |');
      lines.push('| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
      for (const [subj, m] of Object.entries(subjMap)) {
        lines.push(
          `| ${subj} | ${m.n} | ${m.lv[1]} | ${m.lv[2]} | ${m.lv[3]} | ${m.silver} | ${m.gold} | ${m.rusty} |`
        );
      }
      lines.push('');
    }
  }

  lines.push('## 저장 칸 점유율');
  if (err.inventory && err.log) {
    lines.push('조회 실패');
  } else {
    if (err.inventory) {
      lines.push('인벤토리: 조회 실패');
    } else {
      lines.push('| 아이 | 칸 | 글자 수 | 조각 | 한계 | 점유율 | 상태 |');
      lines.push('| :--- | :--- | ---: | ---: | ---: | ---: | :--- |');
      for (const [child, fields] of Object.entries(report.fieldUsage?.inventory ?? {})) {
        for (const [field, f] of Object.entries(fields)) {
          const warn = f.warn ? '⚠️' : 'OK';
          lines.push(`| ${child} | ${field} | ${f.len} | ${f.chunks} | ${f.limit} | ${f.pct}% | ${warn} |`);
        }
      }
      lines.push('');
    }
    const longest = report.fieldUsage?.longestItemLog;
    if (!err.log && longest) {
      lines.push(`- 문항기록 최장 행: ${longest.id || '-'} (${longest.len}자, ${longest.chunks}조각)`);
    }
  }
  lines.push('');
  return lines.join('\n');
}
