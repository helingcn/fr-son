import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandBackdrop } from '../components/BrandBackdrop';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuthStore } from '../store/authStore';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const user = useAuthStore(state => state.user);
  const signOut = useAuthStore(state => state.signOut);
  const firstName = toTitleCase(user?.firstName ?? '');
  const fullName = toTitleCase(
    user ? `${user.firstName} ${user.lastName}` : '',
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <BrandBackdrop />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View
            accessibilityLabel="Giriş başarılı"
            accessibilityRole="image"
            style={styles.successIcon}
          >
            <View style={styles.checkShort} />
            <View style={styles.checkLong} />
          </View>

          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>
              Hoş geldin{firstName ? `, ${firstName}` : ''}
            </Text>
            {fullName ? <Text style={styles.fullName}>{fullName}</Text> : null}
            {user?.email ? (
              <Text style={styles.email}>{user.email}</Text>
            ) : null}
          </View>

          <View style={styles.sessionCard}>
            <View style={styles.sessionIcon}>
              <View style={styles.shieldCheckShort} />
              <View style={styles.shieldCheckLong} />
            </View>
            <View style={styles.sessionContent}>
              <Text style={styles.sessionTitle}>
                Oturumunuz güvenli şekilde açıldı
              </Text>
              <Text style={styles.sessionStatus}>Güvenli oturum · Aktif</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              label="Ayarlar"
              leadingIcon={<GearIcon />}
              onPress={() => navigation.navigate('Settings')}
            />
            <Pressable
              accessibilityRole="button"
              onPress={signOut}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryButtonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Giriş ekranına dön</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function GearIcon() {
  return (
    <Text accessibilityElementsHidden style={styles.gearIcon}>
      ⚙︎
    </Text>
  );
}

function toTitleCase(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => {
      const lower = word.toLocaleLowerCase('tr-TR');
      return `${lower.charAt(0).toLocaleUpperCase('tr-TR')}${lower.slice(1)}`;
    })
    .join(' ');
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: spacing.lg,
  },
  successIcon: {
    width: 72,
    height: 72,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 7,
  },
  checkShort: {
    position: 'absolute',
    width: 16,
    height: 5,
    left: 19,
    top: 38,
    borderRadius: 3,
    backgroundColor: colors.surface,
    transform: [{ rotate: '45deg' }],
  },
  checkLong: {
    position: 'absolute',
    width: 31,
    height: 5,
    left: 29,
    top: 33,
    borderRadius: 3,
    backgroundColor: colors.surface,
    transform: [{ rotate: '-45deg' }],
  },
  heading: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  fullName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  email: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: '#ABEFC6',
    borderRadius: 16,
    padding: spacing.md,
    backgroundColor: '#ECFDF3',
  },
  sessionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#D1FADF',
  },
  shieldCheckShort: {
    position: 'absolute',
    width: 8,
    height: 3,
    left: 11,
    top: 21,
    borderRadius: 2,
    backgroundColor: '#039855',
    transform: [{ rotate: '45deg' }],
  },
  shieldCheckLong: {
    position: 'absolute',
    width: 16,
    height: 3,
    left: 16,
    top: 18,
    borderRadius: 2,
    backgroundColor: '#039855',
    transform: [{ rotate: '-45deg' }],
  },
  sessionContent: {
    flex: 1,
    gap: spacing.xs,
  },
  sessionTitle: {
    color: '#05603A',
    fontSize: 15,
    fontWeight: '700',
  },
  sessionStatus: {
    color: '#027A48',
    fontSize: 13,
  },
  actions: {
    gap: spacing.sm,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  secondaryButtonPressed: {
    backgroundColor: '#EFF4FF',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  gearIcon: {
    color: colors.surface,
    fontSize: 21,
    lineHeight: 23,
    fontWeight: '700',
  },
});
