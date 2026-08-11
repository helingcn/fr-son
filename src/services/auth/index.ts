import { LocalAuthService } from './LocalAuthService';

export const authService = new LocalAuthService();

export { AuthError } from './types';
export type { AuthService, AuthUser, LoginInput, RegisterInput } from './types';
