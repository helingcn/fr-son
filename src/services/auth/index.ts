import { MockAuthService } from './MockAuthService';

export const authService = new MockAuthService();

export { AuthError } from './types';
export type { AuthService, AuthUser, LoginInput, RegisterInput } from './types';
