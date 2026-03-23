import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthSession, OnboardingPayload } from './types';

const PROFILE_ID_KEY = 'money-biz/profile-id';
const PAYLOAD_KEY = 'money-biz/onboarding-payload';
const AUTH_SESSION_KEY = 'money-biz/auth-session';

export async function saveLocalProfile(payload: OnboardingPayload, profileId: string | null) {
  const entries: [string, string][] = [[PAYLOAD_KEY, JSON.stringify(payload)]];
  entries.push([PROFILE_ID_KEY, profileId ?? '']);
  await AsyncStorage.multiSet(entries);
}

export async function readLocalProfile() {
  const [[, payloadRaw], [, profileIdRaw]] = await AsyncStorage.multiGet([PAYLOAD_KEY, PROFILE_ID_KEY]);
  let payload: OnboardingPayload | null = null;
  if (payloadRaw) {
    try {
      payload = JSON.parse(payloadRaw) as OnboardingPayload;
    } catch {
      payload = null;
    }
  }
  const profileId = profileIdRaw || null;

  return { payload, profileId };
}

export async function clearLocalProfile() {
  await AsyncStorage.multiRemove([PAYLOAD_KEY, PROFILE_ID_KEY]);
}


export async function saveAuthSession(session: AuthSession) {
  await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}


export async function readAuthSession() {
  const raw = await AsyncStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}


export async function clearAuthSession() {
  await AsyncStorage.removeItem(AUTH_SESSION_KEY);
}
