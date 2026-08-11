export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  FaceConsent: { mode: 'initial' | 'replace' };
  FaceEnrollment: {
    mode: 'registration' | 'initial' | 'replace';
    consentVersion: 'demo-draft-v1';
    consentAcceptedAt: string;
  };
  FaceVerification: undefined;
  FaceWelcome: undefined;
  Home: undefined;
  Settings: { faceEnrollmentUpdatedAt?: number } | undefined;
  RegisteredUsers: undefined;
};
