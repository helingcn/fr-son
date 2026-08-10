import { MockAuthService } from './MockAuthService';
import { AuthError } from './types';

describe('MockAuthService', () => {
  it('registers and logs in with a normalized email', async () => {
    const service = new MockAuthService();
    const registered = await service.register({
      firstName: '  Ada ',
      lastName: ' Lovelace  ',
      email: '  User@Example.COM ',
      password: 'Password1',
    });

    await expect(
      service.login({ email: 'user@example.com', password: 'Password1' }),
    ).resolves.toEqual(registered);
    expect(registered).toMatchObject({
      email: 'user@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
  });

  it('rejects duplicate registrations', async () => {
    const service = new MockAuthService();
    const input = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'user@example.com',
      password: 'Password1',
    };
    await service.register(input);

    await expect(service.register(input)).rejects.toMatchObject<
      Partial<AuthError>
    >({ code: 'EMAIL_ALREADY_REGISTERED' });
  });

  it.each([
    ['unknown@example.com', 'Password1'],
    ['user@example.com', 'WrongPassword1'],
  ])('returns the same credential error for %s', async (email, password) => {
    const service = new MockAuthService();
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
