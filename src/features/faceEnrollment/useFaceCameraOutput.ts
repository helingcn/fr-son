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
import { prewhitenRgbPixels } from '../../services/face/preprocess';

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

        if (!shouldExtract || model == null || resizer == null) {
          return;
        }

        let resized: ReturnType<Resizer['resize']> | undefined;
        try {
          resized = resizer.resize(frame);
          const pixels = new Float32Array(resized.getPixelBuffer());
          const standardized = prewhitenRgbPixels(pixels);
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
