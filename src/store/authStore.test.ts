import { useAuthStore } from './authStore';

describe('authStore face enrollment state', () => {
  beforeEach(() => {
    useAuthStore.getState().signOut();
  });

  const user = {
    id: 'user-1',
    email: 'user@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
  };

  it('requires face scanning before completing registration', () => {
    useAuthStore
      .getState()
      .beginRegistrationFace(user, '2026-08-09T12:00:00.000Z');

    expect(useAuthStore.getState()).toMatchObject({
      status: 'pendingRegistrationFace',
      user,
      registrationConsentAcceptedAt: '2026-08-09T12:00:00.000Z',
    });

    useAuthStore.getState().completeRegistrationFace();

    expect(useAuthStore.getState()).toMatchObject({
      status: 'signedOut',
      user: null,
      registrationConsentAcceptedAt: null,
    });
  });

  it('keeps the user while requiring face enrollment again', () => {
    useAuthStore.getState().completeLogin(user);
    useAuthStore.getState().requireFaceChoice();

    expect(useAuthStore.getState()).toMatchObject({
      status: 'pendingFaceChoice',
      user,
    });
  });

  it('opens a dedicated welcome screen after face login', () => {
    useAuthStore.getState().completeFaceLogin(user);

    expect(useAuthStore.getState()).toMatchObject({
      status: 'faceWelcome',
      user,
    });

    useAuthStore.getState().dismissFaceWelcome();
    expect(useAuthStore.getState().status).toBe('signedIn');
  });
});
