# MONEY BIZ Architecture

## 1. 설계 원칙

- 모바일 우선
- 빠른 실험 가능성
- AI 비용 통제
- 복잡한 외부 연동은 후순위
- 운영 데이터와 생성형 AI 로그를 분리

## 2. 권장 기술 스택

### Client

- `Expo React Native`
- `TypeScript`
- `Expo Router`
- `React Query`
- `NativeWind` 또는 단순 토큰 기반 스타일 시스템

선정 이유:

- iOS/Android 동시 대응
- 초기 인력으로 빠르게 MVP 제작 가능
- 추후 웹 대응도 비교적 유연

### Backend API

- `FastAPI`
- `Pydantic`
- `SQLAlchemy`
- `PostgreSQL`

선정 이유:

- AI orchestration과 데이터 API를 같은 언어로 관리하기 쉽다.
- 문서화와 검증이 빠르다.

### Async / Worker

- `Celery` 또는 `RQ`
- `Redis`

용도:

- AI 생성 작업
- CSV 파싱
- 주간 리포트 생성
- 알림 발송 예약

### Infra

- `PostgreSQL`
- `Redis`
- `S3 호환 스토리지`
- `Docker Compose`로 로컬 개발
- 이후 `Railway`, `Render`, `Fly.io`, `AWS` 중 하나로 배포

### Billing

- 앱 내 결제: `RevenueCat`
- 웹 결제 또는 랜딩 페이지 결제: `Stripe`

## 3. 시스템 구성

```text
Mobile App
 -> API Gateway / FastAPI
 -> Auth Service
 -> Recommendation Service
 -> AI Generation Service
 -> Billing Service
 -> Analytics Service
 -> PostgreSQL
 -> Redis / Worker
 -> Object Storage
```

## 4. 핵심 도메인 모델

### User

- id
- email
- role
- plan
- locale

### BusinessProfile

- user_id
- business_type
- sales_channels
- monthly_goal
- average_order_value
- customer_segment

### ProductOrService

- business_profile_id
- title
- category
- price
- cost
- fee_rate

### SalesEntry

- business_profile_id
- date
- revenue
- orders
- ad_cost
- delivery_cost

### ActionRecommendation

- business_profile_id
- action_type
- reason
- expected_impact
- status

### AIAsset

- business_profile_id
- asset_type
- prompt_version
- output
- token_cost

## 5. 추천 엔진 방향

MVP에서는 복잡한 ML보다 규칙 기반 + LLM 보조 방식을 권장한다.

### 입력

- 업종
- 채널
- 최근 매출 추이
- 가격/원가
- 고객 유형
- 지난 액션 수행 내역

### 처리

- 룰 엔진이 우선순위 후보를 만든다.
- LLM이 사용자 친화적 액션 문구와 실행 템플릿을 생성한다.
- 결과는 저장되어 다음 추천에 반영된다.

### 출력

- 오늘의 액션 3개
- 예상 효과
- 바로 실행 가능한 문구/체크리스트

## 6. 왜 ML보다 룰 엔진부터 시작하는가

- 초기 데이터가 적다.
- 업종별 설명 가능성이 중요하다.
- 잘못된 추천의 비용이 작지 않다.
- 실험 속도가 더 빠르다.

## 7. API 초안

### Auth

- `POST /auth/signup`
- `POST /auth/login`

### Onboarding

- `POST /business-profiles`
- `POST /products`

### Data

- `POST /sales-entries`
- `POST /sales-entries/import`

### Recommendation

- `GET /actions/today`
- `POST /actions/{id}/complete`
- `POST /actions/{id}/dismiss`

### AI Studio

- `POST /ai/copy`
- `POST /ai/message`
- `POST /ai/product-description`

### Billing

- `GET /plans`
- `POST /billing/checkout`
- `POST /billing/webhook`

## 8. 보안 및 운영 고려사항

- 결제 웹훅 서명 검증
- 업로드 CSV 바이러스/형식 검사
- AI 입력 로그의 개인정보 마스킹
- 프롬프트 버전 관리
- 요청당 토큰 사용량 추적
- 관리자용 abuse 모니터링

## 9. MVP 구현 순서

1. 인증, 온보딩, 데이터 입력
2. 액션 추천 카드
3. AI 카피 생성
4. 마진 계산기
5. 결제와 플랜 제한
6. 분석 이벤트 수집

## 10. 추후 확장

- 네이버 스마트스토어 연동
- 예약/캘린더 연동
- 카카오 알림톡 연동
- 업종별 추천 모델 분화
- 주간 자동 운영 에이전트
