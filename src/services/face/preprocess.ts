export function prewhitenRgbPixels(pixels: Float32Array) {
  'worklet';
  if (pixels.length === 0) {
    throw new Error('Boş yüz tensörü işlenemez.');
  }

  let mean = 0;
  for (let index = 0; index < pixels.length; index += 1) {
    mean += pixels[index];
  }
  mean /= pixels.length;

  let variance = 0;
  for (let index = 0; index < pixels.length; index += 1) {
    const difference = pixels[index] - mean;
    variance += difference * difference;
  }

  const standardDeviation = Math.max(
    Math.sqrt(variance / pixels.length),
    1 / Math.sqrt(pixels.length),
  );
  const standardized = new Float32Array(pixels.length);

  for (let index = 0; index < pixels.length; index += 1) {
    standardized[index] = (pixels[index] - mean) / standardDeviation;
  }

  return standardized;
}
