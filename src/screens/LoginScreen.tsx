import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuthScreenLayout } from '../components/AuthScreenLayout';
import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextButton } from '../components/TextButton';
import { AuthError, authService } from '../services/auth';
import { faceVerificationAttemptStore } from '../services/storage/FaceVerificationAttemptStore';
import { useAuthStore } from '../store/authStore';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../types/navigation';
import {
  hasFormErrors,
  validateLoginForm,
  type LoginFormErrors,
} from '../utils/authValidation';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const completeLogin = useAuthStore(state => state.completeLogin);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [submitError, setSubmitError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    const validationErrors = validateLoginForm(email, password);
    setErrors(validationErrors);
    setSubmitError(undefined);

    if (hasFormErrors(validationErrors)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await authService.login({ email, password });
      await faceVerificationAttemptStore.reset();
      completeLogin(user);
    } catch (error) {
      setSubmitError(
        error instanceof AuthError
          ? error.message
          : 'Giriş yapılamadı. Lütfen tekrar deneyin.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreenLayout
      title="Giriş yap"
      description="Hesabınıza e-posta ve şifrenizle güvenli şekilde erişin."
    >
      <FormField
        autoCapitalize="none"
        autoComplete="email"
        error={errors.email}
        inputMode="email"
        keyboardType="email-address"
        label="E-posta"
        onChangeText={value => {
          setEmail(value);
          setErrors(current => ({ ...current, email: undefined }));
        }}
        placeholder="ornek@eposta.com"
        returnKeyType="next"
        textContentType="emailAddress"
        value={email}
      />
      <FormField
        autoCapitalize="none"
        autoComplete="current-password"
        error={errors.password}
        label="Şifre"
        onChangeText={value => {
          setPassword(value);
          setErrors(current => ({ ...current, password: undefined }));
        }}
        onSubmitEditing={handleLogin}
        placeholder="En az 8 karakter"
        returnKeyType="done"
        secureTextEntry
        textContentType="password"
        value={password}
      />
      {submitError ? (
        <Text accessibilityLiveRegion="polite" style={styles.submitError}>
          {submitError}
        </Text>
      ) : null}
      <PrimaryButton
        label="Giriş yap"
        loading={isSubmitting}
        onPress={handleLogin}
      />
      <View style={styles.actions}>
        <TextButton
          disabled={isSubmitting}
          label="Yüz ile giriş"
          onPress={() => navigation.navigate('FaceVerification')}
        />
        <Text style={styles.secondaryText}>Hesabınız yok mu?</Text>
        <TextButton
          disabled={isSubmitting}
          label="Kayıt oluştur"
          onPress={() => navigation.navigate('Register')}
        />
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  submitError: {
    color: colors.error,
    fontSize: 15,
  },
  actions: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  secondaryText: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: spacing.sm,
  },
});
