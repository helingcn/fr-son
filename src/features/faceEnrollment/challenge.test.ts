import {
  CHALLENGE_TIMEOUT_MS,
  advanceChallenge,
  createChallengeState,
} from './challenge';

const baseSignals = {
  trackingId: 7,
  leftEyeOpenProbability: 0.9,
  rightEyeOpenProbability: 0.9,
  yawAngle: 0,
};

describe('enrollment challenge', () => {
  it('requires close-open blink, turn and return to center in order', () => {
    let state = createChallengeState('left', 1_000);

    state = advanceChallenge(
      state,
      {
        ...baseSignals,
        leftEyeOpenProbability: 0.1,
        rightEyeOpenProbability: 0.1,
      },
      1_100,
    );
    expect(state.currentIndex).toBe(0);

    state = advanceChallenge(state, baseSignals, 1_200);
    expect(state.currentIndex).toBe(1);

    state = advanceChallenge(state, { ...baseSignals, yawAngle: -20 }, 1_300);
    expect(state.currentIndex).toBe(2);

    state = advanceChallenge(state, baseSignals, 1_400);
    expect(state.complete).toBe(true);
  });

  it('does not accept an open-eye frame as a blink', () => {
    const state = advanceChallenge(
      createChallengeState('right', 1_000),
      baseSignals,
      1_100,
    );

    expect(state.currentIndex).toBe(0);
    expect(state.blinkClosedObserved).toBe(false);
  });

  it('fails when tracking changes or time expires', () => {
    let state = advanceChallenge(
      createChallengeState('right', 1_000),
      baseSignals,
      1_100,
    );
    state = advanceChallenge(state, { ...baseSignals, trackingId: 8 }, 1_200);
    expect(state.error).toBe('tracking-changed');

    const timedOut = advanceChallenge(
      createChallengeState('left', 1_000),
      baseSignals,
      1_000 + CHALLENGE_TIMEOUT_MS + 1,
    );
    expect(timedOut.error).toBe('timeout');
  });
});
