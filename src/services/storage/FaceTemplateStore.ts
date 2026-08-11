import * as Keychain from 'react-native-keychain';
import {
  FACE_MATCH_POLICY,
  FACE_MODEL,
  type FaceTemplate,
} from '../face/types';

const FACE_TEMPLATE_SERVICE = 'com.x.mobile.face-template.v2';
const FACE_TEMPLATE_USERNAME = 'on-device-face-template';

type FaceTemplateCollection = {
  schemaVersion: 1;
  templates: FaceTemplate[];
};

export interface FaceTemplateStore {
  save(template: FaceTemplate): Promise<void>;
  read(): Promise<FaceTemplate | null>;
  readAll(): Promise<FaceTemplate[]>;
  delete(ownerId?: string): Promise<void>;
}

export class KeychainFaceTemplateStore implements FaceTemplateStore {
  async save(template: FaceTemplate) {
    assertFaceTemplate(template);
    const templates = await this.readAll();
    const collection: FaceTemplateCollection = {
      schemaVersion: 1,
      templates: [
        ...templates.filter(
          item =>
            item.owner.id !== template.owner.id &&
            normalizeEmail(item.owner.email) !==
              normalizeEmail(template.owner.email),
        ),
        template,
      ],
    };
    const result = await Keychain.setGenericPassword(
      FACE_TEMPLATE_USERNAME,
      JSON.stringify(collection),
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
    const templates = await this.readAll();
    return templates[0] ?? null;
  }

  async readAll() {
    const credentials = await Keychain.getGenericPassword({
      service: FACE_TEMPLATE_SERVICE,
    });

    if (!credentials) {
      return [];
    }

    try {
      const value: unknown = JSON.parse(credentials.password);

      // Existing single-template installs migrate without deleting face data.
      try {
        assertFaceTemplate(value);
        return [value];
      } catch {
        assertFaceTemplateCollection(value);
        return value.templates;
      }
    } catch {
      return [];
    }
  }

  async delete(ownerId?: string) {
    if (ownerId) {
      const templates = await this.readAll();
      const remaining = templates.filter(item => item.owner.id !== ownerId);

      if (remaining.length === templates.length) {
        return;
      }

      if (remaining.length > 0) {
        const result = await Keychain.setGenericPassword(
          FACE_TEMPLATE_USERNAME,
          JSON.stringify({ schemaVersion: 1, templates: remaining }),
          {
            service: FACE_TEMPLATE_SERVICE,
            accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
            securityLevel: Keychain.SECURITY_LEVEL.SECURE_SOFTWARE,
            storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
          },
        );
        if (!result) {
          throw new Error('Yüz şablonu güvenli depodan silinemedi.');
        }
        return;
      }
    }

    await Keychain.resetGenericPassword({ service: FACE_TEMPLATE_SERVICE });
    const stillExists = await Keychain.hasGenericPassword({
      service: FACE_TEMPLATE_SERVICE,
    });

    if (stillExists) {
      throw new Error('Yüz şablonu güvenli depodan silinemedi.');
    }
  }
}

function assertFaceTemplateCollection(
  value: unknown,
): asserts value is FaceTemplateCollection {
  if (
    !value ||
    typeof value !== 'object' ||
    (value as Partial<FaceTemplateCollection>).schemaVersion !== 1 ||
    !Array.isArray((value as Partial<FaceTemplateCollection>).templates)
  ) {
    throw new Error('Geçersiz yüz şablonu koleksiyonu.');
  }

  const templates = (value as FaceTemplateCollection).templates;
  templates.forEach(assertFaceTemplate);
  if (
    new Set(templates.map(template => template.owner.id)).size !==
    templates.length
  ) {
    throw new Error('Yinelenen yüz şablonu sahibi.');
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

function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase('en-US');
}
