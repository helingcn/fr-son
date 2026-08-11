export const FACE_MODEL = {
  id: 'demo-facenet-128-face-crop-v2',
  inputSize: 160,
  extractionWidth: 240,
  extractionHeight: 320,
  cropScale: 1.4,
  embeddingDimension: 128,
  demoOnly: true,
} as const;

export const FACE_MATCH_POLICY = {
  threshold: 0.8,
  thresholdVersion: 'demo-cropped-v2',
} as const;

export type FaceEmbedding = number[];

export type EnrollmentConsent = {
  version: 'demo-draft-v1';
  acceptedAt: string;
};

export type FaceTemplateOwner = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type FaceTemplate = {
  schemaVersion: 2;
  modelId: typeof FACE_MODEL.id;
  embeddingDimension: typeof FACE_MODEL.embeddingDimension;
  thresholdVersion: typeof FACE_MATCH_POLICY.thresholdVersion;
  embedding: FaceEmbedding;
  owner: FaceTemplateOwner;
  enrolledAt: string;
  consent: EnrollmentConsent;
};

export interface FaceEngine {
  readonly modelId: string;
  readonly embeddingDimension: number;
  assertDemoBuild(): void;
  normalizeEmbedding(embedding: FaceEmbedding): FaceEmbedding;
  averageEmbeddings(embeddings: FaceEmbedding[]): FaceEmbedding;
  cosineSimilarity(reference: FaceEmbedding, candidate: FaceEmbedding): number;
  isMatch(reference: FaceEmbedding, candidate: FaceEmbedding): boolean;
}
