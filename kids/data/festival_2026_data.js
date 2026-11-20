/* kids/data/festival_2026_data.js - 2026학년도 원신초 학예발표회 안내 데이터 (가정통신문 제208호 원문 기준) */
(function (global) {
  'use strict';

  const FESTIVAL_2026_DATA = Object.freeze({
    id: 'festival_2026_wonsin',
    docNo: '제 208 호',
    title: '2026 원신초 학예발표회',
    officialTitle: '2026학년도 원신초 학예발표회 안내',
    date: '2026-11-26',
    dateLabel: '2026. 11. 26. (목)',
    timeRange: '09:00 ~ 12:30',
    venue: '본교 꿈가꾸기실 (아우동)',
    target: '전교생',
    issuedDate: '2026. 11. 20.',
    issuer: '서울원신초등학교장',
    address: '08846 서울특별시 관악구 광신길 177 서울원신초등학교',
    phone: '02-888-1813',
    phoneDisplay: '02)888-1813 (내선 601)',
    greeting: [
      '학부모님 안녕하십니까?',
      '원신 어린이들이 그동안 다져 온 꿈과 끼를 보여주고자 ‘2026 원신초 학예발표회’를 개최합니다. 시간이 되시는 학부모님께서는 학예발표회에 참석하시어 어린이들의 밝고 즐거운 학교생활의 결실을 감상해 주시기 바랍니다. 또한 최선을 다한 원신 어린이들에게 많은 칭찬과 격려를 부탁드립니다.'
    ],
    warnings: Object.freeze([
      Object.freeze({ icon: '🚫', label: '교내 주차 불가', detail: '교내 주차가 불가하니 대중교통이나 인근 주차를 이용해 주세요.' }),
      Object.freeze({ icon: '🪑', label: '학부모 좌석 협소', detail: '꿈가꾸기실 장소가 협소한 관계로 학부모 좌석이 충분치 않은 점 양해 바랍니다.' })
    ]),
    childrenSummary: Object.freeze([
      Object.freeze({ key: 'minseo', name: '민서', icon: '👧', gradeLabel: '1-1 · 1,2학년', confirmedCount: 4 }),
      Object.freeze({ key: 'minsu', name: '민수', icon: '👦', gradeLabel: '5-2 · 5학년', confirmedCount: 2 }),
      Object.freeze({ key: 'check', name: '10번 확인 필요', icon: '❓', gradeLabel: 'K-POP댄스부', confirmedCount: 1 })
    ]),
    programs: Object.freeze([
      Object.freeze({
        order: 1,
        part: 1,
        genre: '가야금',
        title: '가야금 선율에 피어나는 꿈',
        group: '1,2학년',
        child: 'minseo',
        childLabel: '민서 참여',
        note: '1부 첫 시작 무대입니다. 09:00 시작 전에 자리 잡으면 놓치지 않습니다.'
      }),
      Object.freeze({
        order: 2,
        part: 1,
        genre: '장구',
        title: '장구와 함께 우리 가락 얼쑤!',
        group: '3-1',
        child: null,
        childLabel: '',
        note: ''
      }),
      Object.freeze({
        order: 3,
        part: 1,
        genre: '바이올린',
        title: '현 위에 피어난 우리들의 이야기',
        group: '아침바이올린부',
        child: null,
        childLabel: '',
        note: ''
      }),
      Object.freeze({
        order: 4,
        part: 1,
        genre: '깃발춤',
        title: '하나 되어 한 마음으로',
        group: '4-1',
        child: null,
        childLabel: '',
        note: ''
      }),
      Object.freeze({
        order: 5,
        part: 1,
        genre: '우쿨렐레',
        title: '작은 별 타고 고향으로 우쿨렐레 여행',
        group: '5학년',
        child: 'minsu',
        childLabel: '민수 참여',
        note: '민수 첫 무대입니다. 바로 다음 6번이 민서 핸드벨 무대라 연달아 이어집니다.'
      }),
      Object.freeze({
        order: 6,
        part: 1,
        genre: '핸드벨',
        title: '알록달록 핸드벨',
        group: '1,2학년',
        child: 'minseo',
        childLabel: '민서 참여',
        note: '민수 우쿨렐레(5번) 바로 다음 순서로 이어집니다.'
      }),
      Object.freeze({
        order: 7,
        part: 1,
        genre: '연극',
        title: '이백사십',
        group: '5-1',
        child: null,
        childLabel: '',
        note: ''
      }),
      Object.freeze({
        order: 8,
        part: 1,
        genre: '노래',
        title: '니가 좋아',
        group: '2-1',
        child: null,
        childLabel: '',
        note: ''
      }),
      Object.freeze({
        order: 9,
        part: 1,
        genre: '연극',
        title: '701호, 잊혀지지 않는 기억',
        group: '6-2',
        child: null,
        childLabel: '',
        note: ''
      }),
      Object.freeze({
        order: 10,
        part: 1,
        genre: '댄스',
        title: '하나 되는 몸짓, 신나는 무대!',
        group: 'K-POP댄스부',
        child: 'check',
        childLabel: '확인 필요',
        note: '가정통신문 출연란이 K-POP댄스부로 표기되어 있습니다. 민서 참여 여부를 확인해 주세요. (1부 마지막 무대)'
      }),
      Object.freeze({
        order: 0,
        part: 'break',
        genre: '중간 휴식',
        title: '중간 휴식',
        group: '1부 · 2부 사이',
        child: null,
        childLabel: '',
        note: '휴식 직후 11번(민서) → 12번(민수) → 13번(민서) 3연속 무대가 이어집니다.'
      }),
      Object.freeze({
        order: 11,
        part: 2,
        genre: '난타',
        title: '풍선 가득 꿈을 싣고 둥둥둥!',
        group: '1,2학년',
        child: 'minseo',
        childLabel: '민서 참여',
        note: '중간 휴식 직후 2부 첫 무대입니다. 11·12·13번이 민서·민수 연속 구간입니다.'
      }),
      Object.freeze({
        order: 12,
        part: 2,
        genre: '연극',
        title: '와이파이 스쿨',
        group: '5-2',
        child: 'minsu',
        childLabel: '민수 참여',
        note: '민수 반(5-2) 연극 무대입니다. 바로 다음 13번이 민서 반(1-1) 댄스입니다.'
      }),
      Object.freeze({
        order: 13,
        part: 2,
        genre: '댄스',
        title: '신나는 동요와 즐거운 댄스',
        group: '1-1',
        child: 'minseo',
        childLabel: '민서 참여',
        note: '민서 반(1-1) 무대이자 우리 아이들의 마지막 순서입니다.'
      }),
      Object.freeze({
        order: 14,
        part: 2,
        genre: '우쿨렐레',
        title: '등대, 섬 그리고 웃음',
        group: '6학년',
        child: null,
        childLabel: '',
        note: ''
      }),
      Object.freeze({
        order: 15,
        part: 2,
        genre: '리코더',
        title: '리코더에 실은 꿈',
        group: '3,4학년',
        child: null,
        childLabel: '',
        note: ''
      }),
      Object.freeze({
        order: 16,
        part: 2,
        genre: '연극',
        title: '운명_“질투를 넘어 배려와 용기로”',
        group: '6-1',
        child: null,
        childLabel: '',
        note: ''
      }),
      Object.freeze({
        order: 17,
        part: 2,
        genre: '표현동작',
        title: '물아일체',
        group: '남학생 5인',
        child: null,
        childLabel: '',
        note: ''
      })
    ])
  });

  global.FESTIVAL_2026_DATA = FESTIVAL_2026_DATA;
})(typeof window !== 'undefined' ? window : globalThis);
