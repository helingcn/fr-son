import * as Keychain from 'react-native-keychain';
import { LocalAuthService } from './LocalAuthService';
import { AuthError } from './types';

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WhenUnlockedThisDeviceOnly' },
  SECURITY_LEVEL: { SECURE_SOFTWARE: 'SECURE_SOFTWARE' },
  STORAGE_TYPE: { AES_GCM_NO_AUTH: 'AES_GCM_NO_AUTH' },
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
}));

describe('LocalAuthService', () => {
  let storedPassword: string | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    storedPassword = undefined;
    jest.mocked(Keychain.getGenericPassword).mockImplementation(async () =>
      storedPassword
        ? {
            service: 'com.x.mobile.local-accounts.v1',
            username: 'on-device-accounts',
            password: storedPassword,
            storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
          }
        : false,
    );
    jest
      .mocked(Keychain.setGenericPassword)
      .mockImplementation(async (_username, password) => {
        storedPassword = password;
        return {
          service: 'com.x.mobile.local-accounts.v1',
          storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
        };
      });
  });

  it('persists an account between service instances', async () => {
    const firstService = new LocalAuthService();
    const registered = await firstService.register({
      firstName: '  Ada ',
      lastName: ' Lovelace  ',
      email: '  User@Example.COM ',
      password: 'Password1',
    });

    const restartedService = new LocalAuthService();
    await expect(
      restartedService.login({
        email: 'user@example.com',
        password: 'Password1',
      }),
    ).resolves.toEqual(registered);
    expect(registered).toMatchObject({
      email: 'user@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    expect(registered.id).toMatch(/^local-user-/);
  });

  it('stores the collection in the encrypted device keychain', async () => {
    const service = new LocalAuthService();
    await service.register({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'user@example.com',
      password: 'Password1',
    });

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'on-device-accounts',
      expect.any(String),
      {
        service: 'com.x.mobile.local-accounts.v1',
        accessible: 'WhenUnlockedThisDeviceOnly',
        securityLevel: 'SECURE_SOFTWARE',
        storage: 'AES_GCM_NO_AUTH',
      },
    );
  });

  it('rejects duplicate registrations after a restart', async () => {
    const input = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'user@example.com',
      password: 'Password1',
    };
    await new LocalAuthService().register(input);

    await expect(new LocalAuthService().register(input)).rejects.toMatchObject<
      Partial<AuthError>
    >({ code: 'EMAIL_ALREADY_REGISTERED' });
  });

  it.each([
    ['unknown@example.com', 'Password1'],
    ['user@example.com', 'WrongPassword1'],
  ])('returns the same credential error for %s', async (email, password) => {
    const service = new LocalAuthService();
    await service.register({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'user@example.com',
      password: 'Password1',
    });

    await expect(service.login({ email, password })).rejects.toMatchObject<
      Partial<AuthError>
    >({
      code: 'INVALID_CREDENTIALS',
      message: 'E-posta veya şifre hatalı.',
    });
  });
});
