export type ChallengeStep = 'blink' | 'turnLeft' | 'turnRight' | 'center';

export type FaceSignals = {
  trackingId?: number;
  leftEyeOpenProbability?: number;
  rightEyeOpenProbability?: number;
  yawAngle: number;
};

export type ChallengeState = {
  steps: ChallengeStep[];
  currentIndex: number;
  startedAt: number;
  trackingId?: number;
  blinkClosedObserved: boolean;
  complete: boolean;
  error?: 'timeout' | 'tracking-changed';
};

export const CHALLENGE_TIMEOUT_MS = 30_000;

export function createChallengeState(
  turn: 'left' | 'right',
  startedAt: number,
): ChallengeState {
  const firstTurn = turn === 'left' ? 'turnLeft' : 'turnRight';
  const secondTurn = turn === 'left' ? 'turnRight' : 'turnLeft';

  return {
    steps: ['blink', firstTurn, 'center', secondTurn, 'center'],
    currentIndex: 0,
    startedAt,
    blinkClosedObserved: false,
    complete: false,
  };
}

export function advanceChallenge(
  state: ChallengeState,
  signals: FaceSignals,
  now: number,
): ChallengeState {
  if (state.complete || state.error) {
    return state;
  }

  if (now - state.startedAt > CHALLENGE_TIMEOUT_MS) {
    return { ...state, error: 'timeout' };
  }

  if (
    state.trackingId !== undefined &&
    signals.trackingId !== undefined &&
    state.trackingId !== signals.trackingId
  ) {
    return { ...state, error: 'tracking-changed' };
  }

  const nextState = {
    ...state,
    trackingId: state.trackingId ?? signals.trackingId,
  };
  const step = state.steps[state.currentIndex];

  if (step === 'blink') {
    const left = signals.leftEyeOpenProbability;
    const right = signals.rightEyeOpenProbability;

    if (left === undefined || right === undefined) {
      return nextState;
    }

    if (left < 0.3 && right < 0.3) {
      return { ...nextState, blinkClosedObserved: true };
    }

    if (state.blinkClosedObserved && left > 0.7 && right > 0.7) {
      return moveToNextStep(nextState);
    }

    return nextState;
  }

  if (step === 'turnLeft' && signals.yawAngle < -18) {
    return moveToNextStep(nextState);
  }

  if (step === 'turnRight' && signals.yawAngle > 18) {
    return moveToNextStep(nextState);
  }

  if (step === 'center' && Math.abs(signals.yawAngle) < 8) {
    return moveToNextStep(nextState);
  }

  return nextState;
}

function moveToNextStep(state: ChallengeState): ChallengeState {
  const currentIndex = state.currentIndex + 1;

  return {
    ...state,
    currentIndex,
    complete: currentIndex >= state.steps.length,
  };
}

export function getChallengeInstruction(state: ChallengeState) {
  const step = state.steps[state.currentIndex];

  switch (step) {
    case 'blink':
      return 'İki gözünüzü kapatıp açın';
    case 'turnLeft':
      return 'Başınızı sola çevirin';
    case 'turnRight':
      return 'Başınızı sağa çevirin';
    case 'center':
      return 'Tekrar kameraya bakın';
    default:
      return 'Canlılık kontrolü tamamlandı';
  }
}
