# FaceKey face verification architecture

This document provides a technical overview of the optional on-device face verification flow in FaceKey. It is not legal advice; the legal team must assess compliance with the Turkish Personal Data Protection Law (KVKK) and the handling of biometric data.

## Status

This implementation is a **demo/evaluation build** flow.

- It is not ready for production deployment.
- It has no independent liveness/PAD certification.
- The FaceNet weights used have not been approved for production or commercial distribution.
- The demo model is restricted to development JavaScript builds.

## Core architecture

The flow runs entirely on the device:

1. The camera produces front-facing camera frames.
2. Face detection and embedding extraction run inside a native frame worklet.
3. Raw frames, photos, and videos are neither written to files nor sent over the network.
4. Only a normalized mathematical embedding is computed.
5. The embedding is stored with the user identity in secure device storage or compared with stored embeddings on the device.
6. Successful verification only opens a local demo session.

## Technologies used

| Component                                                                    | Role                                                               |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `react-native-vision-camera@5.2.2`                                           | Native camera and frame output                                     |
| `react-native-vision-camera-face-detector@2.0.6`                             | ML Kit-based face detection, eye state, Euler angles, and tracking |
| `react-native-vision-camera-resizer@5.2.2`                                   | GPU-based frame resizing and format conversion                     |
| `react-native-fast-tflite@3.0.1`                                             | On-device FaceNet TFLite inference                                 |
| `react-native-vision-camera-worklets@5.2.2` + `react-native-worklets@0.11.3` | Synchronous native frame processing                                |
| `react-native-nitro-modules@0.36.5`                                          | Native bridge/Nitro infrastructure                                 |
| `react-native-keychain@10.0.0`                                               | Secure storage backed by iOS Keychain / Android Keystore           |
| Zustand                                                                      | Lightweight local authentication state management                  |

The native packages run on the React Native New Architecture.

## SDK selection

### Current choice

The current demo provider uses open-source FaceNet TFLite with an active challenge-response approach.

Reasons for this choice:

- Fully on-device operation
- Open components compatible with RN New Architecture/Nitro
- An inference pipeline that can be traced from the UI layer
- A provider abstraction that allows replacement with a licensed SDK later
- A functional demo without licensing or budget commitments

### Important limitation

ML Kit/VisionCamera Face Detector only performs face detection and produces landmarks/signals. It does not provide secure 1:1 identity verification or certified liveness on its own.

The demo FaceNet model also lacks complete provenance and commercial licensing records for its pretrained weights. See `MODEL_LICENSE.md` for details.

### Replacing the provider

The `FaceEngine` interface abstracts model identity and embedding operations. If a licensed SDK with independent PAD/test reports, such as KBY-AI, Regula, or FaceTec, is evaluated for production, the UI consent, fallback, and deletion flows can be retained.

At a minimum, verify the following when selecting an SDK candidate:

- On-device inference
- iBeta/NIST or equivalent independent evaluation
- Passive PAD level and attack classes
- RN New Architecture support
- Minimum iOS/Android versions
- Native crash rate and active maintenance status
- Licensing and pricing model
- Training data/provenance and commercial usage terms
- Bias/FAR/FRR measurement reports

## Flows

### 1. Quick login choice after registration

The user creates an account with an email address and password. Face setup is optional and can be skipped.

If face login is selected, a consent screen separate from the general terms opens.

### 2. Separate privacy notice and explicit consent

Consent copy is versioned in [src/features/faceEnrollment/consent.ts](src/features/faceEnrollment/consent.ts):

- `version`: `demo-draft-v1`
- Privacy notice text
- Explicit consent checkbox text
- A “Demo draft pending legal approval” label

Enrollment does not start until the checkbox is selected. The consent version and acceptance time are written to the template metadata.

If the legal team changes the copy, a new version must be used in this file.

### 3. Enrollment

During enrollment:

- Front camera permission is requested.
- A single-face check is performed.
- Minimum face size is checked.
- Pitch/roll position is checked.
- A randomized active challenge is performed:
  1. Blink
  2. Turn the head in the first randomly selected direction
  3. Return to the center
  4. Turn the head in the other direction
  5. Return to the center again
- The challenge fails if it is not completed within 30 seconds.
- The challenge fails if the tracked face changes.
- Five embedding samples are captured at different times after the challenge.
- The detected face is cropped with a margin and aligned using its roll angle.
- Each sample is L2-normalized.
- The normalized samples are averaged and normalized again.
- The template is added to the user collection in secure storage; only the same user's previous record is updated.

### 4. Verification

Verification uses the same quality and liveness checks.

- Five new embedding samples are extracted at different times.
- An average candidate embedding is computed.
- Cosine similarity is computed against all stored embeddings on the device, and the person with the highest score is evaluated.
- Demo threshold: `0.80`
- Threshold version: `demo-cropped-v2`
- On success, the attempt counter is reset and a local demo session opens.
- On failure, the attempt counter is incremented.

The similarity score is not written to the UI, logs, analytics, or storage.

### 5. Fallback

Email/password login is always available.

The user can return to password login:

- If camera permission is unavailable
- If there is no front camera
- If the model cannot be initialized
- If the template is missing, corrupt, or incompatible
- Whenever the user chooses to do so

Face verification attempts are unlimited. After a failed attempt, the user can restart the liveness check.

### 6. Deletion and re-enrollment

On the Settings screen:

