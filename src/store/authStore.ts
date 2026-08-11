import { create } from 'zustand';
import type { AuthUser } from '../services/auth';

type AuthStatus =
  | 'signedOut'
  | 'pendingRegistrationFace'
  | 'pendingFaceChoice'
  | 'faceWelcome'
  | 'signedIn';

type AuthState = {
  status: AuthStatus;
  user: AuthUser | null;
  registrationConsentAcceptedAt: string | null;
  completeLogin: (user: AuthUser) => void;
  completeFaceLogin: (user: AuthUser) => void;
  dismissFaceWelcome: () => void;
  beginRegistrationFace: (user: AuthUser, consentAcceptedAt: string) => void;
  completeRegistrationFace: () => void;
  completeFaceChoice: () => void;
  requireFaceChoice: () => void;
  signOut: () => void;
};

export const useAuthStore = create<AuthState>(set => ({
  status: 'signedOut',
  user: null,
  registrationConsentAcceptedAt: null,
  completeLogin: user =>
    set({
      status: 'signedIn',
      user,
      registrationConsentAcceptedAt: null,
    }),
  completeFaceLogin: user =>
    set({
      status: 'faceWelcome',
      user,
      registrationConsentAcceptedAt: null,
    }),
  dismissFaceWelcome: () => set({ status: 'signedIn' }),
  beginRegistrationFace: (user, registrationConsentAcceptedAt) =>
    set({
      status: 'pendingRegistrationFace',
      user,
      registrationConsentAcceptedAt,
    }),
  completeRegistrationFace: () =>
    set({
      status: 'signedOut',
      user: null,
      registrationConsentAcceptedAt: null,
    }),
  completeFaceChoice: () =>
    set({ status: 'signedIn', registrationConsentAcceptedAt: null }),
  requireFaceChoice: () => set({ status: 'pendingFaceChoice' }),
  signOut: () =>
    set({
      status: 'signedOut',
      user: null,
      registrationConsentAcceptedAt: null,
    }),
}));
