import { cropAndAlignRgbPixels, prewhitenRgbPixels } from './preprocess';

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

  it('crops the detected face instead of resizing the full frame', () => {
    const pixels = new Float32Array([
      1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4,
      5, 5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8,
      9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12,
      13, 13, 13, 14, 14, 14, 15, 15, 15, 16, 16, 16,
    ]);

    const result = cropAndAlignRgbPixels(
      pixels,
      4,
      4,
      {
        x: 1,
        y: 1,
        width: 2,
        height: 2,
        frameWidth: 4,
        frameHeight: 4,
        rollAngle: 0,
      },
      2,
      1,
    );

    expect(Array.from(result)).toEqual([
      6, 6, 6, 7, 7, 7,
      10, 10, 10, 11, 11, 11,
    ]);
  });

  it('rejects inconsistent crop buffers', () => {
    expect(() =>
      cropAndAlignRgbPixels(
        new Float32Array(3),
        4,
        4,
        {
          x: 1,
          y: 1,
          width: 2,
          height: 2,
          frameWidth: 4,
          frameHeight: 4,
          rollAngle: 0,
        },
        2,
        1.4,
      ),
    ).toThrow('kırpma');
  });
});
