import * as Keychain from 'react-native-keychain';
import {
  AuthError,
  type AuthService,
  type AuthUser,
  type LoginInput,
  type RegisterInput,
} from './types';

const LOCAL_ACCOUNTS_SERVICE = 'com.x.mobile.local-accounts.v1';
const LOCAL_ACCOUNTS_USERNAME = 'on-device-accounts';
const LOCAL_AUTH_DELAY_MS = 150;

type LocalAccount = {
  user: AuthUser;
  password: string;
};

type LocalAccountCollection = {
  schemaVersion: 1;
  accounts: LocalAccount[];
};

function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase('en-US');
}

function waitForLocalAuth() {
  return new Promise<void>(resolve => {
    setTimeout(resolve, LOCAL_AUTH_DELAY_MS);
  });
}

export class LocalAuthService implements AuthService {
  async register({
    email,
    password,
    firstName,
    lastName,
  }: RegisterInput): Promise<AuthUser> {
    await waitForLocalAuth();
    const normalizedEmail = normalizeEmail(email);
    const accounts = await this.readAccounts();

    if (accounts.some(account => account.user.email === normalizedEmail)) {
      throw new AuthError(
        'EMAIL_ALREADY_REGISTERED',
        'Bu e-posta adresiyle daha önce hesap oluşturulmuş.',
      );
    }

    const user: AuthUser = {
      id: createLocalUserId(),
      email: normalizedEmail,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    };

    await this.writeAccounts([...accounts, { user, password }]);
    return user;
  }

  async login({ email, password }: LoginInput): Promise<AuthUser> {
    await waitForLocalAuth();
    const normalizedEmail = normalizeEmail(email);
    const accounts = await this.readAccounts();
    const account = accounts.find(
      item => item.user.email === normalizedEmail && item.password === password,
    );

    if (!account) {
      throw new AuthError('INVALID_CREDENTIALS', 'E-posta veya şifre hatalı.');
    }

    return account.user;
  }

  private async readAccounts(): Promise<LocalAccount[]> {
    const credentials = await Keychain.getGenericPassword({
      service: LOCAL_ACCOUNTS_SERVICE,
    });

    if (!credentials) {
      return [];
    }

    try {
      const value: unknown = JSON.parse(credentials.password);
      assertLocalAccountCollection(value);
      return value.accounts;
    } catch {
      throw new Error('Cihazdaki hesap verileri okunamadı.');
    }
  }

  private async writeAccounts(accounts: LocalAccount[]) {
    const collection: LocalAccountCollection = {
      schemaVersion: 1,
      accounts,
    };
    const result = await Keychain.setGenericPassword(
      LOCAL_ACCOUNTS_USERNAME,
      JSON.stringify(collection),
      {
        service: LOCAL_ACCOUNTS_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
        storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
      },
    );

    if (!result) {
      throw new Error('Hesap cihazın güvenli deposuna kaydedilemedi.');
    }
  }
}

function createLocalUserId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 12);
  return `local-user-${timestamp}-${random}`;
}

function assertLocalAccountCollection(
  value: unknown,
): asserts value is LocalAccountCollection {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as Partial<LocalAccountCollection>).schemaVersion !== 1 ||
    !Array.isArray((value as Partial<LocalAccountCollection>).accounts)
  ) {
    throw new Error('Geçersiz hesap koleksiyonu.');
  }

  const accounts = (value as LocalAccountCollection).accounts;
  accounts.forEach(account => {
    if (
      !account ||
      typeof account !== 'object' ||
      typeof account.password !== 'string' ||
      !account.user ||
      typeof account.user.id !== 'string' ||
      !account.user.id ||
      typeof account.user.email !== 'string' ||
      !account.user.email ||
      typeof account.user.firstName !== 'string' ||
      typeof account.user.lastName !== 'string'
    ) {
      throw new Error('Geçersiz hesap kaydı.');
    }
  });

  if (
    new Set(accounts.map(account => account.user.email)).size !==
    accounts.length
  ) {
    throw new Error('Yinelenen hesap kaydı.');
  }
}
