import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { DashboardData } from '../types';

type DashboardScreenProps = {
  dashboard: DashboardData;
  loading: boolean;
  refreshing: boolean;
  notice: string | null;
  onRefresh: () => void;
  onEdit: () => void;
  onReset: () => void;
};

export function DashboardScreen({
  dashboard,
  loading,
  refreshing,
  notice,
  onRefresh,
  onEdit,
  onReset,
}: DashboardScreenProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f6efe2" />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <Text style={styles.kicker}>MONEY BIZ</Text>
          <View style={styles.badges}>
            <Text style={styles.badge}>{dashboard.focus}</Text>
            <Text style={styles.badgeMuted}>{dashboard.source === 'api' ? 'Synced API' : 'Local Fallback'}</Text>
          </View>
        </View>

        <Text style={styles.title}>Daily revenue actions for {dashboard.profile.businessName}</Text>
        <Text style={styles.subtitle}>
          This dashboard is driven by the saved onboarding profile. Edit the profile when the business
          context changes, then refresh the action stack.
        </Text>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <View style={styles.metricRow}>
          <Metric label="Weekly Revenue" value={`KRW ${formatCurrency(dashboard.snapshot.weeklyRevenue)}`} />
          <Metric label="Repeat Rate" value={`${Math.round(dashboard.profile.repeatCustomerRate * 100)}%`} />
        </View>

        <View style={styles.metricRow}>
          <Metric
            label="Goal Gap"
            value={`KRW ${formatCurrency(dashboard.profile.monthlyGoal - dashboard.snapshot.weeklyRevenue * 4)}`}
            wide
          />
          <Metric label="Connection" value={dashboard.apiHealth.toUpperCase()} />
        </View>

        <View style={styles.buttonRow}>
          <ActionButton label="Edit profile" onPress={onEdit} variant="secondary" />
          <ActionButton label="Reset data" onPress={onReset} variant="ghost" />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's 3 Actions</Text>
        <Text style={styles.sectionCopy}>The dashboard keeps recommendations tied to the saved profile.</Text>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#ff8e63" />
          <Text style={styles.loadingText}>Refreshing dashboard...</Text>
        </View>
      ) : null}

      {dashboard.actions.map((action, index) => (
        <View key={`${action.title}-${index}`} style={styles.actionCard}>
          <View style={styles.actionHeader}>
            <Text style={styles.actionIndex}>{String(index + 1).padStart(2, '0')}</Text>
            <View style={styles.actionTitleWrap}>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionReason}>{action.reason}</Text>
            </View>
          </View>

          <View style={styles.impactRow}>
            <Text style={styles.impactLabel}>Expected Impact</Text>
            <Text style={styles.impactValue}>{action.expectedImpact}</Text>
          </View>

          <View style={styles.checklist}>
            {action.checklist.map((item) => (
              <View key={item} style={styles.checkItem}>
                <View style={styles.checkDot} />
                <Text style={styles.checkText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.dualGrid}>
        <View style={styles.panel}>
          <Text style={styles.panelKicker}>Margin Guard</Text>
          <Text style={styles.panelTitle}>Unit economics are derived from the saved weekly snapshot.</Text>
          <StatRow label="Net Profit" value={`KRW ${formatCurrency(dashboard.margin.netProfit)}`} />
          <StatRow label="Margin Rate" value={`${(dashboard.margin.marginRate * 100).toFixed(1)}%`} />
          <StatRow label="Suggested Price" value={`KRW ${formatCurrency(dashboard.margin.suggestedPrice)}`} />
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelKicker}>Copy Studio</Text>
          <Text style={styles.panelTitle}>Saved channel data drives the message previews below.</Text>
          {dashboard.copies.slice(0, 2).map((copy) => (
            <View key={copy.headline} style={styles.copyCard}>
              <Text style={styles.copyHeadline}>{copy.headline}</Text>
              <Text style={styles.copyBody}>{copy.body}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Saved profile status</Text>
        <Text style={styles.footerCopy}>API base URL: {dashboard.apiBaseUrl}</Text>
        <Text style={styles.footerCopy}>Last sync: {dashboard.syncedAt}</Text>
      </View>
    </ScrollView>
  );
}

function Metric({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={[styles.metricCard, wide ? styles.metricCardWide : undefined]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  variant,
}: {
  label: string;
  onPress: () => void;
  variant: 'secondary' | 'ghost';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, variant === 'secondary' ? styles.buttonSecondary : styles.buttonGhost]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'secondary' ? styles.buttonTextSecondary : styles.buttonTextGhost,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 18,
  },
  hero: {
    marginTop: 8,
    backgroundColor: 'rgba(247, 241, 232, 0.08)',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroHeader: {
    gap: 12,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kicker: {
    color: '#9bf3d0',
    fontSize: 12,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  badge: {
    backgroundColor: '#ff8e63',
    color: '#07111f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontFamily: 'SpaceGrotesk_700Bold',
    overflow: 'hidden',
  },
  badgeMuted: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#f6efe2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontFamily: 'SpaceGrotesk_500Medium',
    overflow: 'hidden',
  },
  title: {
    marginTop: 18,
    color: '#f6efe2',
    fontSize: 32,
    lineHeight: 38,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  subtitle: {
    marginTop: 12,
    color: '#d7dfeb',
    fontSize: 15,
    lineHeight: 23,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  notice: {
    marginTop: 12,
    color: '#ffbe9f',
    lineHeight: 20,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  metricCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#102543',
  },
  metricCardWide: {
    flex: 1.5,
  },
  metricLabel: {
    color: '#9eb5cf',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  metricValue: {
    color: '#f6efe2',
    fontSize: 18,
    lineHeight: 24,
    marginTop: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  button: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  buttonSecondary: {
    backgroundColor: '#ff8e63',
  },
  buttonGhost: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  buttonText: {
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  buttonTextSecondary: {
    color: '#07111f',
  },
  buttonTextGhost: {
    color: '#f6efe2',
  },
  sectionHeader: {
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: '#f6efe2',
    fontSize: 24,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  sectionCopy: {
    marginTop: 6,
    color: '#a7b7ca',
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    padding: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  loadingText: {
    marginTop: 12,
    color: '#d7dfeb',
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  actionCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: '#f7f1e8',
  },
  actionHeader: {
    flexDirection: 'row',
    gap: 14,
  },
  actionIndex: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#07111f',
    color: '#ff8e63',
    textAlign: 'center',
    lineHeight: 40,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  actionTitleWrap: {
    flex: 1,
  },
  actionTitle: {
    color: '#07111f',
    fontSize: 20,
    lineHeight: 25,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  actionReason: {
    marginTop: 6,
    color: '#415066',
    lineHeight: 21,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  impactRow: {
    marginTop: 16,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#fff8ef',
  },
  impactLabel: {
    color: '#7b5f55',
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  impactValue: {
    color: '#07111f',
    marginTop: 6,
    lineHeight: 21,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  checklist: {
    marginTop: 16,
    gap: 10,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
    backgroundColor: '#9bf3d0',
  },
  checkText: {
    flex: 1,
    color: '#223042',
    lineHeight: 21,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  dualGrid: {
    gap: 16,
  },
  panel: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#102543',
  },
  panelKicker: {
    color: '#9bf3d0',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  panelTitle: {
    color: '#f6efe2',
    fontSize: 22,
    lineHeight: 28,
    marginTop: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statLabel: {
    color: '#a7b7ca',
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  statValue: {
    color: '#f6efe2',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  copyCard: {
    marginTop: 16,
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  copyHeadline: {
    color: '#ffbe9f',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  copyBody: {
    marginTop: 8,
    color: '#e6edf8',
    lineHeight: 21,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  footerCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  footerTitle: {
    color: '#f6efe2',
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  footerCopy: {
    marginTop: 8,
    color: '#d7dfeb',
    lineHeight: 20,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
});
