import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { AppLogo } from './AppLogo';
import { BrandBackdrop } from './BrandBackdrop';

type AuthScreenLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
  compact?: boolean;
};

export function AuthScreenLayout({
  title,
  description,
  children,
  compact = false,
}: AuthScreenLayoutProps) {
  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <BrandBackdrop />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            compact && styles.scrollContentCompact,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.content, compact && styles.contentCompact]}>
            <View
              style={[styles.brandHeader, compact && styles.brandHeaderCompact]}
            >
              <AppLogo compact />
              <View style={styles.heading}>
                <Text accessibilityRole="header" style={styles.title}>
                  {title}
                </Text>
                <Text style={styles.description}>{description}</Text>
              </View>
            </View>
            <View style={[styles.card, compact && styles.cardCompact]}>
              {children}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  scrollContentCompact: {
    justifyContent: 'flex-start',
    paddingTop: spacing.lg,
  },
  content: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    gap: spacing.lg,
  },
  contentCompact: {
    gap: spacing.md,
  },
  brandHeader: {
    alignItems: 'center',
    gap: spacing.md,
  },
  brandHeaderCompact: {
    gap: spacing.sm,
  },
  heading: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  card: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(208, 213, 221, 0.72)',
    borderRadius: 24,
    padding: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 4,
  },
  cardCompact: {
    gap: spacing.sm,
    padding: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
  },
});
