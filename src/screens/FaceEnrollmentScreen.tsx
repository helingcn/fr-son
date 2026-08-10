import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { useTensorflowModel } from 'react-native-fast-tflite';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { useResizer } from 'react-native-vision-camera-resizer';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenPlaceholder } from '../components/ScreenPlaceholder';
import { TextButton } from '../components/TextButton';
import {
  advanceChallenge,
  createChallengeState,
  getChallengeInstruction,
  type ChallengeState,
} from '../features/faceEnrollment/challenge';
import {
  evaluateFaceQuality,
  getQualityMessage,
} from '../features/faceEnrollment/quality';
import {
  useFaceCameraOutput,
  type DetectedFace,
  type FaceCameraProcessingError,
} from '../features/faceEnrollment/useFaceCameraOutput';
import { faceEngine } from '../services/face/DemoFaceNetEngine';
import {
  FACE_MATCH_POLICY,
  FACE_MODEL,
  type FaceEmbedding,
} from '../services/face/types';
import { faceTemplateStore } from '../services/storage/FaceTemplateStore';
import { useAuthStore } from '../store/authStore';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../types/navigation';

const MODEL_ASSET = require('../assets/models/facenet.tflite');
const REQUIRED_SAMPLES = 3;
const ENGINE_LOADING_TIMEOUT_MS = 30_000;

type Props = NativeStackScreenProps<RootStackParamList, 'FaceEnrollment'>;

type FaceEnrollmentSessionProps = Props & {
  onRetryEngine: () => void;
};

export function FaceEnrollmentScreen(props: Props) {
  const [engineAttempt, setEngineAttempt] = useState(0);

  return (
    <FaceEnrollmentSession
      key={engineAttempt}
      {...props}
      onRetryEngine={() => setEngineAttempt(attempt => attempt + 1)}
    />
  );
}

