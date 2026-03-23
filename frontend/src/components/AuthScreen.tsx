import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

type AuthScreenProps = {
  mode: 'login' | 'signup';
  fullName: string;
  email: string;
  password: string;
  notice: string | null;
  submitting: boolean;
  onModeChange: (mode: 'login' | 'signup') => void;
  onFieldChange: (field: 'fullName' | 'email' | 'password', value: string) => void;
  onSubmit: () => void;
};

export function AuthScreen({
  mode,
  fullName,
  email,
  password,
  notice,
  submitting,
  onModeChange,
  onFieldChange,
  onSubmit,
}: AuthScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>MONEY BIZ</Text>
        <Text style={styles.title}>Sign in before saving business data.</Text>
        <Text style={styles.subtitle}>
          Accounts unlock synced business profiles, plan selection, and recommendation history.
        </Text>
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
      </View>

      <View style={styles.panel}>
        <View style={styles.modeRow}>
          <ModeButton label="Sign Up" active={mode === 'signup'} onPress={() => onModeChange('signup')} />
          <ModeButton label="Log In" active={mode === 'login'} onPress={() => onModeChange('login')} />
        </View>

        {mode === 'signup' ? (
          <Field
            label="Full name"
            value={fullName}
            onChangeText={(value) => onFieldChange('fullName', value)}
            placeholder="Your name"
          />
        ) : null}
        <Field
          label="Email"
          value={email}
          onChangeText={(value) => onFieldChange('email', value)}
          placeholder="you@example.com"
          keyboardType="email-address"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={(value) => onFieldChange('password', value)}
          placeholder="At least 8 characters"
          secureTextEntry
        />

        <Pressable onPress={onSubmit} style={styles.submitButton} disabled={submitting}>
          <Text style={styles.submitText}>
            {submitting ? 'Working...' : mode === 'signup' ? 'Create account' : 'Log in'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function ModeButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.modeButton, active ? styles.modeButtonActive : styles.modeButtonIdle]}>
      <Text style={[styles.modeText, active ? styles.modeTextActive : styles.modeTextIdle]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#7b8da6"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
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
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
  },
  modeButtonActive: {
    backgroundColor: '#07111f',
  },
  modeButtonIdle: {
    backgroundColor: '#fff8ef',
  },
  modeText: {
    textAlign: 'center',
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  modeTextActive: {
    color: '#f7f1e8',
  },
  modeTextIdle: {
    color: '#223042',
  },
  fieldWrap: {
    marginTop: 14,
  },
  fieldLabel: {
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
  submitButton: {
    borderRadius: 22,
    backgroundColor: '#ff8e63',
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginTop: 18,
  },
  submitText: {
    color: '#07111f',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
});
