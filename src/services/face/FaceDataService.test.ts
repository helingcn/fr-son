import type {
  FaceVerificationAttemptStore,
  FaceVerificationAttempts,
} from '../storage/FaceVerificationAttemptStore';
import type { FaceTemplateStore } from '../storage/FaceTemplateStore';
import { FaceDataDeletionError, FaceDataService } from './FaceDataService';

function createStores() {
  return {
    templateStore: {
      save: jest.fn(),
      read: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<FaceTemplateStore>,
    attemptStore: {
      read: jest
        .fn<Promise<FaceVerificationAttempts>, []>()
        .mockResolvedValue({ count: 0 }),
      recordFailure: jest.fn(),
      reset: jest.fn(),
    } as jest.Mocked<FaceVerificationAttemptStore>,
  };
}

describe('FaceDataService', () => {
  it('deletes the face template and resets verification attempts', async () => {
    const { templateStore, attemptStore } = createStores();
    templateStore.delete.mockResolvedValue(undefined);
    attemptStore.reset.mockResolvedValue(undefined);
    const service = new FaceDataService(templateStore, attemptStore);

    await service.deleteAll();

    expect(templateStore.delete).toHaveBeenCalledTimes(1);
    expect(attemptStore.reset).toHaveBeenCalledTimes(1);
  });

  it('does not touch attempt state when template deletion fails', async () => {
    const { templateStore, attemptStore } = createStores();
    templateStore.delete.mockRejectedValue(new Error());
    const service = new FaceDataService(templateStore, attemptStore);

    await expect(service.deleteAll()).rejects.toThrow();
    expect(attemptStore.reset).not.toHaveBeenCalled();
  });

  it('surfaces partial cleanup after the sensitive template is deleted', async () => {
    const { templateStore, attemptStore } = createStores();
    templateStore.delete.mockResolvedValue(undefined);
    attemptStore.reset.mockRejectedValue(new Error());
    const service = new FaceDataService(templateStore, attemptStore);

    try {
      await service.deleteAll();
      throw new Error('Expected deletion to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(FaceDataDeletionError);
      expect((error as FaceDataDeletionError).templateDeleted).toBe(true);
    }
  });
});
