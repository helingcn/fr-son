import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenPlaceholder } from '../components/ScreenPlaceholder';
import { TextButton } from '../components/TextButton';
import { FACE_CONSENT_COPY } from '../features/faceEnrollment/consent';
import { useAuthStore } from '../store/authStore';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'FaceConsent'>;

export function FaceConsentScreen({ navigation, route }: Props) {
  const completeFaceChoice = useAuthStore(state => state.completeFaceChoice);
  const [hasConsent, setHasConsent] = useState(false);
  const isReplacement = route.params.mode === 'replace';

  function skipConsent() {
    if (isReplacement) {
      navigation.popTo('Settings');
    } else {
      completeFaceChoice();
    }
  }

  return (
    <ScreenPlaceholder
      title="Yüz ile hızlı giriş"
      description="Bu özellik isteğe bağlıdır ve dilediğiniz zaman kapatılabilir."
    >
      <View style={styles.notice}>
        <Text style={styles.draftLabel}>{FACE_CONSENT_COPY.draftLabel}</Text>
        <Text style={styles.noticeText}>{FACE_CONSENT_COPY.notice}</Text>
      </View>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: hasConsent }}
        onPress={() => setHasConsent(value => !value)}
        style={styles.consentRow}
      >
        <View style={[styles.checkbox, hasConsent && styles.checkboxChecked]}>
          {hasConsent ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
        <Text style={styles.consentText}>{FACE_CONSENT_COPY.checkbox}</Text>
      </Pressable>
      <PrimaryButton
        disabled={!hasConsent}
        label="Onayla ve kamerayı aç"
        onPress={() =>
          navigation.navigate('FaceEnrollment', {
            mode: route.params.mode,
            consentVersion: FACE_CONSENT_COPY.version,
            consentAcceptedAt: new Date().toISOString(),
          })
        }
      />
      <TextButton
        label={isReplacement ? 'Vazgeç' : 'Şimdilik atla'}
        onPress={skipConsent}
      />
      <Text style={styles.version}>
        Metin sürümü: {FACE_CONSENT_COPY.version}
      </Text>
    </ScreenPlaceholder>
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
  version: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
});
