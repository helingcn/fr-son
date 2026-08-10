import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenPlaceholder } from '../components/ScreenPlaceholder';
import { TextButton } from '../components/TextButton';
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
      const template = await faceTemplateStore.read();
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
  }, []);

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
      await faceDataService.deleteAll();
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
    <ScreenPlaceholder
      title="Ayarlar"
      description="Yüz ile giriş isteğe bağlıdır. Yüz şablonunuz yalnızca bu cihazın güvenli deposunda tutulur."
    >
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Yüz ile giriş</Text>
        <Text accessibilityLiveRegion="polite" style={styles.stateText}>
          {faceDataState === 'loading'
            ? 'Yüz verisi durumu kontrol ediliyor…'
            : registered
            ? 'Bu cihazda yüz kaydı mevcut.'
            : faceDataState === 'empty'
            ? 'Bu cihazda yüz kaydı yok.'
            : 'Yüz verisi durumu okunamadı.'}
        </Text>
        {registered && templateMetadata ? (
          <View style={styles.metadata}>
            <Text style={styles.metadataText}>
              Kayıt tarihi: {formatDate(templateMetadata.enrolledAt)}
            </Text>
            <Text style={styles.metadataText}>
              Rıza sürümü: {templateMetadata.consent.version}
            </Text>
            <Text style={styles.metadataText}>
              Rıza tarihi: {formatDate(templateMetadata.consent.acceptedAt)}
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
            <PrimaryButton
              disabled={isDeleting}
              label="Yüzümü yeniden kaydet"
              onPress={startEnrollment}
            />
            <TextButton
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
      <TextButton disabled={isDeleting} label="Çıkış yap" onPress={signOut} />
    </ScreenPlaceholder>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Bilinmiyor'
    : date.toLocaleString('tr-TR');
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  stateText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  metadata: {
    gap: spacing.xs,
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
});
