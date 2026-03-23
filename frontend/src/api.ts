import { buildMockDashboard } from './mockData';
import type { DashboardData, OnboardingPayload, SavedProfileRecord, SalesChannel, Tone } from './types';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

type SavedProfileApiResponse = {
  profile_id: string;
  profile: OnboardingPayload['profile'];
  snapshot: OnboardingPayload['snapshot'];
};

type DashboardApiResponse = {
  focus: string;
  actions: Array<{
    title: string;
    reason: string;
    expected_impact: string;
    checklist: string[];
  }>;
};

type MarginApiResponse = {
  net_profit: number;
  margin_rate: number;
  break_even_orders: number;
  suggested_price: number;
};

type CopyApiResponse = {
  variants: Array<{
    headline: string;
    body: string;
  }>;
};

export async function saveBusinessProfile(
  payload: OnboardingPayload,
  profileId: string | null,
): Promise<SavedProfileRecord> {
  try {
    const data = await fetchJson<SavedProfileApiResponse>(
      profileId ? `${API_BASE_URL}/api/business-profiles/${profileId}` : `${API_BASE_URL}/api/business-profiles`,
      {
        method: profileId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    return {
      profileId: data.profile_id,
      payload: {
        profile: data.profile,
        snapshot: data.snapshot,
      },
      source: 'api',
    };
  } catch {
    return {
      profileId,
      payload,
      source: 'local',
    };
  }
}

export async function fetchBusinessProfile(profileId: string): Promise<OnboardingPayload | null> {
  try {
    const data = await fetchJson<SavedProfileApiResponse>(`${API_BASE_URL}/api/business-profiles/${profileId}`);
    return {
      profile: data.profile,
      snapshot: data.snapshot,
    };
  } catch {
    return null;
  }
}

export async function loadDashboard(payload: OnboardingPayload): Promise<DashboardData> {
  try {
    const [health, actions, margin, copies] = await Promise.all([
      fetchJson<{ status: string }>(`${API_BASE_URL}/health`),
      fetchJson<DashboardApiResponse>(`${API_BASE_URL}/api/actions/today`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
      fetchJson<MarginApiResponse>(`${API_BASE_URL}/api/calculator/margin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createMarginInput(payload)),
      }),
      fetchJson<CopyApiResponse>(`${API_BASE_URL}/api/ai/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createCopyInput(payload)),
      }),
    ]);

    return {
      source: 'api',
      apiHealth: health.status,
      apiBaseUrl: API_BASE_URL,
      syncedAt: new Date().toLocaleString('ko-KR'),
      focus: actions.focus,
      actions: actions.actions.map((action) => ({
        title: action.title,
        reason: action.reason,
        expectedImpact: action.expected_impact,
        checklist: action.checklist,
      })),
      margin: {
        netProfit: margin.net_profit,
        marginRate: margin.margin_rate,
        breakEvenOrders: margin.break_even_orders,
        suggestedPrice: margin.suggested_price,
      },
      copies: copies.variants,
      profile: {
        businessName: payload.profile.business_name,
        businessType: payload.profile.business_type,
        monthlyGoal: payload.profile.monthly_goal,
        repeatCustomerRate: payload.profile.repeat_customer_rate,
        channels: payload.profile.channels,
      },
      snapshot: {
        weeklyRevenue: payload.snapshot.weekly_revenue,
        weeklyOrders: payload.snapshot.weekly_orders,
        trendDelta: payload.snapshot.trend_delta,
      },
    };
  } catch {
    return buildMockDashboard(payload, API_BASE_URL);
  }
}

function createMarginInput(payload: OnboardingPayload) {
  const perOrderAdCost = payload.snapshot.weekly_orders
    ? Math.round(payload.snapshot.ad_cost / payload.snapshot.weekly_orders)
    : 0;
  const perOrderCouponCost = payload.snapshot.weekly_orders
    ? Math.round(payload.snapshot.coupon_cost / payload.snapshot.weekly_orders)
    : 0;

  return {
    sale_price: payload.profile.average_order_value,
    cost: Math.round(payload.profile.average_order_value * 0.38),
    fee_rate: inferFeeRate(payload.profile.channels),
    ad_cost: perOrderAdCost,
    delivery_cost: payload.profile.business_type === 'online_seller' ? 3000 : 0,
    coupon_cost: perOrderCouponCost,
    target_profit: 100000,
  };
}

function createCopyInput(payload: OnboardingPayload): {
  business_name: string;
  offer: string;
  channel: SalesChannel;
  tone: Tone;
  action_hint: string;
} {
  return {
    business_name: payload.profile.business_name,
    offer: payload.profile.repeat_customer_rate < 0.3 ? 'repeat purchase coupon' : 'bundle upgrade',
    channel: payload.profile.channels[0] ?? 'instagram',
    tone: payload.snapshot.trend_delta < 0 ? 'bold' : 'concise',
    action_hint: payload.profile.repeat_customer_rate < 0.3 ? 'retention' : 'upsell',
  };
}

function inferFeeRate(channels: SalesChannel[]) {
  if (channels.includes('smart_store') || channels.includes('open_market')) {
    return 0.12;
  }
  if (channels.includes('instagram')) {
    return 0.07;
  }
  return 0.05;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}
