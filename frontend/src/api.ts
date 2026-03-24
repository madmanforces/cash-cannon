import { buildMockDashboard } from './mockData';
import type {
  AuthSession,
  AuthUser,
  BillingCheckoutSession,
  BillingPortalSession,
  BillingPlan,
  DashboardData,
  OnboardingPayload,
  PlanId,
  SavedProfileRecord,
  SalesChannel,
  Tone,
} from './types';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8000';

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

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

type RecommendationHistoryApiResponse = Array<{
  id: number;
  focus: string;
  created_at: string;
  actions: Array<{
    title: string;
  }>;
}>;

type AuthApiResponse = {
  session_token: string;
  user: UserApiResponse;
};

type UserApiResponse = {
  id: number;
  full_name: string;
  email: string;
  plan_id: PlanId;
  billing_provider: string;
  billing_status: string;
  billing_portal_available: boolean;
  renewal_date: string | null;
};

type BillingPlanApiResponse = Array<{
  id: PlanId;
  name: string;
  price_monthly_krw: number;
  description: string;
  features: string[];
}>;

type BillingCheckoutApiResponse = {
  session_id: string;
  provider: string;
  plan_id: PlanId;
  status: string;
  checkout_url: string | null;
  created_at?: string;
  completed_at?: string | null;
};

type BillingPortalApiResponse = {
  provider: string;
  url: string;
};

