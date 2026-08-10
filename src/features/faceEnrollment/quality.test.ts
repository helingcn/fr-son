import { evaluateFaceQuality } from './quality';

const validSignals = {
  faceCount: 1,
  faceWidth: 300,
  frameWidth: 800,
  pitchAngle: 0,
  rollAngle: 0,
};

describe('face enrollment quality', () => {
  it('accepts a single, large, frontal face', () => {
    expect(evaluateFaceQuality(validSignals)).toEqual({ acceptable: true });
  });

  it.each([
    [{ ...validSignals, faceCount: 0 }, 'no-face'],
    [{ ...validSignals, faceCount: 2 }, 'multiple-faces'],
    [{ ...validSignals, faceWidth: 100 }, 'too-small'],
    [{ ...validSignals, rollAngle: 20 }, 'pose'],
  ] as const)('rejects invalid quality signals', (signals, reason) => {
    expect(evaluateFaceQuality(signals)).toEqual({
      acceptable: false,
      reason,
    });
  });
});
