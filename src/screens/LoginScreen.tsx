import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthScreenLayout } from '../components/AuthScreenLayout';
import { FaceLoginButton } from '../components/FaceLoginButton';
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
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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
      compact
      title="Giriş yap"
      description="Hesabınıza e-posta ve şifrenizle güvenli şekilde erişin."
    >
      <FormField
        autoCapitalize="none"
        autoComplete="email"
        error={errors.email}
        inputMode="email"
        keyboardType="email-address"
        icon="@"
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
        icon="••"
        label="Şifre"
        onChangeText={value => {
          setPassword(value);
          setErrors(current => ({ ...current, password: undefined }));
        }}
        onSubmitEditing={handleLogin}
        placeholder="En az 8 karakter"
        rightAccessory={
          <Pressable
            accessibilityLabel={
              isPasswordVisible ? 'Şifreyi gizle' : 'Şifreyi göster'
            }
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setIsPasswordVisible(current => !current)}
            style={({ pressed }) => [
              styles.visibilityButton,
              pressed && styles.visibilityButtonPressed,
            ]}
          >
            <View style={styles.eyeIcon}>
              <View style={styles.pupil} />
              {!isPasswordVisible ? <View style={styles.eyeSlash} /> : null}
            </View>
          </Pressable>
        }
        returnKeyType="done"
        secureTextEntry={!isPasswordVisible}
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
        <FaceLoginButton
          disabled={isSubmitting}
          onPress={() => navigation.navigate('FaceVerification')}
        />
        <View style={styles.registerRow}>
          <Text style={styles.secondaryText}>Hesabınız yok mu?</Text>
          <TextButton
            disabled={isSubmitting}
            label="Kayıt oluştur"
            onPress={() => navigation.navigate('Register')}
          />
        </View>
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
    gap: spacing.sm,
  },
  registerRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  visibilityButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  visibilityButtonPressed: {
    backgroundColor: '#EFF4FF',
  },
  eyeIcon: {
    width: 22,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.8,
    borderColor: colors.primary,
    borderRadius: 11,
  },
  pupil: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  eyeSlash: {
    position: 'absolute',
    width: 25,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primary,
    transform: [{ rotate: '-42deg' }],
  },
});
