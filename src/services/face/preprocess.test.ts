import { prewhitenRgbPixels } from './preprocess';

describe('FaceNet preprocessing', () => {
  it('centers and scales RGB pixels', () => {
    const result = prewhitenRgbPixels(new Float32Array([1, 2, 3]));
    const mean = Array.from(result).reduce((sum, value) => sum + value, 0) / 3;

    expect(mean).toBeCloseTo(0);
    expect(result[0]).toBeLessThan(0);
    expect(result[2]).toBeGreaterThan(0);
  });

  it('rejects an empty tensor', () => {
    expect(() => prewhitenRgbPixels(new Float32Array())).toThrow('Boş');
  });
});
