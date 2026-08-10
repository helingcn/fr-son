import {
  faceVerificationAttemptStore,
  type FaceVerificationAttemptStore,
} from '../storage/FaceVerificationAttemptStore';
import {
  faceTemplateStore,
  type FaceTemplateStore,
} from '../storage/FaceTemplateStore';

export class FaceDataDeletionError extends Error {
  constructor(public readonly templateDeleted: boolean, message: string) {
    super(message);
    this.name = 'FaceDataDeletionError';
  }
}

export class FaceDataService {
  constructor(
    private readonly templateStore: FaceTemplateStore,
    private readonly attemptStore: FaceVerificationAttemptStore,
  ) {}

  async deleteAll() {
    await this.templateStore.delete();

    try {
      await this.attemptStore.reset();
    } catch {
      throw new FaceDataDeletionError(
        true,
        'Yüz şablonu silindi ancak deneme geçmişi temizlenemedi.',
      );
    }
  }
}

export const faceDataService = new FaceDataService(
  faceTemplateStore,
  faceVerificationAttemptStore,
);
