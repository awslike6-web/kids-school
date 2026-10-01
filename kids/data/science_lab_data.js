// ==========================================
// 🔬 과학 가상 실험실 데이터 스켈레톤 (science_lab_data.js)
// ==========================================
// 💡 [클린 아키텍처 Headless CMS 원칙]
// 전체 실험 가이드와 탐구 퀘스트는 노션 CURRICULUM_DB에서 동적 송출됩니다.
// 원본 대용량 데이터는 kids/data/legacy_backup/science_lab_data.js에 영구 보존되어 있습니다.

const SCIENCE_LAB_DATA = {
  "cloud": { "title": "구름 발생 가상 실험", "unit": "3단원", "grade": "5-2" },
  "dew_fog": { "title": "이슬과 안개 발생 실험", "unit": "3단원", "grade": "5-2" },
  "hygrometer": { "title": "건습구 습도계 측정 실험", "unit": "3단원", "grade": "5-2" },
  "season_airmass": { "title": "계절별 기단과 날씨", "unit": "3단원", "grade": "5-2" },
  "virtual_lab": { "title": "과학 가상 실험실 코어", "unit": "전체", "grade": "5-2" },
  "wind": { "title": "바람이 부는 까닭 실험", "unit": "3단원", "grade": "5-2" }
};

if (typeof window !== 'undefined') {
  window.SCIENCE_LAB_DATA = SCIENCE_LAB_DATA;
}
