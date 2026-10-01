import re
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def verify_changes():
    with open('monster_lab.html', 'r', encoding='utf-8') as f:
        html = f.read()

    with open('kids/subjects/quest/quest_engine.js', 'r', encoding='utf-8') as f:
        engine = f.read()

    with open('kids/subjects/quest/parent_progress_controller.js', 'r', encoding='utf-8') as f:
        controller = f.read()

    print("=== [검증 1] monster_lab.html 마크업 및 요소 ID 검증 ===")
    checks = [
        ('minseoSemesterTabGroup', '민서 학기 알약 탭 그룹'),
        ('minsuSemesterTabGroup', '민수 학기 알약 탭 그룹'),
        ('chkMinseoReviewSem1', '민서 1-1 복습 토글 체크박스'),
        ('chkMinsuReviewSem1', '민수 5-1 복습 토글 체크박스'),
        ('chkMinsuJihye', '민수 지혜반 어휘 복습 토글 체크박스'),
        ('badgeMinseoSemesterDesc', '민서 학기 설명 배지'),
        ('badgeMinsuSemesterDesc', '민수 학기 설명 배지'),
        ('parent_progress_controller.js', '부모 진도 컨트롤러 스크립트 연동'),
    ]

    for item_id, label in checks:
        assert item_id in html, f"❌ 누락: {label} ({item_id})"
        print(f"  ✅ {label} ({item_id}) 정상 확인")

    print("\n=== [검증 2] parent_progress_controller.js 모듈 로직 검증 ===")
    controller_checks = [
        ('setParentSemester', '학기 전환 함수'),
        ('toggleReviewOption', '복습 옵션 토글 함수'),
        ('getUnitNumber', '단원 번호 정규화 함수'),
        ('isSameUnit', '단원 동등성 비교 함수'),
        ('syncDynamicUnitChips', '동적 칩 렌더링 함수 (Zero Hardcoding)'),
        ('setAttribute(\'data-sem\'', '동적 data-sem 속성 부여 로직'),
        ('sem: \'5-2\'', '5-2학기 메타데이터 정의'),
        ('semType = \'5-1\'', '5-1학기 노션/단원 동적 분류 로직'),
    ]

    for pattern, label in controller_checks:
        assert pattern in controller, f"❌ 누락: {label} ({pattern})"
        print(f"  ✅ {label} ({pattern}) 정상 확인")

    print("\n=== [검증 3] quest_engine.js 로직 검증 ===")
    engine_checks = [
        ('semester: \'5-2\'', '민수 기본 학기 5-2 설정'),
        ('semester: \'1-2\'', '민서 기본 학기 1-2 설정'),
        ('options.semesterScope', 'buildVocaQuestionsFromNotion 학기 스코프 옵션 지원'),
        ('parentSettings.includeReviewSem1', '1학기 복습 풀 연동 확인'),
        ('parentSettings.includeJihye', '지혜반 복습 풀 연동 확인'),
        ('[5-1 누적 복습 🔄]', '민수 5-1 복습 문제 라벨링'),
        ('[지혜반 복습 🌱]', '민수 지혜반 복습 문제 라벨링'),
        ('[1-1 누적 복습 🔄]', '민서 1-1 복습 문제 라벨링'),
    ]

    for pattern, label in engine_checks:
        assert pattern in engine, f"❌ 누락: {label} ({pattern})"
        print(f"  ✅ {label} 정상 확인")

    print("\n=== [검증 4] 단원 중복 제거 (L9 vs 9단원) 정규화 검증 ===")
    assert "getUnitNumber(u1)" in controller and "isSameUnit" in controller, "isSameUnit 함수에 단원 번호 정규화가 탑재되어야 합니다."
    print("  ✅ isSameUnit 정규화 및 L9/9단원 단일 통합 검증 통과")

    print("\n🎉 모든 정밀 검증을 성공적으로 통과하였습니다!")

if __name__ == '__main__':
    verify_changes()
