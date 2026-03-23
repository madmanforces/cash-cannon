import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { startTransition, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import {
  API_BASE_URL,
  ApiError,
  checkoutPlan,
  fetchBusinessProfile,
  fetchCurrentUser,
  fetchLatestBusinessProfile,
  fetchPlans,
  loadDashboard,
  login,
  logout,
  saveBusinessProfile,
  signUp,
} from './src/api';
import { AccountScreen } from './src/components/AccountScreen';
import { AuthScreen } from './src/components/AuthScreen';
import { DashboardScreen } from './src/components/DashboardScreen';
import { OnboardingScreen } from './src/components/OnboardingScreen';
import {
  buildMockDashboard,
  defaultBillingPlans,
  defaultFormState,
  defaultOnboardingPayload,
  formStateToPayload,
  payloadToFormState,
} from './src/mockData';
import {
  clearAuthSession,
  clearLocalProfile,
  readAuthSession,
  readLocalProfile,
  saveAuthSession,
  saveLocalProfile,
} from './src/storage';
import type {
  AuthUser,
  BillingPlan,
  DashboardData,
  OnboardingFormState,
  SalesChannel,
} from './src/types';

type Screen = 'booting' | 'auth' | 'onboarding' | 'dashboard' | 'account';
type AuthMode = 'login' | 'signup';

function buildPlanHint(planId: string) {
  if (planId === 'free') {
    return 'Free keeps 1 synced profile and the latest 3 recommendation snapshots.';
  }
  if (planId === 'pro') {
    return 'Pro keeps up to 3 synced profiles and 15 recommendation snapshots.';
  }
  return 'Team keeps up to 10 synced profiles and 50 recommendation snapshots.';
}

export default function App() {
  useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  const [screen, setScreen] = useState<Screen>('booting');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>(defaultBillingPlans);
  const [authMode, setAuthMode] = useState<AuthMode>('signup');
  const [authFullName, setAuthFullName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
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
    try {
      const availablePlans = await fetchPlans().catch(() => defaultBillingPlans);
      setPlans(availablePlans);

      const storedSession = await readAuthSession();
      if (!storedSession) {
        setNotice('Create an account to unlock synced profiles and plan management.');
        setScreen('auth');
        return;
      }

      const currentUser = await fetchCurrentUser(storedSession.sessionToken);
      setSessionToken(storedSession.sessionToken);
      setUser(currentUser);
      await saveAuthSession({ sessionToken: storedSession.sessionToken, user: currentUser });

      const local = await readLocalProfile();
      let nextProfileId = local.profileId;
      let payload = local.payload;

      if (!payload) {
        const latest = await fetchLatestBusinessProfile(storedSession.sessionToken);
        if (latest) {
          payload = latest.payload;
          nextProfileId = latest.profileId;
          await saveLocalProfile(latest.payload, latest.profileId);
        }
      } else if (local.profileId) {
        const remote = await fetchBusinessProfile(local.profileId, storedSession.sessionToken);
        if (remote) {
          payload = remote;
        }
      }

      if (!payload) {
        setNotice('Signed in. Add a business profile to start the dashboard.');
        setScreen('onboarding');
        return;
      }

      setForm(payloadToFormState(payload));
      setProfileId(nextProfileId);
      await hydrateDashboard(payload, nextProfileId, storedSession.sessionToken);
      setNotice('Loaded the saved account, business profile, and dashboard.');
      setScreen('dashboard');
    } catch {
      await clearAuthSession();
      setSessionToken(null);
      setUser(null);
      setNotice('Your session could not be restored. Please log in again.');
      setScreen('auth');
    }
  }

  async function hydrateDashboard(
    payload = defaultOnboardingPayload,
    nextProfileId: string | null = profileId,
    nextSessionToken: string | null = sessionToken,
  ) {
    setLoadingDashboard(true);
    const next = await loadDashboard(payload, nextProfileId, nextSessionToken);
    startTransition(() => {
      setDashboard(next);
      setLoadingDashboard(false);
      setRefreshing(false);
    });
  }

  async function handleAuthSubmit() {
    if (!authEmail.trim() || authPassword.length < 8 || (authMode === 'signup' && authFullName.trim().length < 2)) {
      setNotice('Use a valid email and a password with at least 8 characters.');
      return;
    }

    setAuthSubmitting(true);
    try {
      const session =
        authMode === 'signup'
          ? await signUp({ fullName: authFullName.trim(), email: authEmail.trim(), password: authPassword })
          : await login({ email: authEmail.trim(), password: authPassword });

      await saveAuthSession(session);
      setSessionToken(session.sessionToken);
      setUser(session.user);
      setAuthPassword('');
      setNotice(authMode === 'signup' ? 'Account created. Continue with the business profile.' : 'Logged in successfully.');
      setScreen('onboarding');
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : authMode === 'signup' ? 'Could not create the account.' : 'Login failed. Check your credentials.');
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleSave() {
    if (!sessionToken) {
      setNotice('Sign in before saving a business profile.');
      setScreen('auth');
      return;
    }

    const { payload, error } = formStateToPayload(form);
    if (!payload) {
      setNotice(error);
      return;
    }

    setSaving(true);
    try {
      const result = await saveBusinessProfile(payload, profileId, sessionToken);
      await saveLocalProfile(result.payload, result.profileId);
      await hydrateDashboard(result.payload, result.profileId, sessionToken);

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
    } catch (error) {
      setSaving(false);
      setNotice(error instanceof ApiError ? error.message : 'Profile could not be saved.');
    }
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

  async function handlePlanSelect(planId: BillingPlan['id']) {
    if (!sessionToken || !user) {
      return;
    }

    setBillingLoading(true);
    try {
      const updatedUser = await checkoutPlan(sessionToken, planId);
      setUser(updatedUser);
      await saveAuthSession({ sessionToken, user: updatedUser });
      setNotice(`Plan updated to ${updatedUser.planId.toUpperCase()}.`);
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : 'Plan change could not be completed.');
    } finally {
      setBillingLoading(false);
    }
  }

  async function handleLogout() {
    if (sessionToken) {
      try {
        await logout(sessionToken);
      } catch {
        // Ignore and clear local state anyway.
      }
    }

    await clearAuthSession();
    await clearLocalProfile();
    startTransition(() => {
      setSessionToken(null);
      setUser(null);
      setProfileId(null);
      setForm(defaultFormState);
      setDashboard(buildMockDashboard(defaultOnboardingPayload, API_BASE_URL));
      setNotice('Signed out. Create or log into another account.');
      setScreen('auth');
    });
  }

  async function handleReset() {
    await clearLocalProfile();
    startTransition(() => {
      setProfileId(null);
      setForm(defaultFormState);
      setDashboard(buildMockDashboard(defaultOnboardingPayload, API_BASE_URL));
      setNotice('Saved business profile data was cleared for this device.');
      setScreen('onboarding');
    });
  }

  function handleEdit() {
    setScreen('onboarding');
    setNotice('Edit the business profile and save again to refresh the dashboard.');
  }

  function handleAccount() {
    setScreen('account');
    setNotice('Manage account details and switch plans here.');
  }

  function handleAccountBack() {
    setScreen(profileId ? 'dashboard' : 'onboarding');
    setNotice('Returned to the workspace.');
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

  if (screen === 'booting') {
    return (
      <SafeAreaProvider>
        <LinearGradient colors={['#07111f', '#102543', '#18335b']} style={styles.shell}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.bootWrap}>
              <ActivityIndicator color="#ff8e63" />
              <Text style={styles.bootText}>Loading MONEY BIZ workspace...</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <LinearGradient colors={['#07111f', '#102543', '#18335b']} style={styles.shell}>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar style="light" />
          {screen === 'auth' ? (
            <AuthScreen
              mode={authMode}
              fullName={authFullName}
              email={authEmail}
              password={authPassword}
              notice={notice}
              submitting={authSubmitting}
              onModeChange={setAuthMode}
              onFieldChange={(field, value) => {
                if (field === 'fullName') setAuthFullName(value);
                if (field === 'email') setAuthEmail(value);
                if (field === 'password') setAuthPassword(value);
              }}
              onSubmit={handleAuthSubmit}
            />
          ) : screen === 'account' && user ? (
            <AccountScreen
              user={user}
              plans={plans}
              notice={notice}
              billingLoading={billingLoading}
              onBack={handleAccountBack}
              onSelectPlan={handlePlanSelect}
              onLogout={handleLogout}
            />
          ) : screen === 'dashboard' && user ? (
            <DashboardScreen
              dashboard={dashboard}
              planId={user.planId}
              planHint={buildPlanHint(user.planId)}
              loading={loadingDashboard}
              refreshing={refreshing}
              notice={notice}
              onRefresh={handleRefresh}
              onEdit={handleEdit}
              onAccount={handleAccount}
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
    </SafeAreaProvider>
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
  bootText: {
    marginTop: 14,
    color: '#f6efe2',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_500Medium',
  },
});
