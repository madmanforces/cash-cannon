import AsyncStorage from '@react-native-async-storage/async-storage';

import type { OnboardingPayload } from './types';

const PROFILE_ID_KEY = 'money-biz/profile-id';
const PAYLOAD_KEY = 'money-biz/onboarding-payload';

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
