import * as Keychain from 'react-native-keychain';
import {
  FACE_MATCH_POLICY,
  FACE_MODEL,
  type FaceTemplate,
} from '../face/types';
import {
  KeychainFaceTemplateStore,
  assertFaceTemplate,
} from './FaceTemplateStore';

jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
  },
  SECURITY_LEVEL: { SECURE_SOFTWARE: 1 },
  STORAGE_TYPE: { AES_GCM_NO_AUTH: 'KeystoreAESGCM_NoAuth' },
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  hasGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

const template: FaceTemplate = {
  schemaVersion: 2,
  modelId: FACE_MODEL.id,
  embeddingDimension: FACE_MODEL.embeddingDimension,
  thresholdVersion: FACE_MATCH_POLICY.thresholdVersion,
  embedding: Array(FACE_MODEL.embeddingDimension).fill(0.1),
  owner: {
    id: 'user-1',
    email: 'user@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
  },
  enrolledAt: '2026-08-09T12:00:00.000Z',
  consent: {
    version: 'demo-draft-v1',
    acceptedAt: '2026-08-09T11:59:00.000Z',
  },
};

describe('KeychainFaceTemplateStore', () => {
  const store = new KeychainFaceTemplateStore();

  beforeEach(() => jest.clearAllMocks());

  it('stores the template with device-only accessibility', async () => {
    jest.mocked(Keychain.getGenericPassword).mockResolvedValue(false);
    jest.mocked(Keychain.setGenericPassword).mockResolvedValue({
      service: 'com.x.mobile.face-template.v2',
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });

    await store.save(template);

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'on-device-face-template',
      JSON.stringify({ schemaVersion: 1, templates: [template] }),
      expect.objectContaining({
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
      }),
    );
  });

  it('keeps other users when a new face is saved', async () => {
    const secondTemplate: FaceTemplate = {
      ...template,
      owner: {
        id: 'user-2',
        email: 'grace@example.com',
        firstName: 'Grace',
        lastName: 'Hopper',
      },
    };
    jest.mocked(Keychain.getGenericPassword).mockResolvedValue({
      username: 'on-device-face-template',
      password: JSON.stringify({ schemaVersion: 1, templates: [template] }),
      service: 'com.x.mobile.face-template.v2',
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });
    jest.mocked(Keychain.setGenericPassword).mockResolvedValue({
      service: 'com.x.mobile.face-template.v2',
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });

    await store.save(secondTemplate);

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'on-device-face-template',
      JSON.stringify({
        schemaVersion: 1,
        templates: [template, secondTemplate],
      }),
      expect.any(Object),
    );
  });

  it('replaces an older face identity that uses the same email', async () => {
    jest.mocked(Keychain.getGenericPassword).mockResolvedValue({
      username: 'on-device-face-template',
      password: JSON.stringify({
        schemaVersion: 1,
        templates: [template],
      }),
      service: 'com.x.mobile.face-template.v2',
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });
    jest.mocked(Keychain.setGenericPassword).mockResolvedValue({
      service: 'com.x.mobile.face-template.v2',
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });

    const migratedTemplate = {
      ...template,
      owner: {
        ...template.owner,
        id: 'local-user-new-id',
        email: template.owner.email.toLocaleUpperCase('en-US'),
      },
    };
    await store.save(migratedTemplate);

    const savedCollection = JSON.parse(
      jest.mocked(Keychain.setGenericPassword).mock.calls[0][1],
    );
    expect(savedCollection.templates).toEqual([migratedTemplate]);
  });

  it('reads and deletes a valid template', async () => {
    jest.mocked(Keychain.getGenericPassword).mockResolvedValue({
      username: 'on-device-face-template',
      password: JSON.stringify(template),
      service: 'com.x.mobile.face-template.v2',
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });
    jest.mocked(Keychain.resetGenericPassword).mockResolvedValue(true);
    jest.mocked(Keychain.hasGenericPassword).mockResolvedValue(false);

    await expect(store.read()).resolves.toEqual(template);
    await store.delete();
    expect(Keychain.resetGenericPassword).toHaveBeenCalled();
    expect(Keychain.hasGenericPassword).toHaveBeenCalledWith({
      service: 'com.x.mobile.face-template.v2',
    });
  });

  it('reports failure if the template remains after deletion', async () => {
    jest.mocked(Keychain.resetGenericPassword).mockResolvedValue(true);
    jest.mocked(Keychain.hasGenericPassword).mockResolvedValue(true);

    await expect(store.delete()).rejects.toThrow('silinemedi');
  });

  it('deletes only the selected user from a multi-user collection', async () => {
    const secondTemplate: FaceTemplate = {
      ...template,
      owner: { ...template.owner, id: 'user-2', email: 'two@example.com' },
    };
    jest.mocked(Keychain.getGenericPassword).mockResolvedValue({
      username: 'on-device-face-template',
      password: JSON.stringify({
        schemaVersion: 1,
        templates: [template, secondTemplate],
      }),
      service: 'com.x.mobile.face-template.v2',
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });
    jest.mocked(Keychain.setGenericPassword).mockResolvedValue({
      service: 'com.x.mobile.face-template.v2',
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });

    await store.delete('user-1');

    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      'on-device-face-template',
      JSON.stringify({ schemaVersion: 1, templates: [secondTemplate] }),
      expect.any(Object),
    );
    expect(Keychain.resetGenericPassword).not.toHaveBeenCalled();
  });

  it('fails closed for legacy, malformed and incompatible templates', async () => {
    for (const value of [
      { ...template, schemaVersion: 1 },
      { ...template, modelId: 'other-model' },
      { ...template, embedding: [1, 2] },
      { ...template, owner: undefined },
    ]) {
      jest.mocked(Keychain.getGenericPassword).mockResolvedValue({
        username: 'on-device-face-template',
        password: JSON.stringify(value),
        service: 'com.x.mobile.face-template.v2',
        storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
      });
      await expect(store.read()).resolves.toBeNull();
      expect(() => assertFaceTemplate(value)).toThrow();
    }
  });
});