- Face enrollment status is displayed.
- The enrollment date, consent version, and consent date are shown.
- The “Delete my face data” action requires a separate confirmation for the destructive operation.
- After template deletion, the absence of the record is verified again.
- The attempt counter is cleared.
- The user is redirected to consent/enrollment without being signed out.
- “Re-enroll my face” does not delete the old template first; the record is overwritten after the new enrollment completes successfully.
- Explicit consent is obtained again during re-enrollment.

## Storage

Face templates are stored only through the secure storage service.

### iOS

- Keychain
- Accessibility: `WHEN_UNLOCKED_THIS_DEVICE_ONLY`
- The record cannot be transferred off the device and is accessible only while the device is unlocked.

### Android

- `react-native-keychain` Keystore-backed AES-GCM credential storage
- Minimum level: `SECURE_SOFTWARE`
- The key is kept in Android Keystore.

`SECURE_HARDWARE` is not required because StrongBox/TEE hardware is not guaranteed on every Android device. In production, hardware support can be measured with `getSecurityLevel()` and requirements tightened according to the risk policy.

### Explicitly excluded storage locations

The following are not used for face data:

- AsyncStorage
- Plain files
- SQLite
- Zustand persistence
- Debug logs
- Analytics events
- Crash report payloads
- Backend request bodies

### Template schema

The schema version is `2`:

- Model identity
- Embedding dimension
- Threshold version
- Embedding
- Owner's user `id` and `email`
- Enrollment date
- Consent version and date

Passwords, backend tokens, camera frames, and raw images are not stored.

Old, incompatible, or corrupt templates are rejected using fail-closed behavior and require re-enrollment.

## Network and telemetry review

There are currently no network calls carrying face data in this project. Mock authentication runs locally.

Source code review found no dependencies on Sentry, Firebase Analytics, or custom analytics/crash-reporting SDKs.

For production, however:

- Review all network logging and interceptor lists.
- Prevent serialization of `face`, `embedding`, `consent`, `verification`, and `camera` values in crash SDK breadcrumbs.
- Add a redaction filter if route parameters or screen state are included in React Native error reports.
- Do not include screenshots or camera frames in telemetry.
- Do not use error messages or snapshots containing embeddings in tests.

## Security boundaries

### Liveness limitations

The active challenge is only a demo liveness layer.

It offers resistance to:

- Simple still photos
- Short fixed videos played on a screen (partially)
- Incorrect positioning, multiple faces, or a change of person

It is insufficient against:

- Advanced video replay
- Deepfakes/injection
- Camera pipeline manipulation through root/jailbreak access
- Masks/3D physical spoofs
- OS/camera API attacks

Independently tested passive PAD is required for production.

### Alignment limitation

The demo embedding input does not use full face bounding-box/landmark affine alignment. The current pipeline may limit overall quality and cause score variation even for the same person.

Before production, implement eye/ear landmark-based affine alignment and measure accuracy per device.

### Threshold limitation

The `0.40` cosine threshold is an initial value taken from the demo source implementation. It has no FAR/FRR calibration.

Before production, the following are required:

- Tests on target devices
- Measurements across different lighting conditions, ages, genders, and skin tones
- FRR and FAR reports
- Decisions on thresholds and challenge UX
- Model/hash/version signature verification

### Local session limitation

A successful result currently only opens a local demo session. In a real backend integration, sending a plain “face verification succeeded” flag to the server is vulnerable to replay attacks.

Recommended production design:

- Keep a device-bound signing key in Keystore/Secure Enclave.
- Register the public key with the backend after enrollment.
- Have the backend generate a short-lived challenge during login.
- Have the device sign the challenge after successful on-device face verification.
- Have the backend verify only the signature.
- Never send the face embedding to the backend.

This design has not yet been implemented.

### Multiple devices

The face template is bound to the device and is not synchronized across devices. A new device requires re-enrollment. This supports data minimization, but a multi-device user experience is intentionally absent.

### Deletion limitation

The Keychain/Keystore record is made inaccessible at the application level, and device-only/non-migrating settings reduce backup and transfer risks. However, the application cannot guarantee forensic physical overwriting at the mobile OS and flash storage layers.

## Platform configuration

### Android

- Minimum SDK: 26
- Camera permission: `android.permission.CAMERA`
- Front camera: `android.hardware.camera.front`, `required="false"`
- Backup: `android:allowBackup="false"`
- The development setting for cleartext traffic is managed through a manifest variable.

### iOS

- `NSCameraUsageDescription` is included.
- The local networking ATS permission is only for development access to Metro.
- The iOS build could not be verified on Windows; testing on a physical iPhone using macOS is required.

## Build and test

Verified commands:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test -- --runInBand
./android/gradlew.bat -p android assembleDebug -PreactNativeArchitectures=arm64-v8a
```

The Android arm64 debug build succeeded in the last verification.

iOS commands for macOS:

```bash
bundle install
cd ios
bundle exec pod install
cd ..
npm run ios
```

## Pre-production checklist

- [ ] Replace demo FaceNet with a model whose license/provenance has been verified or a commercial SDK
- [ ] Review the independent PAD/liveness report with the security team
- [ ] Version the legally approved privacy notice and consent copy
- [ ] Clarify the relationship between system Face ID/touch biometrics and custom in-app face verification with the legal/security team
- [ ] Measure FAR/FRR and calibrate the threshold
- [ ] Add landmark affine alignment
- [ ] Implement the backend device-bound challenge/signing design
- [ ] Add crash/analytics redaction tests
- [ ] Assess root/jailbreak/injection risks
- [ ] Run multi-user end-to-end tests on physical iOS and Android devices
- [ ] Add production model hash/signature/version checks
- [ ] Submit third-party dependency licenses for legal review
