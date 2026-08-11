import { useId, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { colors, spacing } from '../theme';

type FormFieldProps = TextInputProps & {
  label: string;
  error?: string;
  icon?: string;
  rightAccessory?: ReactNode;
};

export function FormField({
  label,
  error,
  icon,
  rightAccessory,
  ...inputProps
}: FormFieldProps) {
  const errorId = useId();

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, error && styles.inputError]}>
        {icon ? (
          <View style={styles.iconBadge}>
            <Text style={styles.icon}>{icon}</Text>
          </View>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          {...inputProps}
        />
        {rightAccessory ? (
          <View style={styles.rightAccessory}>{rightAccessory}</View>
        ) : null}
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          id={errorId}
          style={styles.error}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  inputShell: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  iconBadge: {
    width: 32,
    height: 32,
    marginLeft: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#EFF4FF',
  },
  icon: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    minHeight: 48,
    flex: 1,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  rightAccessory: {
    marginRight: spacing.xs,
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    color: colors.error,
    fontSize: 14,
  },
});
