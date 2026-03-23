import type { DashboardData, OnboardingFormState, OnboardingPayload, SalesChannel } from './types';

export const defaultOnboardingPayload: OnboardingPayload = {
  profile: {
    business_name: 'Money Biz Demo',
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

export const defaultFormState = payloadToFormState(defaultOnboardingPayload);

export function payloadToFormState(payload: OnboardingPayload): OnboardingFormState {
  return {
    businessName: payload.profile.business_name,
    businessType: payload.profile.business_type,
    channels: payload.profile.channels,
    monthlyGoal: String(payload.profile.monthly_goal),
    averageOrderValue: String(payload.profile.average_order_value),
    repeatCustomerRate: String(Math.round(payload.profile.repeat_customer_rate * 100)),
    weeklyRevenue: String(payload.snapshot.weekly_revenue),
    weeklyOrders: String(payload.snapshot.weekly_orders),
    adCost: String(payload.snapshot.ad_cost),
    couponCost: String(payload.snapshot.coupon_cost),
    trendDelta: String(Math.round(payload.snapshot.trend_delta * 100)),
  };
}

export function formStateToPayload(form: OnboardingFormState): {
  payload: OnboardingPayload | null;
  error: string | null;
} {
  const businessName = form.businessName.trim();
  if (businessName.length < 2) {
    return { payload: null, error: 'Business name must be at least 2 characters.' };
  }

  if (form.channels.length === 0) {
    return { payload: null, error: 'Select at least one sales channel.' };
  }

  const monthlyGoal = parseInteger(form.monthlyGoal);
  const averageOrderValue = parseInteger(form.averageOrderValue);
  const weeklyRevenue = parseInteger(form.weeklyRevenue, true);
  const weeklyOrders = parseInteger(form.weeklyOrders, true);
  const adCost = parseInteger(form.adCost, true);
  const couponCost = parseInteger(form.couponCost, true);
  const repeatCustomerRate = parsePercentage(form.repeatCustomerRate);
  const trendDelta = parsePercentage(form.trendDelta, -100, 500);

  if (monthlyGoal <= 0) {
    return { payload: null, error: 'Monthly goal must be greater than 0.' };
  }

  if (averageOrderValue <= 0) {
    return { payload: null, error: 'Average order value must be greater than 0.' };
  }

  if (repeatCustomerRate === null) {
    return { payload: null, error: 'Repeat purchase rate must be between 0 and 100.' };
  }

  if (trendDelta === null) {
    return { payload: null, error: 'Trend delta must be between -100 and 500.' };
  }

  return {
    payload: {
      profile: {
        business_name: businessName,
        business_type: form.businessType,
        channels: form.channels,
        monthly_goal: monthlyGoal,
        average_order_value: averageOrderValue,
        repeat_customer_rate: repeatCustomerRate / 100,
      },
      snapshot: {
        weekly_revenue: weeklyRevenue,
        weekly_orders: weeklyOrders,
        ad_cost: adCost,
        coupon_cost: couponCost,
        trend_delta: trendDelta / 100,
      },
    },
    error: null,
  };
}

export function buildMockDashboard(payload: OnboardingPayload, apiBaseUrl: string): DashboardData {
  const focus =
    payload.snapshot.trend_delta < 0
      ? 'Recovery mode'
      : payload.profile.repeat_customer_rate < 0.3
        ? 'Retention mode'
        : 'Growth mode';

  return {
    source: 'mock',
    apiHealth: 'offline',
    apiBaseUrl,
    syncedAt: `${new Date().toLocaleString('ko-KR')} (local cache)`,
    focus,
    actions: buildFallbackActions(payload),
    margin: buildFallbackMargin(payload),
    copies: buildFallbackCopy(payload),
    history: [],
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
}

function buildFallbackActions(payload: OnboardingPayload) {
  const items = [];

  if (payload.snapshot.trend_delta < 0) {
    items.push({
      title: 'Launch a fast recovery offer',
      reason: 'Weekly revenue is down, so this week needs a visible campaign reset.',
      expectedImpact: 'More near-term demand and faster inquiry recovery',
      checklist: [
        'Keep the base price and reframe the offer as a bundle',
        'Publish one campaign asset on the strongest channel today',
        'Check response after 24 hours and sharpen the hook',
      ],
    });
  }

  if (payload.profile.repeat_customer_rate < 0.3) {
    items.push({
      title: 'Reactivate recent buyers',
      reason: 'Repeat purchase is weak, so retention is the cheapest revenue lever.',
      expectedImpact: 'Higher repeat revenue without adding more ad spend',
      checklist: [
        'Segment customers who purchased in the last 30 days',
        'Send a short thank-you message with one incentive',
        'Track click or reply rate by channel',
      ],
    });
  }

  items.push({
    title: 'Tighten the margin structure',
    reason: 'Ad and coupon costs should not grow faster than weekly revenue.',
    expectedImpact: 'More stable contribution margin across each order',
    checklist: [
      'Move discounts from all users to selected segments',
      'Pause one low-efficiency ad placement',
      'Test a higher-ticket bundle against the base offer',
    ],
  });

  return items.slice(0, 3);
}

function buildFallbackMargin(payload: OnboardingPayload) {
  const salePrice = payload.profile.average_order_value;
  const cost = Math.round(salePrice * 0.38);
  const feeRate = inferFeeRate(payload.profile.channels);
  const perOrderAdCost = payload.snapshot.weekly_orders
    ? Math.round(payload.snapshot.ad_cost / payload.snapshot.weekly_orders)
    : 0;
  const perOrderCouponCost = payload.snapshot.weekly_orders
    ? Math.round(payload.snapshot.coupon_cost / payload.snapshot.weekly_orders)
    : 0;
  const netProfit =
    salePrice - cost - Math.round(salePrice * feeRate) - perOrderAdCost - perOrderCouponCost;

  return {
    netProfit,
    marginRate: Number((netProfit / Math.max(salePrice, 1)).toFixed(4)),
    breakEvenOrders: Math.max(Math.ceil(100000 / Math.max(netProfit, 1)), 0),
    suggestedPrice: netProfit < salePrice * 0.22 ? Math.round(salePrice * 1.08) : salePrice,
  };
}

function buildFallbackCopy(payload: OnboardingPayload) {
  const primaryChannel = labelForChannel(payload.profile.channels[0] ?? 'instagram');
  return [
    {
      headline: `${payload.profile.business_name} | win back repeat buyers`,
      body: `Lead with one customer benefit and publish it first on ${primaryChannel}. Keep the call to action direct.`,
    },
    {
      headline: 'Turn this week into a stronger revenue cycle',
      body: 'Show the offer in the first line, keep the body short, and make the next step obvious.',
    },
    {
      headline: 'Protect margin before chasing more traffic',
      body: 'Frame the message around value, not discount depth, and use urgency sparingly.',
    },
  ];
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

function labelForChannel(channel: SalesChannel) {
  const labels: Record<SalesChannel, string> = {
    smart_store: 'Smart Store',
    instagram: 'Instagram',
    open_market: 'Open Market',
    kakao: 'Kakao',
    offline: 'Offline',
  };
  return labels[channel];
}

function parseInteger(value: string, allowZero = false) {
  const normalized = Number.parseInt(value.replace(/[^\d-]/g, ''), 10);
  if (Number.isNaN(normalized)) {
    return allowZero ? 0 : -1;
  }
  if (!allowZero && normalized <= 0) {
    return -1;
  }
  return Math.max(normalized, 0);
}

function parsePercentage(value: string, min = 0, max = 100) {
  const normalized = Number.parseFloat(value.replace(/[^\d.-]/g, ''));
  if (Number.isNaN(normalized) || normalized < min || normalized > max) {
    return null;
  }
  return normalized;
}
