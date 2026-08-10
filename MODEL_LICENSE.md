# Demo FaceNet model notice

The bundled `src/assets/models/facenet.tflite` is included only for local demo and evaluation use.

- Source: https://github.com/shubham0204/FaceRecognition_With_FaceNet_Android
- Downloaded asset: `app/src/main/assets/facenet.tflite`
- Size: `23,705,216` bytes
- SHA-256: `d7c1f7f130376982c7004920ddc41925ac2e5aecf6522f476c8bbb3669db7013`
- Expected input: 160 × 160 RGB face image
- Expected output: 128-dimensional face embedding

The source repository is marked Apache-2.0. However, it does not provide a separate license or complete provenance record for the pretrained model weights. Therefore, this file is **not approved for production or commercial distribution**. Replace it with a model whose weights, training-data provenance, intended use, accuracy, and commercial license have been reviewed before any release.

The application deliberately rejects face-engine initialization in non-development JavaScript builds while this demo model is configured.
