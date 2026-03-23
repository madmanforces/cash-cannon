import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { startTransition, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loadDashboard, type DashboardData } from './src/api';
import { mockDashboard } from './src/mockData';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  const [dashboard, setDashboard] = useState<DashboardData>(mockDashboard);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function hydrateDashboard() {
    const next = await loadDashboard();
    startTransition(() => {
      setDashboard(next);
      setLoading(false);
      setRefreshing(false);
    });
  }

  useEffect(() => {
    hydrateDashboard();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <LinearGradient colors={['#07111f', '#102543', '#18335b']} style={styles.shell}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                hydrateDashboard();
              }}
              tintColor="#f6efe2"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroHeader}>
              <Text style={styles.kicker}>MONEY BIZ</Text>
              <View style={styles.badges}>
                <Text style={styles.badge}>{dashboard.focus}</Text>
                <Text style={styles.badgeMuted}>
                  {dashboard.source === 'api' ? 'Live API' : 'Demo Fallback'}
                </Text>
              </View>
            </View>
            <Text style={styles.title}>오늘 바로 매출에 연결되는 액션만 남겼습니다.</Text>
            <Text style={styles.subtitle}>
              소상공인과 1인 사업자를 위한 매출 실행 코치. 분석보다 실행을 먼저 보여주는 대시보드입니다.
            </Text>

            <View style={styles.metricRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Weekly Revenue</Text>
                <Text style={styles.metricValue}>KRW {formatCurrency(dashboard.snapshot.weeklyRevenue)}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Repeat Rate</Text>
                <Text style={styles.metricValue}>{Math.round(dashboard.profile.repeatCustomerRate * 100)}%</Text>
              </View>
            </View>

            <View style={styles.metricRow}>
              <View style={[styles.metricCard, styles.metricCardLarge]}>
                <Text style={styles.metricLabel}>Goal Gap</Text>
                <Text style={styles.metricValue}>
                  KRW {formatCurrency(dashboard.profile.monthlyGoal - dashboard.snapshot.weeklyRevenue * 4)}
                </Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Connection</Text>
                <Text style={styles.metricValue}>{dashboard.apiHealth.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today&apos;s 3 Actions</Text>
            <Text style={styles.sectionCopy}>실행 우선순위와 이유를 함께 제공합니다.</Text>
          </View>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color="#ff8e63" />
              <Text style={styles.loadingText}>대시보드를 불러오는 중입니다.</Text>
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
              <Text style={styles.panelTitle}>손익분기와 권장 가격을 같이 봅니다.</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Net Profit</Text>
                <Text style={styles.statValue}>KRW {formatCurrency(dashboard.margin.netProfit)}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Margin Rate</Text>
                <Text style={styles.statValue}>{(dashboard.margin.marginRate * 100).toFixed(1)}%</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Suggested Price</Text>
                <Text style={styles.statValue}>KRW {formatCurrency(dashboard.margin.suggestedPrice)}</Text>
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelKicker}>Copy Studio</Text>
              <Text style={styles.panelTitle}>채널 맞춤 카피를 바로 붙여 넣을 수 있습니다.</Text>
              {dashboard.copies.slice(0, 2).map((copy) => (
                <View key={copy.headline} style={styles.copyCard}>
                  <Text style={styles.copyHeadline}>{copy.headline}</Text>
                  <Text style={styles.copyBody}>{copy.body}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.footerCard}>
            <Text style={styles.footerTitle}>현재 연결 상태</Text>
            <Text style={styles.footerCopy}>
              API base URL: {dashboard.apiBaseUrl}
            </Text>
            <Text style={styles.footerCopy}>마지막 동기화: {dashboard.syncedAt}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
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
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    fontSize: 34,
    lineHeight: 40,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  subtitle: {
    marginTop: 12,
    color: '#d7dfeb',
    fontSize: 15,
    lineHeight: 23,
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
  metricCardLarge: {
    flex: 1.5,
  },
  metricLabel: {
    color: '#9eb5cf',
    fontSize: 12,
    fontFamily: 'SpaceGrotesk_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  metricValue: {
    color: '#f6efe2',
    fontSize: 18,
    lineHeight: 24,
    marginTop: 10,
    fontFamily: 'SpaceGrotesk_700Bold',
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
    color: '#a7b7ca',
    marginTop: 6,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    padding: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
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
    textTransform: 'uppercase',
    letterSpacing: 1.1,
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
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  copyHeadline: {
    color: '#ffbe9f',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
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
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
