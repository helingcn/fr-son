import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

type AppLogoProps = {
  compact?: boolean;
};

export function AppLogo({ compact = false }: AppLogoProps) {
  return (
    <View
      accessibilityLabel="FaceKey uygulama logosu"
      accessibilityRole="image"
      style={[styles.logo, compact && styles.logoCompact]}
    >
      <View style={styles.highlight} />
      <Text style={[styles.mark, compact && styles.markCompact]}>FK</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 76,
    height: 76,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 8,
  },
  logoCompact: {
    width: 60,
    height: 60,
    borderRadius: 19,
  },
  highlight: {
    position: 'absolute',
    width: 70,
    height: 70,
    top: -34,
    right: -28,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  mark: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -2,
  },
  markCompact: {
    fontSize: 23,
  },
});
