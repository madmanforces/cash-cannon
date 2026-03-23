# Research Notes

작성일: 2026-03-23

아래 내용은 `수익화가 잘 되는 앱 카테고리`와 `누가 실제로 돈을 낼 가능성이 높은가`를 판단하기 위해 확인한 자료 요약이다.

주력안인 `MONEY BIZ`는 이 자료를 바탕으로 한 추론 결과다.

## 핵심 요약

- `Business` 카테고리는 구독형 앱에서 LTV가 높은 편이다.
- `Asia-Pacific`도 구독형 과금 관점에서 잠재력이 있다.
- 생성형 AI 앱 시장은 2024년에 큰 폭으로 성장했다.
- 소규모 사업자는 이미 AI를 `마케팅`, `고객 응대`, `행정`, `장부`에 사용하고 있다.
- 따라서 개인 소비자용 돈 관리 앱보다 `사업자의 매출 액션을 실행해 주는 앱`이 더 직접적인 과금 명분을 갖는다.

## 출처

### 1. RevenueCat, State of Subscription Apps 2025

링크:

- https://www.revenuecat.com/state-of-subscription-apps-2025/

핵심 포인트:

- `Business`와 `Health & Fitness` 카테고리가 높은 LTV를 보였다고 정리한다.
- `Asia-Pacific`의 median LTV가 경쟁력 있다고 제시한다.
- 구독 앱은 `subscription + consumables` 하이브리드가 LTV 확장에 유효하다고 제안한다.

설계 반영:

- `MONEY BIZ`를 Business 카테고리형 앱으로 설정
- 기본 과금은 구독
- AI 크레딧과 업종 템플릿은 add-on으로 분리

### 2. Sensor Tower, 2025 State of Mobile: AI is Everywhere on Mobile

링크:

- https://sensortower.com/blog/2025-state-of-mobile-ai-is-everywhere-on-mobile

핵심 포인트:

- 생성형 AI 앱 IAP 매출이 2024년에 약 `1.3B USD` 수준으로 성장했다고 설명한다.
- 다운로드도 약 `1.5B` 수준으로 증가했다고 설명한다.
- AI는 Productivity, Utilities, Education뿐 아니라 Finance, Shopping 등 다양한 카테고리로 퍼지고 있다고 정리한다.

설계 반영:

- 앱의 핵심 가치에 AI 생성 기능을 포함
- 단순 챗봇이 아니라 특정 비즈니스 작업 실행형 AI로 포지셔닝

### 3. QuickBooks, Survey reveals small businesses are using AI to boost productivity

링크:

- https://quickbooks.intuit.com/r/small-business-data/april-2025-survey/

핵심 포인트:

- 2025년 4월 조사에서 소규모 사업자의 `68%`가 AI를 정기적으로 사용한다고 발표
- AI 사용 사업자의 `74%`가 생산성 향상을 경험했다고 응답
- 주요 활용처는 `마케팅`, `고객 서비스`, `행정`, `데이터 처리`, `장부` 순서

설계 반영:

- 홈 화면 첫 가치 제안은 마케팅/리텐션/운영 액션 추천
- 회계 전용 앱이 아니라 매출 실행 중심 도구로 정의

### 4. U.S. Chamber of Commerce, Empowering Small Business

링크:

- https://www.uschamber.com/technology/empowering-small-business-the-impact-of-technology-on-u-s-small-business

핵심 포인트:

- 자료 내 요약에서 소규모 사업자의 생성형 AI 사용이 크게 증가했다고 제시
- 기술 적극 활용 사업자가 매출/성장에 더 낙관적이라는 방향을 제시

설계 반영:

- 타깃을 기술 친화적 초기 사업자에 먼저 맞춤
- 랜딩 메시지를 `AI 자체`보다 `매출 개선 행동`에 둠

## 최종 판단

자료를 종합하면, 지금 시작할 앱은 아래 성격이 유리하다.

- 카테고리: `Business`
- 과금 방식: `Subscription + Add-on`
- 포지셔닝: `AI 콘텐츠 도구`가 아니라 `매출 실행 도구`
- 타깃: 소비자 전체가 아니라 `돈을 벌어야 하는 소규모 사업자`

즉, `MONEY BIZ`는 시장성과 과금 가능성, MVP 현실성의 균형이 가장 좋다.
