import { DemoFaceNetEngine } from './DemoFaceNetEngine';
import { FACE_MODEL } from './types';

const createVector = (firstValue: number) => [
  firstValue,
  ...Array(FACE_MODEL.embeddingDimension - 1).fill(0),
];

describe('DemoFaceNetEngine', () => {
  const engine = new DemoFaceNetEngine();

  it('L2 normalizes an embedding', () => {
    const embedding = [
      3,
      4,
      ...Array(FACE_MODEL.embeddingDimension - 2).fill(0),
    ];
    const normalized = engine.normalizeEmbedding(embedding);

    expect(normalized[0]).toBeCloseTo(0.6);
    expect(normalized[1]).toBeCloseTo(0.8);
  });

  it('normalizes the average of enrollment samples', () => {
    const average = engine.averageEmbeddings([
      createVector(1),
      createVector(2),
      createVector(3),
    ]);

    expect(average[0]).toBeCloseTo(1);
  });

  it('computes cosine similarity and applies the demo threshold', () => {
    const same = createVector(1);
    const orthogonal = [
      0,
      1,
      ...Array(FACE_MODEL.embeddingDimension - 2).fill(0),
    ];
    const boundary = [
      0.4,
      Math.sqrt(1 - 0.4 * 0.4),
      ...Array(FACE_MODEL.embeddingDimension - 2).fill(0),
    ];

    expect(engine.cosineSimilarity(same, same)).toBeCloseTo(1);
    expect(engine.cosineSimilarity(same, orthogonal)).toBeCloseTo(0);
    expect(engine.isMatch(same, boundary)).toBe(true);
    expect(engine.isMatch(same, orthogonal)).toBe(false);
  });

  it('rejects invalid dimensions, NaN and zero vectors', () => {
    expect(() => engine.normalizeEmbedding([1, 2])).toThrow('128');
    expect(() => engine.normalizeEmbedding(createVector(Number.NaN))).toThrow(
      '128',
    );
    expect(() => engine.normalizeEmbedding(createVector(0))).toThrow('normu');
    expect(() => engine.averageEmbeddings([])).toThrow('En az bir');
  });
});
