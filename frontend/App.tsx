import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { startTransition, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { API_BASE_URL, fetchBusinessProfile, loadDashboard, saveBusinessProfile } from './src/api';
import { DashboardScreen } from './src/components/DashboardScreen';
import { OnboardingScreen } from './src/components/OnboardingScreen';
import {
  buildMockDashboard,
  defaultFormState,
  defaultOnboardingPayload,
  formStateToPayload,
  payloadToFormState,
} from './src/mockData';
import { clearLocalProfile, readLocalProfile, saveLocalProfile } from './src/storage';
import type { DashboardData, OnboardingFormState, SalesChannel } from './src/types';

type Screen = 'booting' | 'onboarding' | 'dashboard';

export default function App() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  const [screen, setScreen] = useState<Screen>('booting');
  const [form, setForm] = useState<OnboardingFormState>(defaultFormState);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData>(() =>
    buildMockDashboard(defaultOnboardingPayload, API_BASE_URL),
  );
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    const local = await readLocalProfile();

    if (!local.payload) {
      setScreen('onboarding');
      return;
    }

    let payload = local.payload;
    if (local.profileId) {
      const remote = await fetchBusinessProfile(local.profileId);
      if (remote) {
        payload = remote;
      }
    }

    setForm(payloadToFormState(payload));
    setProfileId(local.profileId);
    await hydrateDashboard(payload);
    setNotice(local.profileId ? 'Loaded the last saved business profile.' : 'Loaded the local draft profile.');
    setScreen('dashboard');
  }

  async function hydrateDashboard(payload = defaultOnboardingPayload) {
    setLoadingDashboard(true);
    const next = await loadDashboard(payload);
    startTransition(() => {
      setDashboard(next);
      setLoadingDashboard(false);
      setRefreshing(false);
    });
  }

  async function handleSave() {
    const { payload, error } = formStateToPayload(form);

    if (!payload) {
      setNotice(error);
      return;
    }

    setSaving(true);
    const result = await saveBusinessProfile(payload, profileId);
    await saveLocalProfile(result.payload, result.profileId);
    await hydrateDashboard(result.payload);

    startTransition(() => {
      setForm(payloadToFormState(result.payload));
      setProfileId(result.profileId);
      setSaving(false);
      setScreen('dashboard');
      setNotice(
        result.source === 'api'
          ? 'Profile saved and synced with the backend.'
          : 'API unavailable, so the profile was saved locally only.',
      );
    });
  }

  async function handleRefresh() {
    const { payload } = formStateToPayload(form);
    if (!payload) {
      return;
    }
    setRefreshing(true);
    await hydrateDashboard(payload);
    setNotice('Dashboard refreshed from the latest saved profile values.');
  }

  async function handleReset() {
    await clearLocalProfile();
    startTransition(() => {
      setProfileId(null);
      setForm(defaultFormState);
      setDashboard(buildMockDashboard(defaultOnboardingPayload, API_BASE_URL));
      setNotice('Saved onboarding data was cleared on this device.');
      setScreen('onboarding');
    });
  }

  function handleEdit() {
    setScreen('onboarding');
    setNotice('Edit the business profile and save again to refresh the dashboard.');
  }

  function updateField<K extends keyof OnboardingFormState>(field: K, value: OnboardingFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleChannel(channel: SalesChannel) {
    setForm((current) => {
      const exists = current.channels.includes(channel);
      return {
        ...current,
        channels: exists ? current.channels.filter((item) => item !== channel) : [...current.channels, channel],
      };
    });
  }

  if (!fontsLoaded || screen === 'booting') {
    return (
      <LinearGradient colors={['#07111f', '#102543', '#18335b']} style={styles.shell}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.bootWrap}>
            <ActivityIndicator color="#ff8e63" />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#07111f', '#102543', '#18335b']} style={styles.shell}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        {screen === 'dashboard' ? (
          <DashboardScreen
            dashboard={dashboard}
            loading={loadingDashboard}
            refreshing={refreshing}
            notice={notice}
            onRefresh={handleRefresh}
            onEdit={handleEdit}
            onReset={handleReset}
          />
        ) : (
          <OnboardingScreen
            form={form}
            notice={notice}
            saving={saving}
            hasSavedProfile={Boolean(profileId)}
            onChange={updateField}
            onToggleChannel={toggleChannel}
            onSubmit={handleSave}
          />
        )}
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
  bootWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
