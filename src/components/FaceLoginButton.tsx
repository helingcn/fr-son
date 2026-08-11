import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

type FaceLoginButtonProps = {
  onPress: () => void;
  disabled?: boolean;
};

export function FaceLoginButton({ onPress, disabled }: FaceLoginButtonProps) {
  return (
    <Pressable
      accessibilityLabel="Yüz ile giriş yap"
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={styles.faceIcon}
      >
        <View style={styles.eyes}>
          <View style={styles.eye} />
          <View style={styles.eye} />
        </View>
        <View style={styles.mouth} />
      </View>
      <Text style={styles.label}>Yüz ile giriş</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
  },
  buttonPressed: {
    backgroundColor: '#EFF4FF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  label: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  faceIcon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1.8,
    borderColor: colors.primary,
    borderRadius: 7,
  },
  eyes: {
    flexDirection: 'row',
    gap: 5,
  },
  eye: {
    width: 2.5,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  mouth: {
    width: 8,
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
