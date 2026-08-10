import {
  FACE_MATCH_POLICY,
  FACE_MODEL,
  type FaceEmbedding,
  type FaceEngine,
} from './types';

const MIN_VECTOR_NORM = 1e-12;

export class DemoFaceNetEngine implements FaceEngine {
  readonly modelId = FACE_MODEL.id;
  readonly embeddingDimension = FACE_MODEL.embeddingDimension;

  assertDemoBuild() {
    if (!__DEV__) {
      throw new Error(
        'Demo FaceNet ağırlıkları production kullanımı için onaylı değildir.',
      );
    }
  }

  normalizeEmbedding(embedding: FaceEmbedding): FaceEmbedding {
    this.assertEmbedding(embedding);
    const norm = Math.sqrt(
      embedding.reduce((sum, value) => sum + value * value, 0),
    );

    if (!Number.isFinite(norm) || norm < MIN_VECTOR_NORM) {
      throw new Error('Geçersiz yüz embedding normu.');
    }

    return embedding.map(value => value / norm);
  }

  averageEmbeddings(embeddings: FaceEmbedding[]): FaceEmbedding {
    if (embeddings.length === 0) {
      throw new Error('En az bir yüz embedding örneği gereklidir.');
    }

    const normalized = embeddings.map(embedding =>
      this.normalizeEmbedding(embedding),
    );
    const average = Array.from(
      { length: this.embeddingDimension },
      (_, index) =>
        normalized.reduce((sum, embedding) => sum + embedding[index], 0) /
        normalized.length,
    );

    return this.normalizeEmbedding(average);
  }

  cosineSimilarity(reference: FaceEmbedding, candidate: FaceEmbedding) {
    const normalizedReference = this.normalizeEmbedding(reference);
    const normalizedCandidate = this.normalizeEmbedding(candidate);

    return normalizedReference.reduce(
      (sum, value, index) => sum + value * normalizedCandidate[index],
      0,
    );
  }

  isMatch(reference: FaceEmbedding, candidate: FaceEmbedding) {
    return (
      this.cosineSimilarity(reference, candidate) >= FACE_MATCH_POLICY.threshold
    );
  }

  private assertEmbedding(embedding: FaceEmbedding) {
    if (
      embedding.length !== this.embeddingDimension ||
      embedding.some(value => !Number.isFinite(value))
    ) {
      throw new Error(
        `Embedding ${this.embeddingDimension} sonlu sayı içermelidir.`,
      );
    }
  }
}

export const faceEngine = new DemoFaceNetEngine();
