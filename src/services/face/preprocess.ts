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

export type FaceCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  rollAngle: number;
};

export function cropAndAlignRgbPixels(
  pixels: Float32Array,
  sourceWidth: number,
  sourceHeight: number,
  face: FaceCrop,
  outputSize: number,
  cropScale: number,
) {
  'worklet';
  if (
    pixels.length !== sourceWidth * sourceHeight * 3 ||
    sourceWidth <= 0 ||
    sourceHeight <= 0 ||
    face.frameWidth <= 0 ||
    face.frameHeight <= 0 ||
    face.width <= 0 ||
    face.height <= 0 ||
    outputSize <= 0 ||
    cropScale < 1
  ) {
    throw new Error('Geçersiz yüz kırpma girdisi.');
  }

  const scaleX = sourceWidth / face.frameWidth;
  const scaleY = sourceHeight / face.frameHeight;
  const centerX = (face.x + face.width / 2) * scaleX;
  const centerY = (face.y + face.height / 2) * scaleY;
  const cropSize = Math.max(
    face.width * scaleX,
    face.height * scaleY,
  ) * cropScale;
  const radians = (face.rollAngle * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const output = new Float32Array(outputSize * outputSize * 3);

  for (let targetY = 0; targetY < outputSize; targetY += 1) {
    for (let targetX = 0; targetX < outputSize; targetX += 1) {
      const offsetX =
        ((targetX + 0.5) / outputSize - 0.5) * cropSize;
      const offsetY =
        ((targetY + 0.5) / outputSize - 0.5) * cropSize;
      const sourceX = Math.max(
        0,
        Math.min(
          sourceWidth - 1,
          centerX + offsetX * cosine - offsetY * sine - 0.5,
        ),
      );
      const sourceY = Math.max(
        0,
        Math.min(
          sourceHeight - 1,
          centerY + offsetX * sine + offsetY * cosine - 0.5,
        ),
      );
      const left = Math.floor(sourceX);
      const top = Math.floor(sourceY);
      const right = Math.min(sourceWidth - 1, left + 1);
      const bottom = Math.min(sourceHeight - 1, top + 1);
      const horizontalWeight = sourceX - left;
      const verticalWeight = sourceY - top;
      const targetIndex = (targetY * outputSize + targetX) * 3;

      for (let channel = 0; channel < 3; channel += 1) {
        const topLeft = pixels[(top * sourceWidth + left) * 3 + channel];
        const topRight = pixels[(top * sourceWidth + right) * 3 + channel];
        const bottomLeft =
          pixels[(bottom * sourceWidth + left) * 3 + channel];
        const bottomRight =
          pixels[(bottom * sourceWidth + right) * 3 + channel];
        const topValue =
          topLeft + (topRight - topLeft) * horizontalWeight;
        const bottomValue =
          bottomLeft + (bottomRight - bottomLeft) * horizontalWeight;
        output[targetIndex + channel] =
          topValue + (bottomValue - topValue) * verticalWeight;
      }
    }
  }

  return output;
}
