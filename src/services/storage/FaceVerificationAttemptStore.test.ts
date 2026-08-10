import * as Keychain from 'react-native-keychain';
import {
  KeychainFaceVerificationAttemptStore,
  MAX_FACE_VERIFICATION_ATTEMPTS,
} from './FaceVerificationAttemptStore';

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
  },
  SECURITY_LEVEL: { SECURE_SOFTWARE: 1 },
  STORAGE_TYPE: { AES_GCM_NO_AUTH: 'KeystoreAESGCM_NoAuth' },
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

describe('KeychainFaceVerificationAttemptStore', () => {
  const store = new KeychainFaceVerificationAttemptStore();

  beforeEach(() => jest.clearAllMocks());

  it('increments and securely persists failures', async () => {
    jest.mocked(Keychain.getGenericPassword).mockResolvedValue({
      username: 'face-verification-attempts',
      password: JSON.stringify({ count: 1 }),
      service: 'com.x.mobile.face-verification-attempts.v1',
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });
    jest.mocked(Keychain.setGenericPassword).mockResolvedValue({
      service: 'com.x.mobile.face-verification-attempts.v1',
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });

    await expect(
      store.recordFailure('2026-08-09T12:00:00.000Z'),
    ).resolves.toEqual({
      count: 2,
      lastFailedAt: '2026-08-09T12:00:00.000Z',
    });
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'face-verification-attempts',
      expect.any(String),
      expect.objectContaining({
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    );
  });

  it('caps failures and fails closed for corrupt state', async () => {
    jest.mocked(Keychain.getGenericPassword).mockResolvedValue({
      username: 'face-verification-attempts',
      password: '{bad-json',
      service: 'com.x.mobile.face-verification-attempts.v1',
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });
    jest.mocked(Keychain.setGenericPassword).mockResolvedValue({
      service: 'com.x.mobile.face-verification-attempts.v1',
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });

    await expect(store.read()).resolves.toEqual({
      count: MAX_FACE_VERIFICATION_ATTEMPTS,
    });
    await expect(store.recordFailure()).resolves.toEqual(
      expect.objectContaining({ count: MAX_FACE_VERIFICATION_ATTEMPTS }),
    );
  });

  it('resets attempts after successful authentication', async () => {
    jest.mocked(Keychain.resetGenericPassword).mockResolvedValue(true);
    await store.reset();
    expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
      service: 'com.x.mobile.face-verification-attempts.v1',
    });
  });
});
