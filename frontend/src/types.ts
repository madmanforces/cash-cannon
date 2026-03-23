export type BusinessType = 'online_seller' | 'reservation' | 'creator';
export type SalesChannel = 'smart_store' | 'instagram' | 'open_market' | 'kakao' | 'offline';
export type Tone = 'bold' | 'warm' | 'concise';
export type PlanId = 'free' | 'pro' | 'team';

export type OnboardingPayload = {
  profile: {
    business_name: string;
    business_type: BusinessType;
    channels: SalesChannel[];
    monthly_goal: number;
    average_order_value: number;
    repeat_customer_rate: number;
  };
  snapshot: {
    weekly_revenue: number;
    weekly_orders: number;
    ad_cost: number;
    coupon_cost: number;
    trend_delta: number;
  };
};

export type OnboardingFormState = {
  businessName: string;
  businessType: BusinessType;
  channels: SalesChannel[];
  monthlyGoal: string;
  averageOrderValue: string;
  repeatCustomerRate: string;
  weeklyRevenue: string;
  weeklyOrders: string;
  adCost: string;
  couponCost: string;
  trendDelta: string;
};

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

export type RecommendationHistoryItem = {
  id: number;
  focus: string;
  createdAt: string;
  actionTitles: string[];
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
  history: RecommendationHistoryItem[];
  profile: {
    businessName: string;
    businessType: BusinessType;
    monthlyGoal: number;
    repeatCustomerRate: number;
    channels: SalesChannel[];
  };
  snapshot: {
    weeklyRevenue: number;
    weeklyOrders: number;
    trendDelta: number;
  };
};

export type SavedProfileRecord = {
  profileId: string | null;
  payload: OnboardingPayload;
  source: 'api' | 'local';
};

export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
  planId: PlanId;
  billingStatus: string;
  renewalDate: string | null;
};

export type AuthSession = {
  sessionToken: string;
  user: AuthUser;
};

export type BillingPlan = {
  id: PlanId;
  name: string;
  priceMonthlyKrw: number;
  description: string;
  features: string[];
};

export type BillingCheckoutStatus = 'pending' | 'completed' | 'canceled' | 'expired';

export type BillingCheckoutSession = {
  sessionId: string;
  provider: string;
  planId: PlanId;
  status: BillingCheckoutStatus | string;
  checkoutUrl: string | null;
  createdAt: string | null;
  completedAt: string | null;
};
