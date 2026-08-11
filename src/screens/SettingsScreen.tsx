import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/PrimaryButton';
import {
  FaceDataDeletionError,
  faceDataService,
} from '../services/face/FaceDataService';
import type { FaceTemplate } from '../services/face/types';
import { faceTemplateStore } from '../services/storage/FaceTemplateStore';
import { useAuthStore } from '../store/authStore';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;
type FaceDataState = 'loading' | 'registered' | 'empty' | 'error';

export function SettingsScreen({ navigation, route }: Props) {
  const signOut = useAuthStore(state => state.signOut);
  const user = useAuthStore(state => state.user);
  const requireFaceChoice = useAuthStore(state => state.requireFaceChoice);
  const [faceDataState, setFaceDataState] = useState<FaceDataState>('loading');
  const [templateMetadata, setTemplateMetadata] = useState<
    Pick<FaceTemplate, 'enrolledAt' | 'consent'> | undefined
  >();
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>();

  const loadFaceDataState = useCallback(async () => {
    setFaceDataState('loading');
    try {
      const templates = await faceTemplateStore.readAll();
      const template = templates.find(item => item.owner.id === user?.id);
      if (template) {
        setTemplateMetadata({
          enrolledAt: template.enrolledAt,
          consent: template.consent,
        });
        setFaceDataState('registered');
      } else {
        setTemplateMetadata(undefined);
        setFaceDataState('empty');
      }
    } catch {
      setFaceDataState('error');
    }
  }, [user?.id]);

  useEffect(() => {
    loadFaceDataState();
  }, [loadFaceDataState, route.params?.faceEnrollmentUpdatedAt]);

  function confirmDelete() {
    Alert.alert(
      'Yüz verinizi silmek istiyor musunuz?',
      'Cihazdaki yüz şablonunuz kalıcı olarak kaldırılacak. Bu işlem geri alınamaz. E-posta ve şifrenizle giriş yapmaya devam edebilirsiniz.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Yüz verimi sil',
          style: 'destructive',
          onPress: deleteFaceData,
        },
      ],
    );
  }

  async function deleteFaceData() {
    setIsDeleting(true);
    setStatusMessage(undefined);
    try {
      if (!user) {
        throw new Error('Kullanıcı bulunamadı.');
      }
      await faceDataService.deleteForOwner(user.id);
      setTemplateMetadata(undefined);
      setFaceDataState('empty');
      setStatusMessage('Yüz veriniz bu cihazdan silindi.');
      requireFaceChoice();
    } catch (error) {
      if (error instanceof FaceDataDeletionError && error.templateDeleted) {
        setTemplateMetadata(undefined);
        setFaceDataState('empty');
        setStatusMessage(error.message);
        requireFaceChoice();
      } else {
        setStatusMessage('Yüz verisi silinemedi. Lütfen tekrar deneyin.');
        await loadFaceDataState();
      }
    } finally {
      setIsDeleting(false);
    }
  }

  function startEnrollment() {
    setStatusMessage(undefined);
    navigation.navigate('FaceConsent', { mode: 'replace' });
  }

  const registered = faceDataState === 'registered';

  return (
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.description}>
          Yüz ile giriş isteğe bağlıdır. Yüz şablonunuz yalnızca bu cihazın
          güvenli deposunda tutulur.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Yüz ile giriş</Text>
            {registered ? (
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>Aktif</Text>
              </View>
            ) : null}
          </View>
          <Text accessibilityLiveRegion="polite" style={styles.stateText}>
            {faceDataState === 'loading'
              ? 'Yüz verisi durumu kontrol ediliyor…'
              : registered
              ? 'Bu cihazda yüz kaydınız mevcut.'
              : faceDataState === 'empty'
              ? 'Bu cihazda yüz kaydınız yok.'
              : 'Yüz verisi durumu okunamadı.'}
          </Text>
          {registered && templateMetadata ? (
            <View style={styles.metadata}>
              <Text style={styles.metadataText}>
                Kayıt tarihi: {formatDate(templateMetadata.enrolledAt)}
              </Text>
              <Text style={styles.metadataText}>
                Onay tarihi: {formatDate(templateMetadata.consent.acceptedAt)}
              </Text>
            </View>
          ) : null}
          {faceDataState === 'error' ? (
            <PrimaryButton
              label="Tekrar kontrol et"
              onPress={loadFaceDataState}
            />
          ) : registered ? (
            <>
              <OutlineButton
                disabled={isDeleting}
                label="Yüzümü yeniden kaydet"
                onPress={startEnrollment}
              />
              <DestructiveButton
                disabled={isDeleting}
                label={isDeleting ? 'Yüz verisi siliniyor…' : 'Yüz verimi sil'}
                onPress={confirmDelete}
              />
            </>
          ) : faceDataState === 'empty' ? (
            <PrimaryButton
              disabled={isDeleting}
              label="Yüz ile girişi kur"
              onPress={startEnrollment}
            />
          ) : null}
        </View>

        {statusMessage ? (
          <Text accessibilityLiveRegion="polite" style={styles.statusMessage}>
            {statusMessage}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={isDeleting}
          onPress={() => navigation.navigate('RegisteredUsers')}
          style={({ pressed }) => [
            styles.settingsRow,
            pressed && styles.settingsRowPressed,
            isDeleting && styles.disabled,
          ]}
        >
          <UsersIcon />
          <View style={styles.settingsRowContent}>
            <Text style={styles.settingsRowTitle}>Kayıtlı kullanıcılar</Text>
            <Text style={styles.settingsRowDescription}>
              Bu cihazdaki yüz profillerini görüntüle
            </Text>
          </View>
          <Text accessibilityElementsHidden style={styles.chevron}>
            ›
          </Text>
        </Pressable>

        <DestructiveButton
          disabled={isDeleting}
          label="Çıkış yap"
          onPress={signOut}
          outlined
        />
      </ScrollView>
    </SafeAreaView>
  );
}

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

