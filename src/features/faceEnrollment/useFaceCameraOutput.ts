import { useCallback } from 'react';
import type { TensorflowModel } from 'react-native-fast-tflite';
import { useFrameOutput } from 'react-native-vision-camera';
import {
  useFaceDetector,
  type Face,
  type FaceDetectorOptions,
} from 'react-native-vision-camera-face-detector';
import type { Resizer } from 'react-native-vision-camera-resizer';
import { scheduleOnRN } from 'react-native-worklets';
import {
  cropAndAlignRgbPixels,
  prewhitenRgbPixels,
} from '../../services/face/preprocess';
import { FACE_MODEL } from '../../services/face/types';

const FRAME_RESOLUTION = { width: 480, height: 640 };
const FACE_DETECTOR_OPTIONS = {
  cameraFacing: 'front',
  performanceMode: 'fast',
  runClassifications: true,
  trackingEnabled: true,
  minFaceSize: 0.28,
} satisfies FaceDetectorOptions;

export type DetectedFace = Pick<
  Face,
  | 'bounds'
  | 'frameHeight'
  | 'frameWidth'
  | 'leftEyeOpenProbability'
  | 'pitchAngle'
  | 'rightEyeOpenProbability'
  | 'rollAngle'
  | 'trackingId'
  | 'yawAngle'
>;

export type FaceCameraProcessingError = 'face-detection' | 'embedding';

type UseFaceCameraOutputOptions = {
  model?: TensorflowModel;
  resizer?: Resizer;
  shouldExtract: boolean;
  expectedEmbeddingDimension: number;
  onFacesDetected: (faces: DetectedFace[]) => void;
  onEmbedding: (embedding: number[]) => void;
  onError: (error: FaceCameraProcessingError) => void;
};

export function useFaceCameraOutput({
  model,
  resizer,
  shouldExtract,
  expectedEmbeddingDimension,
  onFacesDetected,
  onEmbedding,
  onError,
}: UseFaceCameraOutputOptions) {
  const faceDetector = useFaceDetector(FACE_DETECTOR_OPTIONS);

  const processFaces = useCallback(
    (faces: DetectedFace[]) => onFacesDetected(faces),
    [onFacesDetected],
  );

  return useFrameOutput({
    targetResolution: FRAME_RESOLUTION,
    pixelFormat: 'yuv',
    dropFramesWhileBusy: true,
    onFrame(frame) {
      'worklet';
      try {
        let faces: DetectedFace[];
        try {
          faces = faceDetector.detectFaces(frame).map(face => ({
            bounds: {
              x: face.bounds.x,
              y: face.bounds.y,
              width: face.bounds.width,
              height: face.bounds.height,
            },
            frameWidth: face.frameWidth,
            frameHeight: face.frameHeight,
            leftEyeOpenProbability: face.leftEyeOpenProbability,
            pitchAngle: face.pitchAngle,
            rightEyeOpenProbability: face.rightEyeOpenProbability,
            rollAngle: face.rollAngle,
            trackingId: face.trackingId,
            yawAngle: face.yawAngle,
          }));
          scheduleOnRN(processFaces, faces);
        } catch {
          scheduleOnRN(onError, 'face-detection');
          return;
        }

        const face = faces[0];
        if (
          !shouldExtract ||
          model == null ||
          resizer == null ||
          faces.length !== 1 ||
          face == null ||
          Math.abs(face.pitchAngle) > 12 ||
          Math.abs(face.rollAngle) > 10 ||
          Math.abs(face.yawAngle) > 12
        ) {
          return;
        }

        let resized: ReturnType<Resizer['resize']> | undefined;
        try {
          resized = resizer.resize(frame);
          const pixels = new Float32Array(resized.getPixelBuffer());
          const cropped = cropAndAlignRgbPixels(
            pixels,
            FACE_MODEL.extractionWidth,
            FACE_MODEL.extractionHeight,
            {
              ...face.bounds,
              frameWidth: face.frameWidth,
              frameHeight: face.frameHeight,
              rollAngle: face.rollAngle,
            },
            FACE_MODEL.inputSize,
            FACE_MODEL.cropScale,
          );
          const standardized = prewhitenRgbPixels(cropped);
          const output = model.runSync([standardized.buffer])[0];
          if (output == null) {
            throw new Error('FaceNet output is missing.');
          }
          const embedding = Array.from(new Float32Array(output));
          if (embedding.length !== expectedEmbeddingDimension) {
            throw new Error('FaceNet output has an unexpected dimension.');
          }
          scheduleOnRN(onEmbedding, embedding);
        } catch {
          scheduleOnRN(onError, 'embedding');
        } finally {
          resized?.dispose();
        }
      } finally {
        frame.dispose();
      }
    },
  });
}
