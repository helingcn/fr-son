import {
  AuthError,
  type AuthService,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
} from './types';

type MockAccount = {
  user: AuthUser;
  password: string;
};

const MOCK_DELAY_MS = 250;

function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase('en-US');
}

function waitForMockNetwork() {
  return new Promise<void>(resolve => {
    setTimeout(resolve, MOCK_DELAY_MS);
  });
}

export class MockAuthService implements AuthService {
  private readonly accounts = new Map<string, MockAccount>();
  private nextUserId = 1;

  async register({
    email,
    password,
    firstName,
    lastName,
  }: RegisterInput): Promise<AuthUser> {
    await waitForMockNetwork();
    const normalizedEmail = normalizeEmail(email);

    if (this.accounts.has(normalizedEmail)) {
      throw new AuthError(
        'EMAIL_ALREADY_REGISTERED',
        'Bu e-posta adresiyle daha önce hesap oluşturulmuş.',
      );
    }

    const user = {
      id: `mock-user-${this.nextUserId++}`,
      email: normalizedEmail,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    };

    this.accounts.set(normalizedEmail, { user, password });
    return user;
  }

  async login({ email, password }: LoginInput): Promise<AuthUser> {
    await waitForMockNetwork();
    const account = this.accounts.get(normalizeEmail(email));

    if (!account || account.password !== password) {
      throw new AuthError('INVALID_CREDENTIALS', 'E-posta veya şifre hatalı.');
    }

    return account.user;
  }
}
