import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { BusinessType, OnboardingFormState, SalesChannel } from '../types';

type OnboardingScreenProps = {
  form: OnboardingFormState;
  notice: string | null;
  saving: boolean;
  hasSavedProfile: boolean;
  onChange: <K extends keyof OnboardingFormState>(field: K, value: OnboardingFormState[K]) => void;
  onToggleChannel: (channel: SalesChannel) => void;
  onSubmit: () => void;
};

const businessTypeOptions: Array<{ value: BusinessType; label: string }> = [
  { value: 'online_seller', label: 'Online Seller' },
  { value: 'reservation', label: 'Reservation' },
  { value: 'creator', label: 'Creator' },
];

const channelOptions: Array<{ value: SalesChannel; label: string }> = [
  { value: 'smart_store', label: 'Smart Store' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'open_market', label: 'Open Market' },
  { value: 'kakao', label: 'Kakao' },
  { value: 'offline', label: 'Offline' },
];

export function OnboardingScreen({
  form,
  notice,
  saving,
  hasSavedProfile,
  onChange,
  onToggleChannel,
  onSubmit,
}: OnboardingScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>MONEY BIZ</Text>
        <Text style={styles.title}>Capture the business profile before the dashboard.</Text>
        <Text style={styles.subtitle}>
          This screen saves the business context and the latest operating numbers. The dashboard
          uses that saved profile to generate daily revenue actions.
        </Text>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Business Profile</Text>
        <TextInput
          value={form.businessName}
          onChangeText={(value) => onChange('businessName', value)}
          placeholder="Business name"
          placeholderTextColor="#7b8da6"
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>Business type</Text>
        <View style={styles.chipRow}>
          {businessTypeOptions.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => onChange('businessType', option.value)}
              style={[
                styles.chip,
                form.businessType === option.value ? styles.chipActive : styles.chipInactive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  form.businessType === option.value ? styles.chipTextActive : styles.chipTextInactive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Sales channels</Text>
        <View style={styles.chipRow}>
          {channelOptions.map((option) => {
            const selected = form.channels.includes(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => onToggleChannel(option.value)}
                style={[styles.chip, selected ? styles.chipActive : styles.chipInactive]}
              >
                <Text style={[styles.chipText, selected ? styles.chipTextActive : styles.chipTextInactive]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Revenue Targets</Text>
        <Field
          label="Monthly goal (KRW)"
          value={form.monthlyGoal}
          onChangeText={(value) => onChange('monthlyGoal', value)}
        />
        <Field
          label="Average order value (KRW)"
          value={form.averageOrderValue}
          onChangeText={(value) => onChange('averageOrderValue', value)}
        />
        <Field
          label="Repeat purchase rate (%)"
          value={form.repeatCustomerRate}
          onChangeText={(value) => onChange('repeatCustomerRate', value)}
        />
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Latest Weekly Snapshot</Text>
        <Field
          label="Weekly revenue (KRW)"
          value={form.weeklyRevenue}
          onChangeText={(value) => onChange('weeklyRevenue', value)}
        />
        <Field
          label="Weekly orders"
          value={form.weeklyOrders}
          onChangeText={(value) => onChange('weeklyOrders', value)}
        />
        <Field
          label="Weekly ad cost (KRW)"
          value={form.adCost}
          onChangeText={(value) => onChange('adCost', value)}
        />
        <Field
          label="Weekly coupon cost (KRW)"
          value={form.couponCost}
          onChangeText={(value) => onChange('couponCost', value)}
        />
        <Field
          label="Trend delta (%)"
          value={form.trendDelta}
          onChangeText={(value) => onChange('trendDelta', value)}
        />
      </View>

      <Pressable onPress={onSubmit} style={styles.submitButton} disabled={saving}>
        <Text style={styles.submitText}>
          {saving ? 'Saving profile...' : hasSavedProfile ? 'Update profile and dashboard' : 'Save profile and continue'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholder={label}
        placeholderTextColor="#7b8da6"
        style={styles.input}
      />
    </View>
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
    marginTop: 10,
    color: '#d5dfeb',
    lineHeight: 22,
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
  fieldWrap: {
    marginTop: 14,
  },
  fieldLabel: {
    marginTop: 14,
    marginBottom: 8,
    color: '#415066',
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  input: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#fff8ef',
    color: '#07111f',
    fontFamily: 'SpaceGrotesk_500Medium',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: '#07111f',
  },
  chipInactive: {
    backgroundColor: '#fff8ef',
  },
  chipText: {
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  chipTextActive: {
    color: '#f7f1e8',
  },
  chipTextInactive: {
    color: '#223042',
  },
  submitButton: {
    borderRadius: 22,
    backgroundColor: '#ff8e63',
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  submitText: {
    color: '#07111f',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
