import * as Keychain from 'react-native-keychain';

const ATTEMPT_SERVICE = 'com.x.mobile.face-verification-attempts.v1';
const ATTEMPT_USERNAME = 'face-verification-attempts';

export const MAX_FACE_VERIFICATION_ATTEMPTS = 3;

export type FaceVerificationAttempts = {
  count: number;
  lastFailedAt?: string;
};

export interface FaceVerificationAttemptStore {
  read(): Promise<FaceVerificationAttempts>;
  recordFailure(failedAt?: string): Promise<FaceVerificationAttempts>;
  reset(): Promise<void>;
}

export class KeychainFaceVerificationAttemptStore
  implements FaceVerificationAttemptStore
{
  async read(): Promise<FaceVerificationAttempts> {
    const credentials = await Keychain.getGenericPassword({
      service: ATTEMPT_SERVICE,
    });

    if (!credentials) {
      return { count: 0 };
    }

    try {
      const value: unknown = JSON.parse(credentials.password);
      if (
        !value ||
        typeof value !== 'object' ||
        !Number.isInteger((value as FaceVerificationAttempts).count) ||
        (value as FaceVerificationAttempts).count < 0
      ) {
        return { count: MAX_FACE_VERIFICATION_ATTEMPTS };
      }
      return value as FaceVerificationAttempts;
    } catch {
      return { count: MAX_FACE_VERIFICATION_ATTEMPTS };
    }
  }

  async recordFailure(failedAt = new Date().toISOString()) {
    const current = await this.read();
    const next = {
      count: Math.min(current.count + 1, MAX_FACE_VERIFICATION_ATTEMPTS),
      lastFailedAt: failedAt,
    };
    const result = await Keychain.setGenericPassword(
      ATTEMPT_USERNAME,
      JSON.stringify(next),
      {
        service: ATTEMPT_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
        storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
      },
    );

    if (!result) {
      throw new Error('Yüz doğrulama denemesi kaydedilemedi.');
    }

    return next;
  }

  async reset() {
    await Keychain.resetGenericPassword({ service: ATTEMPT_SERVICE });
  }
}

export const faceVerificationAttemptStore =
  new KeychainFaceVerificationAttemptStore();
