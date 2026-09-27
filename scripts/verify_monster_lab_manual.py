# -*- coding: utf-8 -*-
"""
🚀 [자동화 검증 스크립트] verify_monster_lab_manual.py
검증 대상:
1. monster_lab.html 상단 헤더 📖 설명서 버튼 탑재 여부
2. parentProgressModal 내 3대 탭(민서, 민수, 설명서) 및 parentGuideSettings 마크업 무결성
3. switchParentTab JS 함수 가이드 탭 전환 로직 무결성
4. parent_dashboard.html 내 5분 퀘스트 관리판 링크 버튼 무결성
"""

import sys
from pathlib import Path

# 콘솔 UTF-8 출력 보장
sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = Path("g:/master-tower/kids-school-main")
LAB_HTML = ROOT_DIR / "monster_lab.html"
PARENT_DASH_HTML = ROOT_DIR / "parent_dashboard.html"

def test_monster_lab_manual():
    print("==================================================")
    print("🔍 1. monster_lab.html 부모 설명서 탑재 무결성 검증")
    print("==================================================")
    assert LAB_HTML.exists(), f"파일 누락: {LAB_HTML}"
    content = LAB_HTML.read_text(encoding='utf-8')

    # 1) 헤더 버튼
    assert "openParentProgressModal('guide')" in content, "헤더 설명서 버튼 누락"
    print("  ✅ [PASS] 헤더 📖 설명서 직결 버튼 탑재 확인")

    # 2) 3대 탭 ID
    assert 'id="parentTabMinseo"' in content, "민서 탭 누락"
    assert 'id="parentTabMinsu"' in content, "민수 탭 누락"
    assert 'id="parentTabGuide"' in content, "설명서 탭 누락"
    print("  ✅ [PASS] 부모 관리판 3대 탭 ID 완비 확인")

    # 3) 설명서 콘텐츠 영역 및 핵심 섹션
    assert 'id="parentGuideSettings"' in content, "설명서 콘텐츠 영역 ID 누락"
    assert "5분 퀘스트란 무엇인가요?" in content, "개요 섹션 누락"
    assert "1부. 5분 퀘스트는 어떻게 돌아가나요?" in content, "1부 작동 원리 누락"
    assert "2부. 부모는 어떻게 활용하면 되나요?" in content, "2부 부모 활용법 누락"
    assert "라이트너 3상자 시스템" in content, "망각곡선 복습 설명 누락"
    assert "타 학년 침투 차단 철벽 가드" in content, "학년 격리 가드 설명 누락"
    assert "노션 용어사전(VOCA DB)과 100% 자동 연동" in content, "노션 어휘 연동 설명 누락"
    assert "스마트폰 노션 학습일지에서 오답 실시간 확인" in content, "노션 학습일지 연동 설명 누락"
    print("  ✅ [PASS] 5분 퀘스트 원리 및 활용법 핵심 4대 헌법 수록 확인")

    # 4) JS 함수 로직
    assert "tab === 'guide'" in content, "switchParentTab 내 guide 처리 누락"
    assert "btnGuide.className" in content, "guide 탭 스타일 활성화 처리 누락"
    print("  ✅ [PASS] switchParentTab 자바스크립트 분기 로직 정상 탑재")

def test_parent_dashboard():
    print("\n==================================================")
    print("🔍 2. parent_dashboard.html 5분 퀘스트 링크 무결성 검증")
    print("==================================================")
    assert PARENT_DASH_HTML.exists(), f"파일 누락: {PARENT_DASH_HTML}"
    content = PARENT_DASH_HTML.read_text(encoding='utf-8')

    assert 'href="monster_lab.html"' in content, "monster_lab.html 링크 누락"
    assert "5분 퀘스트 관리판" in content, "관리판 버튼 텍스트 누락"
    assert '<div class="header-actions">' in content, "header-actions DOM 래퍼 누락"
    print("  ✅ [PASS] 대시보드 상단 5분 퀘스트 관리판 링크 및 DOM 무결성 확인")

def main():
    print("🚀 [검증 시작] 5분 퀘스트 부모 설명서 및 관리판 연동 검증\n")
    try:
        test_monster_lab_manual()
        test_parent_dashboard()
        print("\n🎉 ==================================================")
        print("🎉 [전원 합격] 5분 퀘스트 부모 설명서 검증을 100% 통과하였습니다!")
        print("🎉 ==================================================")
    except Exception as e:
        print(f"\n❌ [검증 실패] {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
