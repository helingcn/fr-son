import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthScreenLayout } from '../components/AuthScreenLayout';
import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { TextButton } from '../components/TextButton';
import { FACE_CONSENT_COPY } from '../features/faceEnrollment/consent';
import { AuthError, authService } from '../services/auth';
import { useAuthStore } from '../store/authStore';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../types/navigation';
import {
  hasFormErrors,
  validateRegisterForm,
  type RegisterFormErrors,
} from '../utils/authValidation';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const beginRegistrationFace = useAuthStore(
    state => state.beginRegistrationFace,
  );
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasFaceConsent, setHasFaceConsent] = useState(false);
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [submitError, setSubmitError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister() {
    const validationErrors = validateRegisterForm(
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
    );
    setErrors(validationErrors);
    setSubmitError(undefined);

    if (hasFormErrors(validationErrors) || !hasFaceConsent) {
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await authService.register({
        firstName,
        lastName,
        email,
        password,
      });
      beginRegistrationFace(user, new Date().toISOString());
    } catch (error) {
      setSubmitError(
        error instanceof AuthError
          ? error.message
          : 'Hesap oluşturulamadı. Lütfen tekrar deneyin.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreenLayout
      title="Kayıt ol · 1/2"
      description="Hesap bilgilerinizi girin ve zorunlu yüz taraması için onay verin."
    >
      <FormField
        autoCapitalize="words"
        autoComplete="given-name"
        error={errors.firstName}
        icon="Aa"
        label="Ad"
        onChangeText={value => {
          setFirstName(value);
          setErrors(current => ({ ...current, firstName: undefined }));
        }}
        placeholder="Adınız"
        returnKeyType="next"
        textContentType="givenName"
        value={firstName}
      />
      <FormField
        autoCapitalize="words"
        autoComplete="family-name"
        error={errors.lastName}
        icon="Aa"
        label="Soyad"
        onChangeText={value => {
          setLastName(value);
          setErrors(current => ({ ...current, lastName: undefined }));
        }}
        placeholder="Soyadınız"
        returnKeyType="next"
        textContentType="familyName"
        value={lastName}
      />
      <FormField
        autoCapitalize="none"
        autoComplete="email"
        error={errors.email}
        inputMode="email"
        icon="@"
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
        autoComplete="new-password"
        error={errors.password}
        icon="••"
        label="Şifre"
        onChangeText={value => {
          setPassword(value);
          setErrors(current => ({ ...current, password: undefined }));
        }}
        placeholder="En az 8 karakter, harf ve rakam"
        returnKeyType="next"
        secureTextEntry
        textContentType="newPassword"
        value={password}
      />
      <FormField
        autoCapitalize="none"
        autoComplete="new-password"
        error={errors.confirmPassword}
        icon="✓"
        label="Şifre tekrarı"
        onChangeText={value => {
          setConfirmPassword(value);
          setErrors(current => ({
            ...current,
            confirmPassword: undefined,
          }));
        }}
        onSubmitEditing={handleRegister}
        placeholder="Şifrenizi tekrar girin"
        returnKeyType="done"
        secureTextEntry
        textContentType="newPassword"
        value={confirmPassword}
      />
      <View style={styles.notice}>
        <Text style={styles.draftLabel}>{FACE_CONSENT_COPY.draftLabel}</Text>
        <Text style={styles.noticeText}>
          {FACE_CONSENT_COPY.notice} Bu iki aşamalı kayıt işlemini tamamlamak
          için yüz taraması zorunludur.
        </Text>
      </View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: hasFaceConsent }}
        disabled={isSubmitting}
        onPress={() => setHasFaceConsent(value => !value)}
        style={styles.consentRow}
      >
        <View
          style={[styles.checkbox, hasFaceConsent && styles.checkboxChecked]}
        >
          {hasFaceConsent ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <Text style={styles.consentText}>{FACE_CONSENT_COPY.checkbox}</Text>
      </Pressable>
      {submitError ? (
        <Text accessibilityLiveRegion="polite" style={styles.submitError}>
          {submitError}
        </Text>
      ) : null}
      <PrimaryButton
        disabled={!hasFaceConsent}
        label="Devam et: Yüz taraması"
        loading={isSubmitting}
        onPress={handleRegister}
      />
      <TextButton
        disabled={isSubmitting}
        label="Zaten hesabım var"
        onPress={() => navigation.popTo('Login')}
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  notice: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  draftLabel: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '700',
  },
  noticeText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  consentRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 6,
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkmark: {
    color: colors.surface,
    fontWeight: '700',
  },
  consentText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  submitError: {
    color: colors.error,
    fontSize: 15,
  },
});
