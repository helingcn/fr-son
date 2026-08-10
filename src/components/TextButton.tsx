import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../theme';

type TextButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function TextButton({ label, onPress, disabled }: TextButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={styles.button}
    >
      <Text style={[styles.label, disabled && styles.labelDisabled]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  label: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  labelDisabled: {
    opacity: 0.5,
  },
});