function FaceEnrollmentSession({
  navigation,
  route,
  onRetryEngine,
}: FaceEnrollmentSessionProps) {
  const completeFaceChoice = useAuthStore(state => state.completeFaceChoice);
  const completeRegistrationFace = useAuthStore(
    state => state.completeRegistrationFace,
  );
  const isReplacement = route.params.mode === 'replace';
  const isRegistration = route.params.mode === 'registration';
  const device = useCameraDevice('front');
  const permission = useCameraPermission();
  const modelState = useTensorflowModel(MODEL_ASSET, []);
  const resizerState = useResizer({
    width: FACE_MODEL.inputSize,
    height: FACE_MODEL.inputSize,
    channelOrder: 'rgb',
    dataType: 'float32',
    scaleMode: 'cover',
    pixelLayout: 'interleaved',
  });
  const [isForeground, setIsForeground] = useState(
    AppState.currentState === 'active',
  );
  const [challenge, setChallenge] = useState<ChallengeState>(() =>
    createChallengeState(Math.random() < 0.5 ? 'left' : 'right', Date.now()),
  );
  const [qualityMessage, setQualityMessage] = useState(
    'Yüzünüzü çerçeveye getirin',
  );
  const [samples, setSamples] = useState<FaceEmbedding[]>([]);
  const [error, setError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);
  const [engineTimedOut, setEngineTimedOut] = useState(false);
  const sampleCountRef = useRef(0);
  const engineWasReadyRef = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setIsForeground(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  const handleFacesDetected = useCallback(
    (faces: DetectedFace[]) => {
      const face = faces[0];
      const quality = evaluateFaceQuality({
        faceCount: faces.length,
        faceWidth: face?.bounds.width ?? 0,
        frameWidth: face?.frameWidth ?? 1,
        pitchAngle: face?.pitchAngle ?? 0,
        rollAngle: face?.rollAngle ?? 0,
      });
      setQualityMessage(getQualityMessage(quality));

      if (!engineWasReadyRef.current || !quality.acceptable || !face) {
        return;
      }

      setChallenge(current =>
        advanceChallenge(
          current,
          {
            trackingId: face.trackingId,
            leftEyeOpenProbability: face.leftEyeOpenProbability,
            rightEyeOpenProbability: face.rightEyeOpenProbability,
            yawAngle: face.yawAngle,
          },
          Date.now(),
        ),
      );
    },
    [],
  );

  const handleEmbedding = useCallback((embedding: number[]) => {
    try {
      const normalized = faceEngine.normalizeEmbedding(embedding);
      setSamples(current => {
        if (current.length >= REQUIRED_SAMPLES) {
          return current;
        }

        const next = [...current, normalized];
        sampleCountRef.current = next.length;
        return next;
      });
    } catch {
      setError('Model geçerli bir yüz şablonu üretemedi.');
    }
  }, []);

  const handleCameraProcessingError = useCallback(
    (processingError: FaceCameraProcessingError) =>
      setError(
        processingError === 'embedding'
          ? 'Yüz modeli geçerli bir şablon üretemedi.'
          : 'Yüz algılama başlatılamadı.',
      ),
    [],
  );

  const model = modelState.state === 'loaded' ? modelState.model : undefined;
  const resizer =
    resizerState.state === 'ready' ? resizerState.resizer : undefined;
  const engineReady = model != null && resizer != null;
  const engineError =
    modelState.state === 'error' || resizerState.state === 'error';
  const shouldExtract =
    engineReady &&
    challenge.complete &&
    !error &&
    !isSaving &&
    sampleCountRef.current < REQUIRED_SAMPLES;

  useEffect(() => {
    if (engineReady && !engineWasReadyRef.current) {
      engineWasReadyRef.current = true;
      setEngineTimedOut(false);
      setChallenge(
        createChallengeState(
          Math.random() < 0.5 ? 'left' : 'right',
          Date.now(),
        ),
      );
    }
  }, [engineReady]);

  useEffect(() => {
    if (engineReady || engineError) {
      return;
    }

    const timeout = setTimeout(
      () => setEngineTimedOut(true),
      ENGINE_LOADING_TIMEOUT_MS,
    );
    return () => clearTimeout(timeout);
  }, [engineError, engineReady]);

  const frameOutput = useFaceCameraOutput({
    model,
    resizer,
    shouldExtract,
    expectedEmbeddingDimension: FACE_MODEL.embeddingDimension,
    onFacesDetected: handleFacesDetected,
    onEmbedding: handleEmbedding,
    onError: handleCameraProcessingError,
  });

  const outputs = useMemo(() => [frameOutput], [frameOutput]);

  useEffect(() => {
    if (samples.length !== REQUIRED_SAMPLES || isSaving) {
      return;
    }

    async function saveEnrollment() {
      setIsSaving(true);
      try {
        faceEngine.assertDemoBuild();
        const embedding = faceEngine.averageEmbeddings(samples);
        const user = useAuthStore.getState().user;
        if (!user) {
          throw new Error('Yüz şablonu bir kullanıcıya bağlanamadı.');
        }
        await faceTemplateStore.save({
          schemaVersion: 2,
          modelId: FACE_MODEL.id,
          embeddingDimension: FACE_MODEL.embeddingDimension,
          thresholdVersion: FACE_MATCH_POLICY.thresholdVersion,
          embedding,
          owner: user,
          enrolledAt: new Date().toISOString(),
          consent: {
            version: route.params.consentVersion,
            acceptedAt: route.params.consentAcceptedAt,
          },
        });
        if (isReplacement) {
          navigation.popTo('Settings', { faceEnrollmentUpdatedAt: Date.now() });
        } else if (isRegistration) {
          completeRegistrationFace();
        } else {
          completeFaceChoice();
        }
      } catch {
        setError('Yüz şablonu güvenli depoya kaydedilemedi.');
        setIsSaving(false);
      }
    }

    saveEnrollment();
  }, [
    completeFaceChoice,
    completeRegistrationFace,
    isRegistration,
    isReplacement,
    isSaving,
    navigation,
    route.params,
    samples,
  ]);

  if (!permission.hasPermission) {
    return (
      <ScreenPlaceholder
        title="Kamera izni"
        description="Yüz kaydı için ön kameraya izin vermeniz gerekir. İzin vermezseniz şifre ile giriş yapmaya devam edebilirsiniz."
      >
        {permission.canRequestPermission ? (
          <PrimaryButton
            label="Kamera izni ver"
            onPress={permission.requestPermission}
          />
        ) : (
          <PrimaryButton
            label="Sistem ayarlarını aç"
            onPress={Linking.openSettings}
          />
        )}
        {!isRegistration ? (
          <TextButton
            label={isReplacement ? 'Vazgeç' : 'Yüz kaydını atla'}
            onPress={cancelEnrollment}
          />
        ) : null}
      </ScreenPlaceholder>
    );
  }

  if (!device) {
    return (
      <ScreenPlaceholder
        title="Ön kamera bulunamadı"
        description="Bu cihaz yüz ile giriş kurulumunu desteklemiyor. Şifre ile giriş kullanabilirsiniz."
      >
        {!isRegistration ? (
          <PrimaryButton
            label={isReplacement ? 'Ayarlara dön' : 'Devam et'}
            onPress={cancelEnrollment}
          />
        ) : null}
      </ScreenPlaceholder>
    );
  }

  const engineLoading = !engineReady && !engineError && !engineTimedOut;
  const engineUnavailable = engineError || engineTimedOut;

  return (
    <View style={styles.container}>
      <Camera
        device={device}
        isActive={
          isForeground &&
          !isSaving &&
          !engineUnavailable &&
          engineReady
        }
        outputs={outputs}
        onError={() => handleCameraProcessingError('face-detection')}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.faceGuide} />
      </View>
      <View style={styles.statusPanel}>
        <Text accessibilityLiveRegion="polite" style={styles.instruction}>
          {engineLoading
            ? 'Yüz modeli hazırlanıyor…'
            : engineUnavailable
            ? 'Yüz modeli bu cihazda başlatılamadı.'
            : isSaving
            ? 'Yüz kaydı tamamlanıyor…'
            : challenge.error
            ? 'Canlılık kontrolü zaman aşımına uğradı.'
            : challenge.complete
            ? `Yüz örnekleri alınıyor (${samples.length}/${REQUIRED_SAMPLES})`
            : getChallengeInstruction(challenge)}
        </Text>
        {engineReady && !challenge.complete && !challenge.error ? (
          <Text style={styles.quality}>{qualityMessage}</Text>
        ) : null}
        {engineTimedOut ? (
          <Text style={styles.error}>
            Model hazırlığı zaman aşımına uğradı. Tekrar deneyin.
          </Text>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : null}
        {engineUnavailable ? (
          <PrimaryButton label="Modeli tekrar yükle" onPress={onRetryEngine} />
        ) : challenge.error || error ? (
          <PrimaryButton label="Tekrar dene" onPress={resetEnrollment} />
        ) : null}
        {!isRegistration ? (
          <TextButton
            label={isReplacement ? 'Vazgeç' : 'Yüz kaydını atla'}
            onPress={cancelEnrollment}
          />
        ) : null}
      </View>
    </View>
  );

  function cancelEnrollment() {
    if (isReplacement) {
      navigation.popTo('Settings');
    } else if (!isRegistration) {
      completeFaceChoice();
    }
  }

  function resetEnrollment() {
    sampleCountRef.current = 0;
    setSamples([]);
    setError(undefined);
    setChallenge(
      createChallengeState(Math.random() < 0.5 ? 'left' : 'right', Date.now()),
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.text,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceGuide: {
    width: 250,
    height: 330,
    borderWidth: 3,
    borderColor: colors.surface,
    borderRadius: 125,
  },
  statusPanel: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    gap: spacing.sm,
    borderRadius: 16,
    padding: spacing.md,
    backgroundColor: 'rgba(16, 24, 40, 0.88)',
  },
  instruction: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  quality: {
    color: colors.surface,
    fontSize: 14,
    textAlign: 'center',
  },
  error: {
    color: '#FDA29B',
    fontSize: 14,
    textAlign: 'center',
  },
});