function OutlineButton({ label, onPress, disabled }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.outlineButton,
        pressed && styles.outlineButtonPressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.outlineButtonText}>{label}</Text>
    </Pressable>
  );
}

function DestructiveButton({
  label,
  onPress,
  disabled,
  outlined = false,
}: ActionButtonProps & { outlined?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.destructiveButton,
        outlined && styles.destructiveButtonOutlined,
        pressed && styles.destructiveButtonPressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.destructiveButtonText,
          outlined && styles.destructiveButtonTextOutlined,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function UsersIcon() {
  return (
    <View accessibilityElementsHidden style={styles.usersIcon}>
      <View style={styles.userHead} />
      <View style={styles.userBody} />
    </View>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Bilinmiyor'
    : date.toLocaleString('tr-TR');
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  description: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
  },
  card: {
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: '#ECFDF3',
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#12B76A',
  },
  activeBadgeText: {
    color: '#027A48',
    fontSize: 12,
    fontWeight: '700',
  },
  stateText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  metadata: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  metadataText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  statusMessage: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  outlineButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  outlineButtonPressed: {
    backgroundColor: '#EFF4FF',
  },
  outlineButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  destructiveButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: '#D92D20',
  },
  destructiveButtonOutlined: {
    borderWidth: 1.5,
    borderColor: colors.error,
    backgroundColor: colors.surface,
  },
  destructiveButtonPressed: {
    opacity: 0.82,
  },
  destructiveButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  destructiveButtonTextOutlined: {
    color: colors.error,
  },
  settingsRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  settingsRowPressed: {
    backgroundColor: '#F2F4F7',
  },
  settingsRowContent: {
    flex: 1,
    gap: spacing.xs,
  },
  settingsRowTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  settingsRowDescription: {
    color: colors.textMuted,
    fontSize: 13,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 28,
    lineHeight: 30,
  },
  usersIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 12,
    backgroundColor: '#EFF4FF',
  },
  userHead: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  userBody: {
    width: 18,
    height: 9,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    backgroundColor: colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
});