export async function signUp(payload: {
  fullName: string;
  email: string;
  password: string;
}): Promise<AuthSession> {
  const data = await fetchJson<AuthApiResponse>(`${API_BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      full_name: payload.fullName,
      email: payload.email,
      password: payload.password,
    }),
  });
  return mapAuthSession(data);
}


export async function login(payload: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  const data = await fetchJson<AuthApiResponse>(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return mapAuthSession(data);
}


export async function fetchCurrentUser(sessionToken: string): Promise<AuthUser> {
  const data = await fetchJson<UserApiResponse>(`${API_BASE_URL}/api/auth/me`, {
    headers: withSessionToken(sessionToken),
  });
  return mapUser(data);
}


export async function logout(sessionToken: string) {
  await fetchJson<{ status: string }>(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: withSessionToken(sessionToken),
  });
}


export async function fetchPlans(): Promise<BillingPlan[]> {
  const plans = await fetchJson<BillingPlanApiResponse>(`${API_BASE_URL}/api/billing/plans`);
  return plans.map(mapPlan);
}


export async function startBillingCheckout(sessionToken: string, planId: PlanId): Promise<BillingCheckoutSession> {
  const data = await fetchJson<BillingCheckoutApiResponse>(`${API_BASE_URL}/api/billing/checkout`, {
    method: 'POST',
    headers: {
      ...withSessionToken(sessionToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ plan_id: planId }),
  });
  return mapBillingCheckoutSession(data);
}


export async function fetchBillingCheckoutSession(
  sessionToken: string,
  checkoutSessionId: string,
): Promise<BillingCheckoutSession> {
  const data = await fetchJson<BillingCheckoutApiResponse>(
    `${API_BASE_URL}/api/billing/checkout-sessions/${checkoutSessionId}`,
    {
      headers: withSessionToken(sessionToken),
    },
  );
  return mapBillingCheckoutSession(data);
}


export async function openBillingPortal(sessionToken: string): Promise<BillingPortalSession> {
  return fetchJson<BillingPortalApiResponse>(`${API_BASE_URL}/api/billing/customer-portal`, {
    method: 'POST',
    headers: withSessionToken(sessionToken),
  });
}


export async function saveBusinessProfile(
  payload: OnboardingPayload,
  profileId: string | null,
  sessionToken: string,
): Promise<SavedProfileRecord> {
  try {
    const data = await fetchJson<SavedProfileApiResponse>(
      profileId ? `${API_BASE_URL}/api/business-profiles/${profileId}` : `${API_BASE_URL}/api/business-profiles`,
      {
        method: profileId ? 'PUT' : 'POST',
        headers: {
          ...withSessionToken(sessionToken),
          'Content-Type': 'application/json',
        },
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
  } catch (error) {
    if (error instanceof ApiError && error.status && error.status < 500) {
      throw error;
    }
    return {
      profileId,
      payload,
      source: 'local',
    };
  }
}


export async function fetchLatestBusinessProfile(sessionToken: string): Promise<SavedProfileRecord | null> {
  try {
    const data = await fetchJson<SavedProfileApiResponse>(`${API_BASE_URL}/api/business-profiles/me/latest`, {
      headers: withSessionToken(sessionToken),
    });
    return {
      profileId: data.profile_id,
      payload: {
        profile: data.profile,
        snapshot: data.snapshot,
      },
      source: 'api',
    };
  } catch {
    return null;
  }
}


export async function fetchBusinessProfile(profileId: string, sessionToken: string): Promise<OnboardingPayload | null> {
  try {
    const data = await fetchJson<SavedProfileApiResponse>(`${API_BASE_URL}/api/business-profiles/${profileId}`, {
      headers: withSessionToken(sessionToken),
    });
    return {
      profile: data.profile,
      snapshot: data.snapshot,
    };
  } catch {
    return null;
  }
}


export async function loadDashboard(
  payload: OnboardingPayload,
  profileId?: string | null,
  sessionToken?: string | null,
): Promise<DashboardData> {
  try {
    const authenticatedHeaders = sessionToken ? withSessionToken(sessionToken) : undefined;
    const actionRequest =
      profileId && authenticatedHeaders
        ? fetchJson<DashboardApiResponse>(`${API_BASE_URL}/api/business-profiles/${profileId}/actions/today`, {
            method: 'POST',
            headers: authenticatedHeaders,
          })
        : fetchJson<DashboardApiResponse>(`${API_BASE_URL}/api/actions/today`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

    const historyRequest =
      profileId && authenticatedHeaders
        ? fetchJson<RecommendationHistoryApiResponse>(
            `${API_BASE_URL}/api/business-profiles/${profileId}/recommendations?limit=4`,
            { headers: authenticatedHeaders },
          )
        : Promise.resolve([]);

    const [health, actions, margin, copies, history] = await Promise.all([
      fetchJson<{ status: string }>(`${API_BASE_URL}/health`),
      actionRequest,
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
      historyRequest,
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
      history: history.map((entry) => ({
        id: entry.id,
        focus: entry.focus,
        createdAt: new Date(entry.created_at).toLocaleString('ko-KR'),
        actionTitles: entry.actions.map((action) => action.title),
      })),
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


function withSessionToken(sessionToken: string) {
  return {
    'X-Session-Token': sessionToken,
  };
}


function mapAuthSession(data: AuthApiResponse): AuthSession {
  return {
    sessionToken: data.session_token,
    user: mapUser(data.user),
  };
}


function mapUser(data: UserApiResponse): AuthUser {
  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    planId: data.plan_id,
    billingProvider: data.billing_provider,
    billingStatus: data.billing_status,
    billingPortalAvailable: data.billing_portal_available,
    renewalDate: data.renewal_date,
  };
}


function mapPlan(data: BillingPlanApiResponse[number]): BillingPlan {
  return {
    id: data.id,
    name: data.name,
    priceMonthlyKrw: data.price_monthly_krw,
    description: data.description,
    features: data.features,
  };
}


function mapBillingCheckoutSession(data: BillingCheckoutApiResponse): BillingCheckoutSession {
  return {
    sessionId: data.session_id,
    provider: data.provider,
    planId: data.plan_id,
    status: data.status,
    checkoutUrl: data.checkout_url,
    createdAt: data.created_at ? new Date(data.created_at).toLocaleString('ko-KR') : null,
    completedAt: data.completed_at ? new Date(data.completed_at).toLocaleString('ko-KR') : null,
  };
}


async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    let detail = `Request failed: ${response.status}`;
    try {
      const data = (await response.json()) as { detail?: string };
      if (data.detail) {
        detail = data.detail;
      }
    } catch {
      // Ignore parse errors and keep generic message.
    }
    throw new ApiError(detail, response.status);
  }
  return (await response.json()) as T;
}
