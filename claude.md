# 프로젝트 지침

## 코딩 규칙
- CSS 클래스명은 BEM 방식 사용
- 커밋 메시지는 한국어로 작성

## 프로젝트 구조
- src/css/ : 스타일 파일
- src/js/ : 스크립트 파일

## UI/UX 규칙
- 모든 애니메이션은 CSS transition/animation 사용
- 트랜지션 기본값: ease-out, 200~300ms
- 레이아웃 변경 시 reflow 최소화
- 스크롤/드래그는 will-change, transform 활용
- 이미지/리소스 사전 로드로 지연 방지
- 잔상 방지: backface-visibility: hidden 적용

## 응답 규칙
- 코드 설명은 생략, 코드만 제공
- 불필요한 인사말/마무리 문구 생략
- 변경된 부분만 출력 (전체 파일 X)
- 확인 질문 최소화, 바로 실행
- 파일 읽을 때 필요한 범위만 읽기

## 주의사항
- reference/ 폴더는 참고용, 수정 금지