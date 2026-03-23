import type { DashboardData } from './api';

export const onboardingPayload = {
  profile: {
    business_name: 'MONEY BIZ',
    business_type: 'online_seller',
    channels: ['smart_store', 'instagram'],
    monthly_goal: 5000000,
    average_order_value: 30000,
    repeat_customer_rate: 0.18,
  },
  snapshot: {
    weekly_revenue: 800000,
    weekly_orders: 27,
    ad_cost: 130000,
    coupon_cost: 70000,
    trend_delta: -0.12,
  },
};

export const mockDashboard: DashboardData = {
  source: 'mock',
  apiHealth: 'offline',
  apiBaseUrl: 'http://127.0.0.1:8000',
  syncedAt: '데모 데이터',
  focus: '회복 모드',
  actions: [
    {
      title: '이번 주 하락 원인을 반영한 긴급 캠페인 실행',
      reason: '주간 매출이 감소 중이라 빠른 노출 회복 액션이 필요합니다.',
      expectedImpact: '저관여 고객 유입과 즉시성 매출 회복',
      checklist: [
        '세트 상품 또는 보너스 혜택 구성 다시 잡기',
        '대표 채널에 업로드할 오늘의 홍보 문구 준비',
        '24시간 뒤 반응 수치를 다시 확인',
      ],
    },
    {
      title: '재구매 고객 리텐션 메시지 발송',
      reason: '반복 구매 비율이 낮아 재방문 유도가 우선입니다.',
      expectedImpact: '광고비를 늘리지 않고 매출 회수율 개선',
      checklist: [
        '최근 30일 구매 고객군 분리',
        '감사 메시지와 한정 혜택 문구 발송',
        '가장 반응이 좋은 시간대에 1회 발송',
      ],
    },
    {
      title: '마진 방어를 위한 가격/혜택 구조 조정',
      reason: '광고와 쿠폰 비용 비중이 높아 순이익이 압박받고 있습니다.',
      expectedImpact: '주문 수 유지와 마진율 개선의 균형 확보',
      checklist: [
        '기본 가격은 유지하고 묶음 옵션 추가',
        '효율 낮은 광고 소재 중단',
        '쿠폰은 신규 고객군 중심으로 재설계',
      ],
    },
  ],
  margin: {
    netProfit: 7000,
    marginRate: 0.28,
    breakEvenOrders: 15,
    suggestedPrice: 25000,
  },
  copies: [
    {
      headline: 'MONEY BIZ 재구매 고객 전용 쿠폰',
      body: '지금 바로 놓치면 아쉬운 인스타그램용 문구입니다. 재방문 유도에 초점을 맞춰 오늘 안에 바로 게시해 보세요.',
    },
    {
      headline: '다시 찾게 만드는 재구매 고객 전용 쿠폰',
      body: 'MONEY BIZ만의 강점을 한 문장으로 정리하고, 혜택을 첫 줄에 분명하게 제시해 주세요.',
    },
    {
      headline: '이번 주 반응을 끌어올릴 재구매 고객 전용 쿠폰',
      body: '첫 문장에서 혜택을 선명하게 보여주고 마지막 문장에는 행동 유도 표현을 넣는 편이 좋습니다.',
    },
  ],
  profile: {
    monthlyGoal: 5000000,
    repeatCustomerRate: 0.18,
  },
  snapshot: {
    weeklyRevenue: 800000,
  },
};
