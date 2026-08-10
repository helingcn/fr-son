import * as Keychain from 'react-native-keychain';
import {
  FACE_MATCH_POLICY,
  FACE_MODEL,
  type FaceTemplate,
} from '../face/types';

const FACE_TEMPLATE_SERVICE = 'com.x.mobile.face-template.v2';
const FACE_TEMPLATE_USERNAME = 'on-device-face-template';

export interface FaceTemplateStore {
  save(template: FaceTemplate): Promise<void>;
  read(): Promise<FaceTemplate | null>;
  delete(): Promise<void>;
}

export class KeychainFaceTemplateStore implements FaceTemplateStore {
  async save(template: FaceTemplate) {
    assertFaceTemplate(template);
    const result = await Keychain.setGenericPassword(
      FACE_TEMPLATE_USERNAME,
      JSON.stringify(template),
      {
        service: FACE_TEMPLATE_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
        storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
      },
    );

    if (!result) {
      throw new Error('Yüz şablonu güvenli depoya yazılamadı.');
    }
  }

  async read() {
    const credentials = await Keychain.getGenericPassword({
      service: FACE_TEMPLATE_SERVICE,
    });

    if (!credentials) {
      return null;
    }

    try {
      const template: unknown = JSON.parse(credentials.password);
      assertFaceTemplate(template);
      return template;
    } catch {
      return null;
    }
  }

  async delete() {
    await Keychain.resetGenericPassword({ service: FACE_TEMPLATE_SERVICE });
    const stillExists = await Keychain.hasGenericPassword({
      service: FACE_TEMPLATE_SERVICE,
    });

    if (stillExists) {
      throw new Error('Yüz şablonu güvenli depodan silinemedi.');
    }
  }
}

export function assertFaceTemplate(
  value: unknown,
): asserts value is FaceTemplate {
  if (!value || typeof value !== 'object') {
    throw new Error('Geçersiz yüz şablonu.');
  }

  const template = value as Partial<FaceTemplate>;
  const owner = template.owner as Partial<FaceTemplate['owner']> | undefined;
  const consent = template.consent as
    | Partial<FaceTemplate['consent']>
    | undefined;

  if (
    template.schemaVersion !== 2 ||
    template.modelId !== FACE_MODEL.id ||
    template.embeddingDimension !== FACE_MODEL.embeddingDimension ||
    template.thresholdVersion !== FACE_MATCH_POLICY.thresholdVersion ||
    !Array.isArray(template.embedding) ||
    template.embedding.length !== FACE_MODEL.embeddingDimension ||
    template.embedding.some(component => !Number.isFinite(component)) ||
    !owner ||
    typeof owner.id !== 'string' ||
    !owner.id ||
    typeof owner.email !== 'string' ||
    !owner.email ||
    typeof template.enrolledAt !== 'string' ||
    !consent ||
    consent.version !== 'demo-draft-v1' ||
    typeof consent.acceptedAt !== 'string'
  ) {
    throw new Error('Uyumsuz veya bozuk yüz şablonu.');
  }
}

export const faceTemplateStore = new KeychainFaceTemplateStore();
