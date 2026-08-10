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
} from '../features/faceEnrollment/useFaceCameraOutput';
import { faceEngine } from '../services/face/DemoFaceNetEngine';
import { FACE_MODEL, type FaceEmbedding } from '../services/face/types';
import {
  MAX_FACE_VERIFICATION_ATTEMPTS,
  faceVerificationAttemptStore,
} from '../services/storage/FaceVerificationAttemptStore';
import { faceTemplateStore } from '../services/storage/FaceTemplateStore';
import { useAuthStore } from '../store/authStore';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../types/navigation';

const MODEL_ASSET = require('../assets/models/facenet.tflite');
const REQUIRED_SAMPLES = 3;

type Props = NativeStackScreenProps<RootStackParamList, 'FaceVerification'>;
type StartupState = 'loading' | 'ready' | 'no-template' | 'locked' | 'error';

export function FaceVerificationScreen({ navigation }: Props) {
  const completeLogin = useAuthStore(state => state.completeLogin);
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
  const [startupState, setStartupState] = useState<StartupState>('loading');
  const [attemptCount, setAttemptCount] = useState(0);
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
  const [isVerifying, setIsVerifying] = useState(false);
  const sampleCountRef = useRef(0);

  useEffect(() => {
    let active = true;
    Promise.all([faceTemplateStore.read(), faceVerificationAttemptStore.read()])
      .then(([template, attempts]) => {
        if (!active) {
          return;
        }
        setAttemptCount(attempts.count);
        if (!template) {
          setStartupState('no-template');
        } else if (attempts.count >= MAX_FACE_VERIFICATION_ATTEMPTS) {
          setStartupState('locked');
        } else {
          setStartupState('ready');
        }
      })
      .catch(() => active && setStartupState('error'));

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setIsForeground(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  const recordFailedAttempt = useCallback(async (message: string) => {
    try {
      const attempts = await faceVerificationAttemptStore.recordFailure();
      setAttemptCount(attempts.count);
      setError(message);
      if (attempts.count >= MAX_FACE_VERIFICATION_ATTEMPTS) {
        setStartupState('locked');
      }
    } catch {
      setError('Doğrulama güvenli şekilde tamamlanamadı. Şifre kullanın.');
      setStartupState('error');
    }
  }, []);

  useEffect(() => {
    if (!challenge.error || startupState !== 'ready') {
      return;
    }
    recordFailedAttempt('Canlılık kontrolü başarısız oldu.');
  }, [challenge.error, recordFailedAttempt, startupState]);

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

      if (!quality.acceptable || !face) {
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
    if (sampleCountRef.current >= REQUIRED_SAMPLES) {
      return;
    }

    try {
      const normalized = faceEngine.normalizeEmbedding(embedding);
      sampleCountRef.current += 1;
      setSamples(current => [...current, normalized]);
    } catch {
      setError('Model geçerli bir yüz şablonu üretemedi.');
    }
  }, []);

  const handleCameraProcessingError = useCallback(
    () => setError('Yüz algılama başlatılamadı. Şifre kullanın.'),
    [],
  );

  const model = modelState.state === 'loaded' ? modelState.model : undefined;
  const resizer =
    resizerState.state === 'ready' ? resizerState.resizer : undefined;
  const shouldExtract =
    startupState === 'ready' &&
    challenge.complete &&
    !error &&
    samples.length < REQUIRED_SAMPLES;

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
    if (samples.length !== REQUIRED_SAMPLES || isVerifying || error) {
      return;
    }

    let active = true;
    async function verify() {
      setIsVerifying(true);
      try {
        faceEngine.assertDemoBuild();
        const template = await faceTemplateStore.read();
        if (!template) {
          setStartupState('no-template');
          return;
        }

        const candidate = faceEngine.averageEmbeddings(samples);
        if (!faceEngine.isMatch(template.embedding, candidate)) {
          await recordFailedAttempt('Yüzünüz doğrulanamadı.');
          return;
        }

        await faceVerificationAttemptStore.reset();
        if (active) {
          completeLogin(template.owner);
        }
      } catch {
        if (active) {
          setError('Yüz doğrulama tamamlanamadı. Şifre kullanın.');
          setStartupState('error');
        }
      } finally {
        if (active) {
          setIsVerifying(false);
        }
      }
    }

    verify();
    return () => {
      active = false;
    };
  }, [completeLogin, error, isVerifying, recordFailedAttempt, samples]);

  function goToPassword() {
    navigation.popTo('Login');
  }

  if (startupState === 'loading') {
    return (
      <ScreenPlaceholder
        title="Yüz doğrulama"
        description="Güvenli cihaz verileri hazırlanıyor…"
      >
        <PrimaryButton label="Şifre kullan" onPress={goToPassword} />
      </ScreenPlaceholder>
    );
  }

  if (startupState === 'no-template') {
    return (
      <ScreenPlaceholder
        title="Yüz kaydı bulunamadı"
        description="Bu cihazda kullanılabilir bir yüz kaydı yok veya kayıt güncel modelle uyumlu değil. Şifrenizle giriş yaptıktan sonra yüz kaydını yeniden oluşturabilirsiniz."
      >
        <PrimaryButton label="Şifre ile giriş" onPress={goToPassword} />
      </ScreenPlaceholder>
    );
  }

  if (startupState === 'locked') {
    return (
      <ScreenPlaceholder
        title="Şifre ile devam edin"
        description="Art arda üç yüz doğrulama denemesi başarısız oldu. Güvenliğiniz için yüz ile giriş geçici olarak durduruldu."
      >
        <PrimaryButton label="Şifre ile giriş" onPress={goToPassword} />
      </ScreenPlaceholder>
    );
  }

  if (startupState === 'error') {
    return (
      <ScreenPlaceholder
        title="Yüz doğrulama kullanılamıyor"
        description="Güvenli yüz doğrulama başlatılamadı. Şifre ile giriş yapabilirsiniz."
      >
        <PrimaryButton label="Şifre ile giriş" onPress={goToPassword} />
      </ScreenPlaceholder>
    );
  }

  if (!permission.hasPermission) {
    return (
      <ScreenPlaceholder
        title="Kamera izni"
        description="Yüz doğrulama için ön kamera izni gerekir. Şifre ile giriş her zaman kullanılabilir."
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
        <TextButton label="Şifre kullan" onPress={goToPassword} />
      </ScreenPlaceholder>
    );
  }

  if (!device) {
    return (
      <ScreenPlaceholder
        title="Ön kamera bulunamadı"
        description="Bu cihaz yüz doğrulamayı desteklemiyor."
      >
        <PrimaryButton label="Şifre ile giriş" onPress={goToPassword} />
      </ScreenPlaceholder>
    );
  }

  const engineLoading =
    modelState.state === 'loading' || resizerState.state === 'loading';
  const engineError =
    modelState.state === 'error' || resizerState.state === 'error';

  return (
    <View style={styles.container}>
      <Camera
        device={device}
        isActive={
          isForeground &&
          !isVerifying &&
          !engineError &&
          startupState === 'ready'
        }
        outputs={outputs}
        onError={handleCameraProcessingError}
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
            : engineError
            ? 'Yüz modeli bu cihazda başlatılamadı.'
            : challenge.error
            ? 'Canlılık kontrolü başarısız oldu.'
            : challenge.complete
            ? `Yüzünüz doğrulanıyor (${samples.length}/${REQUIRED_SAMPLES})`
            : getChallengeInstruction(challenge)}
        </Text>
        {!challenge.complete && !challenge.error ? (
          <Text style={styles.quality}>{qualityMessage}</Text>
        ) : null}
        <Text style={styles.attempts}>
          Kalan yüz denemesi:{' '}
          {Math.max(0, MAX_FACE_VERIFICATION_ATTEMPTS - attemptCount)}
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {(challenge.error || error) && startupState === 'ready' ? (
          <PrimaryButton label="Tekrar dene" onPress={resetVerification} />
        ) : null}
        <TextButton label="Şifre kullan" onPress={goToPassword} />
      </View>
    </View>
  );

  function resetVerification() {
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
  attempts: {
    color: '#D0D5DD',
    fontSize: 13,
    textAlign: 'center',
  },
  error: {
    color: '#FDA29B',
    fontSize: 14,
    textAlign: 'center',
  },
});
