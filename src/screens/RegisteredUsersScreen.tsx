import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/PrimaryButton';
import type { FaceTemplate } from '../services/face/types';
import { faceTemplateStore } from '../services/storage/FaceTemplateStore';
import { useAuthStore } from '../store/authStore';
import { colors, spacing } from '../theme';

type LoadState = 'loading' | 'ready' | 'error';

export function RegisteredUsersScreen() {
  const currentUserId = useAuthStore(state => state.user?.id);
  const [templates, setTemplates] = useState<FaceTemplate[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  const loadUsers = useCallback(async () => {
    setLoadState('loading');
    try {
      const storedTemplates = await faceTemplateStore.readAll();
      setTemplates(
        [...storedTemplates].sort((left, right) =>
          right.enrolledAt.localeCompare(left.enrolledAt),
        ),
      );
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [loadUsers]),
  );

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <FlatList
        contentContainerStyle={styles.content}
        data={loadState === 'ready' ? templates : []}
        keyExtractor={template => template.owner.id}
        ListHeaderComponent={
          <View style={styles.heading}>
            <Text accessibilityRole="header" style={styles.title}>
              Kayıtlı kullanıcılar
            </Text>
            <Text style={styles.description}>
              Bu cihazda yüz ile giriş kaydı bulunan kullanıcılar gösteriliyor.
            </Text>
            {loadState === 'ready' && templates.length > 0 ? (
              <Text accessibilityLiveRegion="polite" style={styles.count}>
                {templates.length} kullanıcı
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loadState === 'loading' ? (
            <View style={styles.stateCard}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.stateText}>Kullanıcılar yükleniyor…</Text>
            </View>
          ) : loadState === 'error' ? (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>Kayıtlar okunamadı</Text>
              <Text style={styles.stateText}>
                Cihazın güvenli deposuna şu anda erişilemiyor.
              </Text>
              <PrimaryButton label="Tekrar dene" onPress={loadUsers} />
            </View>
          ) : (
            <View style={styles.stateCard}>
              <Text style={styles.stateTitle}>Henüz kayıtlı kullanıcı yok</Text>
              <Text style={styles.stateText}>
                Bir kullanıcı yüz kaydını tamamladığında burada görünecek.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const fullName =
            `${item.owner.firstName} ${item.owner.lastName}`.trim();
          const isCurrentUser = item.owner.id === currentUserId;

          return (
            <View style={styles.userCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(item.owner.firstName, item.owner.lastName)}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <View style={styles.nameRow}>
                  <Text numberOfLines={1} style={styles.userName}>
                    {fullName || 'İsimsiz kullanıcı'}
                  </Text>
                  {isCurrentUser ? (
                    <Text style={styles.currentBadge}>Siz</Text>
                  ) : null}
                </View>
                <Text numberOfLines={1} style={styles.email}>
                  {item.owner.email}
                </Text>
                <Text style={styles.date}>
                  Yüz kaydı: {formatDate(item.enrolledAt)}
                </Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function getInitials(firstName: string, lastName: string) {
  const initials = [firstName, lastName]
    .map(value => value.trim().charAt(0))
    .filter(Boolean)
    .join('')
    .toLocaleUpperCase('tr-TR');

  return initials || '?';
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Bilinmiyor'
    : date.toLocaleString('tr-TR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heading: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  description: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 24,
  },
  count: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#EAF0FF',
  },
  avatarText: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '800',
  },
  userDetails: {
    flex: 1,
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userName: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  currentBadge: {
    overflow: 'hidden',
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    color: colors.primary,
    backgroundColor: '#EAF0FF',
    fontSize: 12,
    fontWeight: '700',
  },
  email: {
    color: colors.textMuted,
    fontSize: 14,
  },
  date: {
    color: colors.textMuted,
    fontSize: 12,
  },
  stateCard: {
    alignItems: 'stretch',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
