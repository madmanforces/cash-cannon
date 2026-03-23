import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AuthUser, BillingPlan, PlanId } from '../types';

type AccountScreenProps = {
  user: AuthUser;
  plans: BillingPlan[];
  notice: string | null;
  billingLoading: boolean;
  onBack: () => void;
  onSelectPlan: (planId: PlanId) => void;
  onLogout: () => void;
};

export function AccountScreen({
  user,
  plans,
  notice,
  billingLoading,
  onBack,
  onSelectPlan,
  onLogout,
}: AccountScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>ACCOUNT</Text>
        <Text style={styles.title}>{user.fullName}</Text>
        <Text style={styles.subtitle}>{user.email}</Text>
        <View style={styles.badgeRow}>
          <Text style={styles.badge}>{user.planId.toUpperCase()}</Text>
          <Text style={styles.badgeMuted}>{user.billingStatus}</Text>
        </View>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Plans</Text>
        {plans.map((plan) => {
          const selected = plan.id === user.planId;
          return (
            <View key={plan.id} style={[styles.planCard, selected ? styles.planCardSelected : undefined]}>
              <View style={styles.planHeader}>
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planPrice}>
                    {plan.priceMonthlyKrw === 0 ? 'Free' : `KRW ${plan.priceMonthlyKrw.toLocaleString('ko-KR')}/mo`}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onSelectPlan(plan.id)}
                  style={[styles.planButton, selected ? styles.planButtonSelected : styles.planButtonIdle]}
                  disabled={billingLoading}
                >
                  <Text style={[styles.planButtonText, selected ? styles.planButtonTextSelected : styles.planButtonTextIdle]}>
                    {billingLoading ? '...' : selected ? 'Current' : 'Choose'}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.planDescription}>{plan.description}</Text>
              {plan.features.map((feature) => (
                <Text key={`${plan.id}-${feature}`} style={styles.planFeature}>
                  {feature}
                </Text>
              ))}
            </View>
          );
        })}
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={onBack} style={[styles.actionButton, styles.secondaryButton]}>
          <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Back</Text>
        </Pressable>
        <Pressable onPress={onLogout} style={[styles.actionButton, styles.ghostButton]}>
          <Text style={[styles.actionButtonText, styles.ghostButtonText]}>Log out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  hero: {
    marginTop: 10,
    padding: 22,
    borderRadius: 28,
    backgroundColor: 'rgba(247, 241, 232, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  kicker: {
    color: '#9bf3d0',
    fontSize: 12,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  title: {
    marginTop: 14,
    color: '#f6efe2',
    fontSize: 34,
    lineHeight: 40,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  subtitle: {
    marginTop: 8,
    color: '#d5dfeb',
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  badge: {
    backgroundColor: '#ff8e63',
    color: '#07111f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  badgeMuted: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#f6efe2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  notice: {
    marginTop: 14,
    color: '#ffbe9f',
    lineHeight: 20,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  panel: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#f7f1e8',
  },
  sectionTitle: {
    color: '#07111f',
    fontSize: 22,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  planCard: {
    marginTop: 14,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#fff8ef',
  },
  planCardSelected: {
    borderWidth: 2,
    borderColor: '#07111f',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  planName: {
    color: '#07111f',
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  planPrice: {
    marginTop: 4,
    color: '#415066',
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  planDescription: {
    marginTop: 12,
    color: '#223042',
    lineHeight: 21,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  planFeature: {
    marginTop: 8,
    color: '#223042',
    lineHeight: 20,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  planButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  planButtonSelected: {
    backgroundColor: '#07111f',
  },
  planButtonIdle: {
    backgroundColor: '#ff8e63',
  },
  planButtonText: {
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  planButtonTextSelected: {
    color: '#f7f1e8',
  },
  planButtonTextIdle: {
    color: '#07111f',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  secondaryButton: {
    backgroundColor: '#ff8e63',
  },
  ghostButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  actionButtonText: {
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  secondaryButtonText: {
    color: '#07111f',
  },
  ghostButtonText: {
    color: '#f6efe2',
  },
});
