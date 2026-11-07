# -*- coding: utf-8 -*-
"""
streamline_quest_runner.py
quest_runner.html에서 quest_engine.js, quest_data_minsu.js, quest_data_minseo.js로
분리된 코드를 제거하고 초경량 UI 컨트롤러 구조로 정리합니다.
"""

import sys
from pathlib import Path

# Windows utf-8
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def streamline():
    html_path = Path("g:/master-tower/kids-school-main/quest_runner.html")
    content = html_path.read_text(encoding='utf-8')

    # 1. 인라인 스크립트 시작 지점 찾기
    start_marker = "  <!-- ================= 7. 실시간 퀴즈 러너 엔진 스크립트 ================= -->\n  <script>"
    end_marker = "    let currentIndex = 0;"

    assert start_marker in content, "start_marker를 찾을 수 없습니다."
    assert end_marker in content, "end_marker를 찾을 수 없습니다."

    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)

    compact_init = """  <!-- ================= 7. 실시간 퀴즈 러너 엔진 스크립트 ================= -->
  <script>
    // ========================================================
    // 🚀 퀘스트 파라미터 파싱 및 데이터 바인딩
    // (quest_engine.js, quest_data_minsu.js, quest_data_minseo.js 연동)
    // ========================================================
    const urlParams = new URLSearchParams(window.location.search);
    const currentUser = urlParams.get('user') || localStorage.getItem('currentChild') || localStorage.getItem('currentUser') || 'minsu';
    const isMinseo = (currentUser === 'minseo' || currentUser === 'daughter');
    const currentSubj = urlParams.get('subject') || (isMinseo ? 'math' : 'math');
    const currentUnit = urlParams.get('unit') || (isMinseo ? (currentSubj === 'korean' ? 'voca' : (currentSubj === 'english' ? 'phonics' : '100num')) : (currentSubj === 'math' ? 'division' : '8'));
    const currentMode = urlParams.get('mode') || (isMinseo ? 'speed' : 'mixed');

    // 퀘스트 데이터 바인딩 (quest_engine.js getSubjectQuest 호출)
    let currentQuest = getSubjectQuest(currentSubj, currentUnit, currentMode, currentUser);

"""

    new_content = content[:start_idx] + compact_init + content[end_idx:]

    html_path.write_text(new_content, encoding='utf-8')
    print(f"✅ quest_runner.html 경량화 완료!")
    print(f"  - 원본 줄 수: {len(content.splitlines())}줄")
    print(f"  - 경량화 후: {len(new_content.splitlines())}줄 (약 {len(content.splitlines()) - len(new_content.splitlines())}줄 감축!)")

if __name__ == "__main__":
    streamline()
