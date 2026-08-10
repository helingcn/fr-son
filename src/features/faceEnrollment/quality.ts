export type FaceQualitySignals = {
  faceCount: number;
  faceWidth: number;
  frameWidth: number;
  pitchAngle: number;
  rollAngle: number;
};

export type FaceQualityResult =
  | { acceptable: true }
  | {
      acceptable: false;
      reason: 'no-face' | 'multiple-faces' | 'too-small' | 'pose';
    };

export function evaluateFaceQuality(
  signals: FaceQualitySignals,
): FaceQualityResult {
  if (signals.faceCount === 0) {
    return { acceptable: false, reason: 'no-face' };
  }

  if (signals.faceCount > 1) {
    return { acceptable: false, reason: 'multiple-faces' };
  }

  if (signals.faceWidth / signals.frameWidth < 0.28) {
    return { acceptable: false, reason: 'too-small' };
  }

  if (Math.abs(signals.pitchAngle) > 15 || Math.abs(signals.rollAngle) > 12) {
    return { acceptable: false, reason: 'pose' };
  }

  return { acceptable: true };
}

export function getQualityMessage(result: FaceQualityResult) {
  if (result.acceptable) {
    return 'Yüz konumu uygun';
  }

  switch (result.reason) {
    case 'no-face':
      return 'Yüzünüzü çerçeveye getirin';
    case 'multiple-faces':
      return 'Kamerada yalnızca bir kişi olmalı';
    case 'too-small':
      return 'Kameraya biraz yaklaşın';
    case 'pose':
      return 'Telefonu sabit tutup kameraya düz bakın';
  }
}
