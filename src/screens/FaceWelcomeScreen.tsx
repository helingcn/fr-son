import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLogo } from '../components/AppLogo';
import { BrandBackdrop } from '../components/BrandBackdrop';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuthStore } from '../store/authStore';
import { colors, spacing } from '../theme';

export function FaceWelcomeScreen() {
  const user = useAuthStore(state => state.user);
  const dismissFaceWelcome = useAuthStore(state => state.dismissFaceWelcome);
  const fullName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : undefined;

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <BrandBackdrop />
      <View style={styles.content}>
        <AppLogo />
        <View style={styles.successIcon}>
          <Text style={styles.checkmark}>✓</Text>
        </View>
        <View style={styles.copy}>
          <Text accessibilityRole="header" style={styles.title}>
            Hoş geldiniz{fullName ? `,\n${fullName}` : ''}
          </Text>
          <Text style={styles.description}>
            Yüzünüz başarıyla doğrulandı. Hesabınız güvenle hazır.
          </Text>
        </View>
        <View style={styles.action}>
          <PrimaryButton label="Devam et" onPress={dismissFaceWelcome} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  successIcon: {
    width: 64,
    height: 64,
    marginTop: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: '#DCFAE6',
  },
  checkmark: {
    color: '#079455',
    fontSize: 32,
    fontWeight: '800',
  },
  copy: {
    maxWidth: 420,
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 42,
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
  },
  action: {
    width: '100%',
    maxWidth: 360,
    marginTop: spacing.md,
  },
});
