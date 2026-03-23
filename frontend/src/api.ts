import { mockDashboard, onboardingPayload } from './mockData';

export type ActionCard = {
  title: string;
  reason: string;
  expectedImpact: string;
  checklist: string[];
};

export type MarginSnapshot = {
  netProfit: number;
  marginRate: number;
  breakEvenOrders: number;
  suggestedPrice: number;
};

export type CopyVariant = {
  headline: string;
  body: string;
};

export type DashboardData = {
  source: 'api' | 'mock';
  apiHealth: string;
  apiBaseUrl: string;
  syncedAt: string;
  focus: string;
  actions: ActionCard[];
  margin: MarginSnapshot;
  copies: CopyVariant[];
  profile: {
    monthlyGoal: number;
    repeatCustomerRate: number;
  };
  snapshot: {
    weeklyRevenue: number;
  };
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

function mapAction(action: any): ActionCard {
  return {
    title: action.title,
    reason: action.reason,
    expectedImpact: action.expected_impact,
    checklist: action.checklist,
  };
}

function mapMargin(payload: any): MarginSnapshot {
  return {
    netProfit: payload.net_profit,
    marginRate: payload.margin_rate,
    breakEvenOrders: payload.break_even_orders,
    suggestedPrice: payload.suggested_price,
  };
}

export async function loadDashboard(): Promise<DashboardData> {
  try {
    const [healthRes, actionsRes, marginRes, copyRes] = await Promise.all([
      fetch(`${API_BASE_URL}/health`),
      fetch(`${API_BASE_URL}/api/actions/today`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(onboardingPayload),
      }),
      fetch(`${API_BASE_URL}/api/calculator/margin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sale_price: 25000,
          cost: 9000,
          fee_rate: 0.12,
          ad_cost: 2000,
          delivery_cost: 3000,
          coupon_cost: 1000,
          target_profit: 100000,
        }),
      }),
      fetch(`${API_BASE_URL}/api/ai/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: onboardingPayload.profile.business_name,
          offer: '재구매 고객 전용 쿠폰',
          channel: 'instagram',
          tone: 'bold',
          action_hint: '재방문 유도',
        }),
      }),
    ]);

    if (![healthRes, actionsRes, marginRes, copyRes].every((response) => response.ok)) {
      throw new Error('API request failed.');
    }

    const health = await healthRes.json();
    const actions = await actionsRes.json();
    const margin = await marginRes.json();
    const copies = await copyRes.json();

    return {
      source: 'api',
      apiHealth: health.status,
      apiBaseUrl: API_BASE_URL,
      syncedAt: new Date().toLocaleString('ko-KR'),
      focus: actions.focus,
      actions: actions.actions.map(mapAction),
      margin: mapMargin(margin),
      copies: copies.variants,
      profile: {
        monthlyGoal: onboardingPayload.profile.monthly_goal,
        repeatCustomerRate: onboardingPayload.profile.repeat_customer_rate,
      },
      snapshot: {
        weeklyRevenue: onboardingPayload.snapshot.weekly_revenue,
      },
    };
  } catch {
    return {
      ...mockDashboard,
      apiBaseUrl: API_BASE_URL,
      syncedAt: `${new Date().toLocaleString('ko-KR')} (fallback)`,
    };
  }
}
